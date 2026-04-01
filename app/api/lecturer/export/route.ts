import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const profile = await prisma.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
  }

  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
  }

  const course = await prisma.unit.findFirst({
    where: { id: courseId, lecturerId: profile.id },
  });
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Fetch all enrollments with student profiles
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  });

  // Fetch all past sessions for this course (ordered by startTime)
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId, isActive: false },
    orderBy: { startTime: 'asc' },
    include: {
      attendanceRecords: { select: { userId: true, status: true } },
    },
  });

  // Build userId → attendance map per session
  type SessionAttendance = Record<string, Record<string, string>>;
  const attendanceMap: SessionAttendance = {};
  for (const s of sessions) {
    attendanceMap[s.id] = {};
    for (const r of s.attendanceRecords) {
      attendanceMap[s.id][r.userId] = r.status === 'PRESENT' || r.status === 'LATE' ? 'P' : 'A';
    }
  }

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const lecturerName = profile.user.name ?? 'Lecturer';
  const termString = `Term : ${course.year}_MAR_S1 - ${course.year} March Semester 1, Unit : ${course.code} - ${course.name}`;
  const classInfo = [
    course.sessionType ?? '',
    course.classGroup ?? '',
    course.scheduleDay ?? '',
    course.scheduleTime ?? '',
    course.venue ?? '',
    lecturerName,
  ]
    .filter(Boolean)
    .join(' , ');

  // --- Row 1: University header ---
  ws['A1'] = { v: 'SWINBURNE UNIVERSITY OF TECHNOLOGY SARAWAK CAMPUS' };
  ws['C1'] = {
    v: 'SWINBURNE UNIVERSITY OF TECHNOLOGY SARAWAK CAMPUS\n(owned by Swinburne Sarawak Sdn.Bhd,:497194-M)\nJALAN SIMPANG TIGA, KUCHING,SARAWAK,MALAYSIA, 93350.\nTel: 6082-41 5353  Fax: 6082-42 8353  Website: www.swinburne.edu.my',
  };

  // --- Row 3: Title ---
  ws['A3'] = { v: 'Attendance Lists' };

  // --- Row 4: Term + Unit ---
  ws['A4'] = { v: termString };

  // --- Row 5: Class info ---
  ws['A5'] = { v: classInfo };

  // --- Row 6: Column headers ---
  const fixedHeaders = [
    'Sl.No',
    'Student Number',
    '',  // B+C merged for student number
    'Student Name',
    'Program',
    'Registered Course',
    'Nationality',
    'School Status',
    '',  // H+I merged for school status
  ];

  const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9...
  ws['A6'] = { v: 'Sl.No' };
  ws['B6'] = { v: 'Student Number' };
  ws['D6'] = { v: 'Student Name' };
  ws['E6'] = { v: 'Program' };
  ws['F6'] = { v: 'Registered Course' };
  ws['G6'] = { v: 'Nationality' };
  ws['H6'] = { v: 'School Status' };

  // Session date columns start at J (index 9)
  const sessionColStart = 9; // J = index 9 (0-based)
  const getColLetter = (idx: number): string => {
    if (idx < 26) return colLetters[idx];
    return colLetters[Math.floor(idx / 26) - 1] + colLetters[idx % 26];
  };

  for (let si = 0; si < sessions.length; si++) {
    const colIdx = sessionColStart + si;
    const colLetter = getColLetter(colIdx);
    const s = sessions[si];
    const dateStr = s.startTime.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    ws[`${colLetter}6`] = { v: dateStr };
    ws[`${colLetter}7`] = { v: `${si + 10}L` }; // 10L, 11L, ...
  }

  // --- Row 7: Session type labels (already set above) ---

  // --- Data rows starting at row 8 ---
  for (let i = 0; i < enrollments.length; i++) {
    const row = 8 + i;
    const e = enrollments[i];
    const student = e.student;

    ws[`A${row}`] = { v: `${i + 1}L` };
    ws[`B${row}`] = { v: student.studentId };
    ws[`D${row}`] = { v: student.user.name ?? '' };
    ws[`E${row}`] = { v: student.major ?? '' };
    ws[`F${row}`] = { v: course.code };
    ws[`G${row}`] = { v: '' };
    ws[`H${row}`] = { v: 'Active' };

    for (let si = 0; si < sessions.length; si++) {
      const colIdx = sessionColStart + si;
      const colLetter = getColLetter(colIdx);
      const sessionId = sessions[si].id;
      const userId = student.userId;
      const mark = attendanceMap[sessionId]?.[userId] ?? 'A';
      ws[`${colLetter}${row}`] = { v: mark };
    }
  }

  // Set sheet range
  const lastRow = 7 + enrollments.length;
  const lastColIdx = sessionColStart + sessions.length - 1;
  const lastCol = getColLetter(Math.max(lastColIdx, 8));
  ws['!ref'] = `A1:${lastCol}${lastRow}`;

  // Merges: row 1 (A1:B1, C1:H1), row 3 (A3:I3), row 4 (A4:I4), row 5 (A5:I5), row 6-7 (A6:A7)
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },   // A1:B1
    { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },   // C1:H1
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },   // A3:I3
    { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },   // A4:I4
    { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },   // A5:I5
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },   // A6:A7 (Sl.No)
    { s: { r: 5, c: 1 }, e: { r: 6, c: 2 } },   // B6:C7 (Student Number)
    { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } },   // D6:D7
    { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } },   // E6:E7
    { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } },   // F6:F7
    { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } },   // G6:G7
    { s: { r: 5, c: 7 }, e: { r: 6, c: 8 } },   // H6:I7 (School Status)
  ];
  // Merge each session date column (pairs J6:K6, J7:K7 in original but we'll do single cols)
  ws['!merges'] = merges;

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // A - Sl.No
    { wch: 14 },  // B - Student Number
    { wch: 4 },   // C
    { wch: 28 },  // D - Student Name
    { wch: 40 },  // E - Program
    { wch: 14 },  // F - Registered Course
    { wch: 12 },  // G - Nationality
    { wch: 12 },  // H - School Status
    { wch: 4 },   // I
    ...sessions.map(() => ({ wch: 8 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `Attendance_${course.code}_${course.semester}${course.year}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
