import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
<<<<<<< HEAD
import {
  isDatabaseUnavailableError,
  isStudentDbInCooldown,
  markStudentDbUnavailable,
} from '@/lib/student-compat';
import { UserRole, UserStatus } from '@prisma/client';
=======
import { SessionName, UserRole, UserStatus } from '@prisma/client';

function formatSessionName(value: SessionName | string | null | undefined) {
  if (!value) return 'Unknown';

  const upper = String(value).toUpperCase();

  if (upper === 'LECTURE' || upper === 'LE') return 'Lecture';
  if (upper === 'TUTORIAL' || upper === 'TU') return 'Tutorial';
  if (upper === 'LAB' || upper === 'LA') return 'Lab';

  return String(value);
}
>>>>>>> 09cb0c9c7ab08b15a527a9c554f1b1b4e5b70292

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

<<<<<<< HEAD
    if (isStudentDbInCooldown()) {
      return NextResponse.json({
        records: [],
        courses: [],
        attendance: [],
        warning: 'Database unavailable',
      });
    }

    const userId = session.user.id;
    const now = new Date();
    const queryDate = req.nextUrl.searchParams.get('date');

    const studentRegistrations = await prisma.unitRegistration.findMany({
      where: { userId, userStatus: UserStatus.STUDENT },
      include: { unit: true },
    });

    if (studentRegistrations.length === 0) {
      return NextResponse.json({ records: [], courses: [], attendance: [] });
    }

    const unitIds = studentRegistrations.map((r) => r.unitId);

    // Find lecturer registrations for same units to get ClassSessions
    const lecturerRegistrations = await prisma.unitRegistration.findMany({
      where: { unitId: { in: unitIds }, userStatus: UserStatus.LECTURER },
      select: { id: true, unitId: true },
    });

    const lecturerRegIds = lecturerRegistrations.map((r) => r.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (queryDate === 'today') {
      const todaySessions = await prisma.classSession.findMany({
        where: {
          unitRegistrationId: { in: lecturerRegIds },
          sessionTime: { gte: todayStart, lte: todayEnd },
        },
        include: {
          unitRegistration: { select: { unitId: true } },
        },
        orderBy: { sessionTime: 'desc' },
      });

      const todaySessionIds = todaySessions.map((s) => s.id);

      const todayRecords = await prisma.classAttendanceRecord.findMany({
        where: { studentId: userId, classSessionId: { in: todaySessionIds } },
        select: { classSessionId: true, status: true, verifiedAt: true },
      });

      const recordMap = new Map(todayRecords.map((r) => [r.classSessionId, r]));

      const attendance = todaySessions.map((s) => {
        const record = recordMap.get(s.id);
        const unitReg = studentRegistrations.find(
          (r) => r.unitId === s.unitRegistration.unitId
        );
        return {
          id: s.id,
          code: unitReg?.unit.code ?? '—',
          session: s.sessionName,
          status: record?.status === 'ABSENT' ? 'Absent' : record ? 'Present' : 'Absent',
          recordedAt: record?.verifiedAt
            ? new Date(record.verifiedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null,
        };
      });

      return NextResponse.json({ attendance });
    }

    // All past sessions
    const sessions = await prisma.classSession.findMany({
      where: {
        unitRegistrationId: { in: lecturerRegIds },
        sessionTime: { lte: now },
=======
    const userId = session.user.id;
    const now = new Date();
    const queryDate = req.nextUrl.searchParams.get('date');

    const studentRegistrations = await prisma.unitRegistration.findMany({
      where: {
        userId,
        userStatus: UserStatus.STUDENT,
>>>>>>> 09cb0c9c7ab08b15a527a9c554f1b1b4e5b70292
      },
      include: {
        unit: true,
      },
<<<<<<< HEAD
      orderBy: { sessionTime: 'desc' },
      take: 200,
    });

    const sessionIds = sessions.map((s) => s.id);

    const attendanceRecords = await prisma.classAttendanceRecord.findMany({
      where: { studentId: userId, classSessionId: { in: sessionIds } },
      select: { classSessionId: true, status: true, verifiedAt: true },
    });

    const recordMap = new Map(attendanceRecords.map((r) => [r.classSessionId, r]));

=======
    });

    if (studentRegistrations.length === 0) {
      return NextResponse.json({ records: [], courses: [], attendance: [] });
    }

    const unitIds = studentRegistrations.map((r) => r.unitId);

    const lecturerRegistrations = await prisma.unitRegistration.findMany({
      where: {
        unitId: { in: unitIds },
        userStatus: {
          in: [UserStatus.LECTURER, UserStatus.TUTOR],
        },
      },
      select: {
        id: true,
        unitId: true,
      },
    });

    const lecturerRegIds = lecturerRegistrations.map((r) => r.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (queryDate === 'today') {
      const todaySessions = await prisma.classSession.findMany({
        where: {
          unitRegistrationId: { in: lecturerRegIds },
          sessionTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          unitRegistration: {
            select: {
              unitId: true,
            },
          },
        },
        orderBy: {
          sessionTime: 'desc',
        },
      });

      const todaySessionIds = todaySessions.map((s) => s.id);

      const todayRecords = await prisma.classAttendanceRecord.findMany({
        where: {
          studentId: userId,
          classSessionId: { in: todaySessionIds },
        },
        select: {
          classSessionId: true,
          status: true,
          verifiedAt: true,
        },
      });

      const recordMap = new Map(todayRecords.map((r) => [r.classSessionId, r]));

      const attendance = todaySessions.map((s) => {
        const record = recordMap.get(s.id);
        const unitReg = studentRegistrations.find(
          (r) => r.unitId === s.unitRegistration.unitId
        );

        return {
          id: s.id,
          code: unitReg?.unit.code ?? '—',
          session: formatSessionName(s.sessionName),
          status:
            record?.status === 'ABSENT'
              ? 'Absent'
              : record
              ? 'Present'
              : 'Absent',
          recordedAt: record?.verifiedAt
            ? new Date(record.verifiedAt).toLocaleTimeString('en-MY', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null,
        };
      });

      return NextResponse.json({ attendance });
    }

    const sessions = await prisma.classSession.findMany({
      where: {
        unitRegistrationId: { in: lecturerRegIds },
        sessionTime: { lte: now },
      },
      include: {
        unitRegistration: {
          select: {
            unitId: true,
          },
        },
      },
      orderBy: {
        sessionTime: 'desc',
      },
      take: 300,
    });

    const sessionIds = sessions.map((s) => s.id);

    const attendanceRecords = await prisma.classAttendanceRecord.findMany({
      where: {
        studentId: userId,
        classSessionId: { in: sessionIds },
      },
      select: {
        classSessionId: true,
        status: true,
        verifiedAt: true,
      },
    });

    const recordMap = new Map(attendanceRecords.map((r) => [r.classSessionId, r]));

>>>>>>> 09cb0c9c7ab08b15a527a9c554f1b1b4e5b70292
    const records = sessions.map((s) => {
      const record = recordMap.get(s.id);
      const unitReg = studentRegistrations.find(
        (r) => r.unitId === s.unitRegistration.unitId
      );

      return {
        sessionId: s.id,
<<<<<<< HEAD
        date: s.sessionTime,
        unitId: s.unitRegistration.unitId,
        courseCode: unitReg?.unit.code ?? '—',
        courseName: unitReg?.unit.name ?? '—',
        sessionName: s.sessionName,
        sessionTime: s.sessionTime,
        checkInTime: record?.verifiedAt ?? null,
        status: record?.status ?? 'ABSENT',
      };
    });

    // Per-course summary
    const courseSummaries: Record<
      string,
      { id: string; code: string; name: string; total: number; attended: number }
    > = {};

    for (const r of records) {
      if (!courseSummaries[r.unitId]) {
        const unitReg = studentRegistrations.find((reg) => reg.unitId === r.unitId);
        courseSummaries[r.unitId] = {
          id: r.unitId,
          code: r.courseCode,
          name: r.courseName,
          total: 0,
          attended: 0,
        };
      }
      courseSummaries[r.unitId].total += 1;
      if (r.status !== 'ABSENT') {
        courseSummaries[r.unitId].attended += 1;
      }
    }

    const attendance = records
      .filter((r) => {
        const d = new Date(r.date);
        return d >= todayStart && d <= todayEnd;
      })
      .map((r) => ({
        id: r.sessionId,
        code: r.courseCode,
        session: r.sessionName,
        status: r.status === 'ABSENT' ? 'Absent' : 'Present',
        recordedAt: r.checkInTime
          ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null,
      }));

    return NextResponse.json({
      records,
      courses: Object.values(courseSummaries),
      attendance,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      markStudentDbUnavailable();
      console.warn('[STUDENT_ATTENDANCE_GET] Database unavailable, returning fallback attendance');
      return NextResponse.json({
        records: [],
        courses: [],
        attendance: [],
        warning: 'Database unavailable',
      });
    }

    console.error('[STUDENT_ATTENDANCE_GET]', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
=======
        date: s.sessionTime.toISOString(),
        unitId: s.unitRegistration.unitId,
        courseCode: unitReg?.unit.code ?? '—',
        courseName: unitReg?.unit.name ?? '—',
        sessionName: formatSessionName(s.sessionName),
        sessionTime: s.sessionTime.toISOString(),
        checkInTime: record?.verifiedAt?.toISOString() ?? null,
        status: record?.status ?? 'ABSENT',
      };
    });

    const courseSummaries: Record<
      string,
      { id: string; code: string; name: string; total: number; attended: number }
    > = {};

    for (const r of records) {
      if (!courseSummaries[r.unitId]) {
        courseSummaries[r.unitId] = {
          id: r.unitId,
          code: r.courseCode,
          name: r.courseName,
          total: 0,
          attended: 0,
        };
      }

      courseSummaries[r.unitId].total += 1;

      if (r.status !== 'ABSENT') {
        courseSummaries[r.unitId].attended += 1;
      }
    }

    const attendance = records
      .filter((r) => {
        const d = new Date(r.date);
        return d >= todayStart && d <= todayEnd;
      })
      .map((r) => ({
        id: r.sessionId,
        code: r.courseCode,
        session: r.sessionName,
        status: r.status === 'ABSENT' ? 'Absent' : 'Present',
        recordedAt: r.checkInTime
          ? new Date(r.checkInTime).toLocaleTimeString('en-MY', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : null,
      }));

    return NextResponse.json({
      records,
      courses: Object.values(courseSummaries),
      attendance,
    });
  } catch (error) {
    console.error('[STUDENT_ATTENDANCE_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
>>>>>>> 09cb0c9c7ab08b15a527a9c554f1b1b4e5b70292
