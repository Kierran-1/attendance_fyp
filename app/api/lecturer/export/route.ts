import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

function formatDate(value: Date) {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'ABSENT';
  if (status === 'LATE') return 'PRESENT';
  return status;
}

function buildTermCode(year: number | string | null | undefined, semester: string | number | null | undefined) {
  const yearText = String(year ?? '').trim() || new Date().getFullYear().toString();
  const semesterText = String(semester ?? '').trim();

  if (!semesterText) {
    return `${yearText}_MAR_S1`;
  }

  // If semester is already a formatted term string, keep it.
  if (semesterText.includes('_')) {
    return semesterText;
  }

  // If semester is a plain number like 1 / 2, format it safely.
  if (/^\d+$/.test(semesterText)) {
    return `${yearText}_MAR_S${semesterText}`;
  }

  // Fallback: keep it clean rather than duplicating weird text.
  return `${yearText}_${semesterText.replace(/\s+/g, '_')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;
    const unitId = request.nextUrl.searchParams.get('courseId');
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    // Per-session export
    if (sessionId) {
      const classSession = await prisma.classSession.findFirst({
        where: { id: sessionId, lecturerId: userId },
        include: {
          unitRegistration: { include: { unit: true } },
          attendanceRecords: {
            select: { studentId: true, status: true },
          },
        },
      });

      if (!classSession) {
        return NextResponse.json({ error: 'Session not found or not owned by you' }, { status: 404 });
      }

      const unit = classSession.unitRegistration?.unit;
      const termCode = buildTermCode(
        classSession.unitRegistration?.year,
        classSession.unitRegistration?.semester
      );

      // Fetch student details for all studentIds in the records
      const studentIds = classSession.attendanceRecords.map(r => r.studentId);
      const students = await prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, email: true, programName: true },
      });
      const studentMap = new Map(students.map(s => [s.id, s]));

      // If no records, fall back to all enrolled students as ABSENT
      const enrolledStudents = classSession.attendanceRecords.length === 0
        ? await prisma.unitRegistration.findMany({
            where: { unitId: classSession.unitRegistration?.unitId, userStatus: UserStatus.STUDENT },
            include: { user: { select: { id: true, name: true, email: true, programName: true } } },
          })
        : [];

      const rows: (string | number)[][] = [
        ['CourseCode', 'TermCode', 'Subcomponent', 'Group', 'Date', 'ProgramName', 'StudentName', 'StudentNumber', 'Status', 'Remarks'],
      ];

      if (classSession.attendanceRecords.length > 0) {
        for (const record of classSession.attendanceRecords) {
          const student = studentMap.get(record.studentId);
          const studentNumber = student?.email?.split('@')[0] ?? record.studentId;
          rows.push([
            unit?.code ?? '',
            termCode,
            classSession.subcomponent ?? classSession.sessionName ?? '',
            classSession.groupNo ?? '',
            formatDate(classSession.sessionTime),
            student?.programName ?? '',
            student?.name ?? '',
            studentNumber,
            formatStatus(record.status),
            '',
          ]);
        }
      } else {
        for (const reg of enrolledStudents) {
          rows.push([
            unit?.code ?? '',
            termCode,
            classSession.subcomponent ?? classSession.sessionName ?? '',
            classSession.groupNo ?? '',
            formatDate(classSession.sessionTime),
            reg.user.programName ?? '',
            reg.user.name ?? '',
            reg.user.email?.split('@')[0] ?? '',
            'ABSENT',
            '',
          ]);
        }
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 10 },
        { wch: 14 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const dateStr = classSession.sessionTime.toISOString().split('T')[0];
      const filename = `Attendance_${unit?.code}_${classSession.subcomponent ?? classSession.sessionName}_${dateStr}.xlsx`;

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (!unitId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const lecturerReg = await prisma.unitRegistration.findFirst({
      where: {
        unitId,
        userId,
        userStatus: {
          in: [UserStatus.LECTURER, UserStatus.TUTOR],
        },
      },
      include: {
        unit: true,
      },
    });

    if (!lecturerReg) {
      return NextResponse.json(
        { error: 'Unit not found or not assigned to you' },
        { status: 404 }
      );
    }

    const unit = lecturerReg.unit;

    const studentRegistrationsRaw = await prisma.unitRegistration.findMany({
      where: {
        unitId,
        userStatus: UserStatus.STUDENT,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            programName: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    // Remove duplicate students for the same unit.
    const seenStudentIds = new Set<string>();
    const studentRegistrations = studentRegistrationsRaw.filter((registration) => {
      const studentId = registration.user.id;

      if (seenStudentIds.has(studentId)) {
        return false;
      }

      seenStudentIds.add(studentId);
      return true;
    });

    const classSessions = await prisma.classSession.findMany({
      where: {
        unitRegistrationId: lecturerReg.id,
      },
      orderBy: {
        sessionTime: 'asc',
      },
    });

    if (classSessions.length === 0) {
      return NextResponse.json(
        { error: 'No class sessions found for this unit' },
        { status: 404 }
      );
    }

    const sessionIds = classSessions.map((s) => s.id);

    const attendanceRecords = await prisma.classAttendanceRecord.findMany({
      where: {
        classSessionId: { in: sessionIds },
      },
      select: {
        classSessionId: true,
        studentId: true,
        status: true,
      },
    });

    const attendanceMap = new Map<string, string>();
    for (const record of attendanceRecords) {
      attendanceMap.set(
        `${record.classSessionId}::${record.studentId}`,
        formatStatus(record.status)
      );
    }

    const termCode = buildTermCode(lecturerReg.year, lecturerReg.semester);

    const rows: (string | number)[][] = [
      [
        'CourseCode',
        'TermCode',
        'Subcomponent',
        'Group',
        'Date',
        'ProgramName',
        'StudentName',
        'StudentNumber',
        'Status',
        'Remarks',
      ],
    ];

    for (const classSession of classSessions) {
      for (const registration of studentRegistrations) {
        const student = registration.user;
        const studentNumber = student.email?.split('@')[0] ?? student.id;
        const attendanceKey = `${classSession.id}::${student.id}`;
        const status = attendanceMap.get(attendanceKey) ?? 'ABSENT';

        rows.push([
          unit.code ?? '',
          termCode,
          classSession.subcomponent ?? classSession.sessionName ?? '',
          classSession.groupNo ?? '',
          formatDate(classSession.sessionTime),
          student.programName ?? '',
          student.name ?? '',
          studentNumber,
          status,
          '',
        ]);
      }
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 14 }, // CourseCode
      { wch: 16 }, // TermCode
      { wch: 18 }, // Subcomponent
      { wch: 10 }, // Group
      { wch: 14 }, // Date
      { wch: 28 }, // ProgramName
      { wch: 28 }, // StudentName
      { wch: 18 }, // StudentNumber
      { wch: 12 }, // Status
      { wch: 18 }, // Remarks
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const filename = `Attendance_${unit.code}_${termCode}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[LECTURER_EXPORT_GET]', error);
    return NextResponse.json(
      { error: 'Failed to export attendance report' },
      { status: 500 }
    );
  }
}