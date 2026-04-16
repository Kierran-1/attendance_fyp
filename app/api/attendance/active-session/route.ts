import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  isDatabaseUnavailableError,
  isStudentDbInCooldown,
  markStudentDbUnavailable,
} from '@/lib/student-compat';
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
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;

    if (role === UserRole.STUDENT) {
      if (isStudentDbInCooldown()) {
        return NextResponse.json({ session: null, warning: 'Database unavailable' });
      }

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

      const unitIds = registrations.map((registration) => registration.unitId);

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

      const selectedSession = activeSessions[0];

      return NextResponse.json({
        session: mapSession(selectedSession),
      });
    }

    if (role === UserRole.LECTURER) {
      const lecturerRegistrations = await prisma.unitRegistration.findMany({
        where: {
          userId,
          userStatus: {
            in: [UserStatus.LECTURER, UserStatus.TUTOR],
          },
        },
        select: {
          id: true,
        },
      });

      const registrationIds = lecturerRegistrations.map((registration) => registration.id);

      if (registrationIds.length === 0) {
        return NextResponse.json({ sessions: [] });
      }

      const classSessions = await prisma.classSession.findMany({
        where: {
          unitRegistrationId: {
            in: registrationIds,
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

      return NextResponse.json({
        sessions: activeSessions.map(mapSession),
      });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      markStudentDbUnavailable();
      return NextResponse.json({
        session: null,
        warning: 'Database unavailable',
      });
    }

    console.error('[ACTIVE_SESSION_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}