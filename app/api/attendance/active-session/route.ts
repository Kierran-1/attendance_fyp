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

  const userId = session.user.id;
  const role = session.user.role;

  if (role === UserRole.STUDENT) {
    const registrations = await prisma.unitRegistration.findMany({
      where: { userId, userStatus: UserStatus.STUDENT },
      select: { id: true },
    });

    if (registrations.length === 0) {
      return NextResponse.json({ session: null });
    }

    const regIds = registrations.map((r) => r.id);

    const classSessions = await prisma.classSession.findMany({
      where: { unitRegistrationId: { in: regIds } },
      include: {
        unitRegistration: {
          include: { unit: true },
        },
      },
    });

    const activeSession = classSessions.find(isSessionActive) ?? null;

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: activeSession.id,
        unitId: activeSession.unitRegistration.unitId,
        unit: activeSession.unitRegistration.unit,
        sessionName: activeSession.sessionName,
        sessionTime: activeSession.sessionTime,
        sessionDuration: activeSession.sessionDuration,
      },
    });
  }

  if (role === UserRole.LECTURER) {
    const classSessions = await prisma.classSession.findMany({
      where: { lecturerId: userId },
      include: {
        unitRegistration: {
          include: { unit: true },
        },
      },
    });

    const activeSessions = classSessions.filter(isSessionActive);

    return NextResponse.json({
      sessions: activeSessions.map((s) => ({
        id: s.id,
        unitId: s.unitRegistration.unitId,
        unit: s.unitRegistration.unit,
        sessionName: s.sessionName,
        sessionTime: s.sessionTime,
        sessionDuration: s.sessionDuration,
      })),
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
