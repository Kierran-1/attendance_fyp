import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;

  const unitId = request.nextUrl.searchParams.get('courseId');
  if (!unitId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
  }

  // Verify lecturer has a registration for this unit
  const lecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId, userId, userStatus: UserStatus.LECTURER },
    include: { unit: true },
  });

  if (!lecturerReg) {
    return NextResponse.json({ error: 'Unit not found or not assigned to you' }, { status: 404 });
  }

  const unit = lecturerReg.unit;

  // Get all student registrations for this unit
  const studentRegistrations = await prisma.unitRegistration.findMany({
    where: { unitId, userStatus: UserStatus.STUDENT },
    include: {
      user: { select: { id: true, name: true, email: true, programName: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  // Get all ClassSessions for the lecturer's registration
  const classSessions = await prisma.classSession.findMany({
    where: { unitRegistrationId: lecturerReg.id },
    orderBy: { sessionTime: 'asc' },
  });

  // Get all attendance records for those sessions
  const sessionIds = classSessions.map((s) => s.id);
  const attendanceRecords = await prisma.classAttendanceRecord.findMany({
    where: { classSessionId: { in: sessionIds } },
    select: { classSessionId: true, studentId: true, status: true },
  });

  // Build attendance map: sessionId -> studentUserId -> mark
  const attendanceMap: Record<string, Record<string, string>> = {};
  for (const r of attendanceRecords) {
    if (!attendanceMap[r.classSessionId]) attendanceMap[r.classSessionId] = {};
    attendanceMap[r.classSessionId][r.studentId] =
      r.status === 'PRESENT' || r.status === 'LATE' ? 'P' : 'A';
  }

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const lecturerUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const lecturerName = lecturerUser?.name ?? 'Lecturer';

  const termString = `Term : ${lecturerReg.year}_MAR_S1 - ${lecturerReg.year} March Semester ${lecturerReg.semester}, Unit : ${unit.code} - ${unit.name}`;
  const classInfo = [lecturerName].filter(Boolean).join(' , ');

  ws['A1'] = { v: 'SWINBURNE UNIVERSITY OF TECHNOLOGY SARAWAK CAMPUS' };
  ws['C1'] = {
    v: 'SWINBURNE UNIVERSITY OF TECHNOLOGY SARAWAK CAMPUS\n(owned by Swinburne Sarawak Sdn.Bhd,:497194-M)\nJALAN SIMPANG TIGA, KUCHING,SARAWAK,MALAYSIA, 93350.\nTel: 6082-41 5353  Fax: 6082-42 8353  Website: www.swinburne.edu.my',
  };
  ws['A3'] = { v: 'Attendance Lists' };
  ws['A4'] = { v: termString };
  ws['A5'] = { v: classInfo };

  ws['A6'] = { v: 'Sl.No' };
  ws['B6'] = { v: 'Student Number' };
  ws['D6'] = { v: 'Student Name' };
  ws['E6'] = { v: 'Program' };
  ws['F6'] = { v: 'Registered Course' };
  ws['G6'] = { v: 'Nationality' };
  ws['H6'] = { v: 'School Status' };

  const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const sessionColStart = 9;
  const getColLetter = (idx: number): string => {
    if (idx < 26) return colLetters[idx];
    return colLetters[Math.floor(idx / 26) - 1] + colLetters[idx % 26];
  };

  for (let si = 0; si < classSessions.length; si++) {
    const colIdx = sessionColStart + si;
    const colLetter = getColLetter(colIdx);
    const s = classSessions[si];
    const dateStr = s.sessionTime.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    ws[`${colLetter}6`] = { v: dateStr };
    ws[`${colLetter}7`] = { v: `${si + 10}L` };
  }

  for (let i = 0; i < studentRegistrations.length; i++) {
    const row = 8 + i;
    const reg = studentRegistrations[i];
    const user = reg.user;
    const studentNumber = user.email?.split('@')[0] ?? '';

    ws[`A${row}`] = { v: `${i + 1}L` };
    ws[`B${row}`] = { v: studentNumber };
    ws[`D${row}`] = { v: user.name ?? '' };
    ws[`E${row}`] = { v: user.programName ?? '' };
    ws[`F${row}`] = { v: unit.code };
    ws[`G${row}`] = { v: '' };
    ws[`H${row}`] = { v: 'Active' };

    for (let si = 0; si < classSessions.length; si++) {
      const colIdx = sessionColStart + si;
      const colLetter = getColLetter(colIdx);
      const sessionId = classSessions[si].id;
      const mark = attendanceMap[sessionId]?.[user.id] ?? 'A';
      ws[`${colLetter}${row}`] = { v: mark };
    }
  }

  const lastRow = 7 + studentRegistrations.length;
  const lastColIdx = sessionColStart + classSessions.length - 1;
  const lastCol = getColLetter(Math.max(lastColIdx, 8));
  ws['!ref'] = `A1:${lastCol}${lastRow}`;

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 6, c: 2 } },
    { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } },
    { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } },
    { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } },
    { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } },
    { s: { r: 5, c: 7 }, e: { r: 6, c: 8 } },
  ];
  ws['!merges'] = merges;

  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 4 },
    { wch: 28 },
    { wch: 40 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 4 },
    ...classSessions.map(() => ({ wch: 8 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `Attendance_${unit.code}_${lecturerReg.semester}${lecturerReg.year}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
