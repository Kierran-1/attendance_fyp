import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

function isSessionActive(s: { sessionTime: Date; sessionDuration: number }): boolean {
  const now = Date.now();
  const end = s.sessionTime.getTime() + s.sessionDuration * 60_000;
  return now >= s.sessionTime.getTime() && now <= end;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const lecturerRegistrations = await prisma.unitRegistration.findMany({
    where: { userId, userStatus: UserStatus.LECTURER },
    include: { unit: true },
  });

  if (lecturerRegistrations.length === 0) {
    return NextResponse.json({
      stats: {
        todaysClasses: 0,
        totalStudents: 0,
        totalCourses: 0,
        avgAttendancePct: null,
      },
      todaysCourses: [],
      activeSession: null,
      atRiskStudents: [],
      weeklyAttendance: [],
    });
  }

  const unitIds = lecturerRegistrations.map((r) => r.unitId);
  const regIds = lecturerRegistrations.map((r) => r.id);

  // Count students per unit
  const studentCounts = await prisma.unitRegistration.groupBy({
    by: ['unitId'],
    where: { unitId: { in: unitIds }, userStatus: UserStatus.STUDENT },
    _count: { id: true },
  });
  const studentCountMap = new Map(studentCounts.map((s) => [s.unitId, s._count.id]));
  const totalStudents = studentCounts.reduce((sum, s) => sum + s._count.id, 0);

  // Today's sessions
  const todaysSessions = await prisma.classSession.findMany({
    where: {
      unitRegistrationId: { in: regIds },
      sessionTime: { gte: todayStart, lt: todayEnd },
    },
    include: {
      unitRegistration: { include: { unit: true } },
    },
  });

  const todaysClasses = todaysSessions.length;

  // All sessions for lecturer's registrations
  const allSessions = await prisma.classSession.findMany({
    where: { unitRegistrationId: { in: regIds } },
    include: {
      unitRegistration: { select: { unitId: true } },
    },
  });

  // Find any currently active session
  const activeSession = allSessions.find(isSessionActive) ?? null;

  const todaysCourses = lecturerRegistrations.map((reg) => {
    const todaySession = todaysSessions.find(
      (s) => s.unitRegistration.unitId === reg.unitId
    ) ?? null;
    return {
      id: reg.unitId,
      code: reg.unit.code,
      name: reg.unit.name,
      enrollmentCount: studentCountMap.get(reg.unitId) ?? 0,
      todaySession: todaySession
        ? {
            id: todaySession.id,
            sessionName: todaySession.sessionName,
            sessionTime: todaySession.sessionTime,
          }
        : null,
    };
  });

  return NextResponse.json({
    stats: {
      todaysClasses,
      totalStudents,
      totalCourses: lecturerRegistrations.length,
      avgAttendancePct: null,
    },
    todaysCourses,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          sessionName: activeSession.sessionName,
          sessionTime: activeSession.sessionTime,
          sessionDuration: activeSession.sessionDuration,
          unitId: activeSession.unitRegistration.unitId,
        }
      : null,
    atRiskStudents: [],
    weeklyAttendance: [],
  });
}
