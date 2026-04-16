import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

function isSessionActive(s: { sessionTime: Date; sessionDuration: number }): boolean {
  const now = Date.now();
  const start = s.sessionTime.getTime();
  const end = start + s.sessionDuration * 60_000;

  return now >= start && now <= end;
}

function mapSession(item: {
  id: string;
  sessionName: string;
  sessionTime: Date;
  sessionDuration: number;
  location: string | null;
  weekNumber: number | null;
  groupNo: string | null;
  unitRegistration: {
    unitId: string;
    unit: {
      code: string;
      name: string;
    };
    user: {
      name: string | null;
      email: string | null;
    } | null;
  };
}) {
  return {
    id: item.id,
    unitId: item.unitRegistration.unitId,
    unit: {
      code: item.unitRegistration.unit.code,
      name: item.unitRegistration.unit.name,
      venue: item.location,
    },
    sessionName: item.sessionName,
    sessionTime: item.sessionTime,
    sessionDuration: item.sessionDuration,
    location: item.location,
    weekNumber: item.weekNumber,
    groupNo: item.groupNo,
    lecturer:
      item.unitRegistration.user?.name ??
      item.unitRegistration.user?.email ??
      null,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;

  if (role === UserRole.STUDENT) {
    // Get the unit IDs the student is enrolled in         
    const registrations = await prisma.unitRegistration.findMany({
      where: {
        userId,
        userStatus: UserStatus.STUDENT,
      },
      select: {
        unitId: true,
      },
    });

    if (registrations.length === 0) {
      return NextResponse.json({ session: null });
    }

    const unitIds = registrations.map((r) => r.unitId);

    // Find active sessions for any lecturer registration in those units
    const classSessions = await prisma.classSession.findMany({
      where: {
        unitRegistration: {
          unitId: { in: unitIds },
          userStatus: {
            in: [UserStatus.LECTURER, UserStatus.TUTOR],
          },
        },
      },
      include: {
        unitRegistration: {
          include: {
            unit: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        sessionTime: 'asc',
      },
    });

    const activeSessions = classSessions.filter(isSessionActive);

    if (activeSessions.length === 0) {
      return NextResponse.json({ session: null });
    }

    // Pick the earliest currently active session so the student view stays stable
    const selectedSession = activeSessions[0];

    return NextResponse.json({
      session: mapSession(selectedSession),
    });
  }

  if (role === UserRole.LECTURER) {
    const classSessions = await prisma.classSession.findMany({
      where: {
        lecturerId: userId,
      },
      include: {
        unitRegistration: {
          include: {
            unit: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        sessionTime: 'asc',
      },
    });

    const activeSessions = classSessions.filter(isSessionActive);

    return NextResponse.json({
      sessions: activeSessions.map(mapSession),
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}