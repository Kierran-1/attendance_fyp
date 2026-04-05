import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.STUDENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;
  const now = new Date();

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, programName: true },
  });

  const studentId = dbUser?.email?.split('@')[0] ?? '';

  const studentRegistrations = await prisma.unitRegistration.findMany({
    where: { userId, userStatus: UserStatus.STUDENT },
    include: { unit: true },
  });

  if (studentRegistrations.length === 0) {
    return NextResponse.json({
      profile: { studentId, programName: dbUser?.programName ?? null },
      courses: [],
      recentAttendance: [],
      stats: { overallPct: null, enrolledCourses: 0, totalAbsent: 0 },
    });
  }

  const unitIds = studentRegistrations.map((r) => r.unitId);

  // Find lecturer registrations for same units
  const lecturerRegistrations = await prisma.unitRegistration.findMany({
    where: { unitId: { in: unitIds }, userStatus: UserStatus.LECTURER },
    select: { id: true, unitId: true },
  });

  const lecturerRegIds = lecturerRegistrations.map((r) => r.id);

  // Get all class sessions
  const allSessions = await prisma.classSession.findMany({
    where: {
      unitRegistrationId: { in: lecturerRegIds },
      sessionTime: { lte: now },
    },
    include: {
      unitRegistration: { select: { unitId: true } },
    },
    orderBy: { sessionTime: 'desc' },
  });

  const allSessionIds = allSessions.map((s) => s.id);

  // Get attendance records for this student
  const attendanceRecords = await prisma.classAttendanceRecord.findMany({
    where: {
      studentId: userId,
      classSessionId: { in: allSessionIds },
    },
    select: { classSessionId: true, status: true, verifiedAt: true },
  });

  const recordMap = new Map(attendanceRecords.map((r) => [r.classSessionId, r]));

  // Per-unit totals
  const sessionsByUnit = new Map<string, string[]>();
  for (const s of allSessions) {
    const uid = s.unitRegistration.unitId;
    if (!sessionsByUnit.has(uid)) sessionsByUnit.set(uid, []);
    sessionsByUnit.get(uid)!.push(s.id);
  }

  const attendedByUnit = new Map<string, number>();
  for (const r of attendanceRecords) {
    const sess = allSessions.find((s) => s.id === r.classSessionId);
    if (!sess) continue;
    const uid = sess.unitRegistration.unitId;
    if (r.status !== 'ABSENT') {
      attendedByUnit.set(uid, (attendedByUnit.get(uid) ?? 0) + 1);
    }
  }

  const courses = studentRegistrations.map((reg) => {
    const totalSessions = sessionsByUnit.get(reg.unitId)?.length ?? 0;
    const attendedSessions = attendedByUnit.get(reg.unitId) ?? 0;
    return {
      id: reg.unit.id,
      code: reg.unit.code,
      name: reg.unit.name,
      semester: reg.semester,
      year: reg.year,
      totalSessions,
      attendedSessions,
    };
  });

  const totalSessions = courses.reduce((sum, c) => sum + c.totalSessions, 0);
  const totalAttended = courses.reduce((sum, c) => sum + c.attendedSessions, 0);
  const overallPct = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : null;
  const totalAbsent = totalSessions - totalAttended;

  // Recent attendance (last 5 sessions)
  const recentSessions = allSessions.slice(0, 5);
  const recentAttendance = recentSessions.map((s) => {
    const record = recordMap.get(s.id);
    const unitReg = studentRegistrations.find((r) => r.unitId === s.unitRegistration.unitId);
    return {
      sessionId: s.id,
      date: s.sessionTime,
      courseCode: unitReg?.unit.code ?? '—',
      courseName: unitReg?.unit.name ?? '—',
      sessionName: s.sessionName,
      checkInTime: record?.verifiedAt ?? null,
      status: record?.status ?? 'ABSENT',
    };
  });

  return NextResponse.json({
    profile: { studentId, programName: dbUser?.programName ?? null },
    courses,
    recentAttendance,
    stats: { overallPct, enrolledCourses: courses.length, totalAbsent },
  });
}
