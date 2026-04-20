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

function isSessionActive(s: { sessionTime: Date | null; sessionDuration: number | null }): boolean {
  if (!s.sessionTime || s.sessionDuration === null) return false;
  const now = Date.now();
  const start = s.sessionTime.getTime();
  const end = start + s.sessionDuration * 60_000;
  return now >= start && now <= end;
}

function mapSession(item: {
  id: string;
  unitId: string | null;
  sessionName: string;
  sessionTime: Date | null;
  sessionDuration: number | null;
  location: string | null;
  groupNo: string | null;
  unit: { code: string; name: string } | null;
  unitRegistration: {
    unitId: string;
    unit: { code: string; name: string };
    user: { name: string | null; email: string | null } | null;
  } | null;
}) {
  const resolvedUnitId = item.unitRegistration?.unitId ?? item.unitId ?? '';
  const resolvedUnit = item.unitRegistration?.unit ?? item.unit;
  const lecturer = item.unitRegistration?.user;

  return {
    id: item.id,
    unitId: resolvedUnitId,
    unit: {
      code: resolvedUnit?.code ?? '',
      name: resolvedUnit?.name ?? '',
      venue: item.location,
    },
    sessionName: item.sessionName,
    sessionTime: item.sessionTime,
    sessionDuration: item.sessionDuration,
    location: item.location,
    groupNo: item.groupNo,
    lecturer: lecturer?.name ?? lecturer?.email ?? null,
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
          unit: true,
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
          scheduledDate: 'asc',
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
      const classSessions = await prisma.classSession.findMany({
        where: { lecturerId: userId },
        include: {
          unit: true,
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
          scheduledDate: 'asc',
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