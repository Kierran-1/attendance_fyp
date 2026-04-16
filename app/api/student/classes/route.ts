import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  isDatabaseUnavailableError,
  isStudentDbInCooldown,
  markStudentDbUnavailable,
} from '@/lib/student-compat';
import {
  AttendanceStatus,
  SessionName,
  UserRole,
  UserStatus,
} from '@prisma/client';

type StudentSessionStatus = 'Active' | 'Upcoming' | 'Completed';

type StudentSessionItem = {
  id: string;
  sessionName: string;
  sessionTime: string;
  day: string;
  time: string;
  location: string | null;
  venue: string | null;
  weekNumber: number | null;
  groupNo: string | null;
  subcomponent: string | null;
  lecturer: string | null;
  sessionDuration: number;
  sessionStatus: StudentSessionStatus;
  attendanceStatus: AttendanceStatus | 'ABSENT';
  verifiedAt: string | null;
};

function formatSessionName(value: SessionName | string | null | undefined) {
  if (!value) return 'Unknown';

  const upper = String(value).toUpperCase();

  if (upper === 'LECTURE' || upper === 'LE') return 'Lecture';
  if (upper === 'TUTORIAL' || upper === 'TU') return 'Tutorial';
  if (upper === 'LAB' || upper === 'LA') return 'Lab';

  return String(value);
}

function getDisplayDay(sessionTime: Date) {
  return new Intl.DateTimeFormat('en-MY', {
    weekday: 'long',
  }).format(sessionTime);
}

function getDisplayTime(sessionTime: Date) {
  return new Intl.DateTimeFormat('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(sessionTime);
}

function getSessionStatus(
  sessionTime: Date,
  durationMinutes: number
): StudentSessionStatus {
  const now = Date.now();
  const start = sessionTime.getTime();
  const end = start + durationMinutes * 60_000;

  if (now >= start && now <= end) return 'Active';
  if (now < start) return 'Upcoming';
  return 'Completed';
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isStudentDbInCooldown()) {
      return NextResponse.json({
        classes: [],
        warning: 'Database unavailable',
      });
    }

    const userId = session.user.id;

    const studentRegistrations = await prisma.unitRegistration.findMany({
      where: {
        userId,
        userStatus: UserStatus.STUDENT,
      },
      include: {
        unit: true,
      },
      orderBy: {
        unit: {
          code: 'asc',
        },
      },
    });

    if (studentRegistrations.length === 0) {
      return NextResponse.json({ classes: [] });
    }

    const unitIds = studentRegistrations.map((item) => item.unitId);

    const teachingRegistrations = await prisma.unitRegistration.findMany({
      where: {
        unitId: { in: unitIds },
        userStatus: {
          in: [UserStatus.LECTURER, UserStatus.TUTOR],
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        unit: true,
      },
    });

    const teachingRegistrationIds = teachingRegistrations.map((item) => item.id);

    const classSessions = await prisma.classSession.findMany({
      where: {
        unitRegistrationId: { in: teachingRegistrationIds },
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
      orderBy: [{ sessionTime: 'asc' }],
    });

    const sessionIds = classSessions.map((item) => item.id);

    const attendanceRecords =
      sessionIds.length > 0
        ? await prisma.classAttendanceRecord.findMany({
            where: {
              studentId: userId,
              classSessionId: { in: sessionIds },
            },
            select: {
              classSessionId: true,
              status: true,
              verifiedAt: true,
            },
          })
        : [];

    const attendanceMap = new Map(
      attendanceRecords.map((item) => [item.classSessionId, item])
    );

    const sessionsByUnit = new Map<string, StudentSessionItem[]>();

    for (const item of classSessions) {
      const unitId = item.unitRegistration.unitId;
      const attendance = attendanceMap.get(item.id);

      const mappedSession: StudentSessionItem = {
        id: item.id,
        sessionName: formatSessionName(item.sessionName),
        sessionTime: item.sessionTime.toISOString(),
        day: getDisplayDay(item.sessionTime),
        time: getDisplayTime(item.sessionTime),
        location: item.location ?? null,
        venue: item.location ?? null,
        weekNumber: item.weekNumber ?? null,
        groupNo: item.groupNo ?? null,
        subcomponent: item.subcomponent ?? null,
        lecturer:
          item.unitRegistration.user.name ??
          item.unitRegistration.user.email ??
          null,
        sessionDuration: item.sessionDuration,
        sessionStatus: getSessionStatus(
          item.sessionTime,
          item.sessionDuration
        ),
        attendanceStatus: attendance?.status ?? 'ABSENT',
        verifiedAt: attendance?.verifiedAt?.toISOString() ?? null,
      };

      if (!sessionsByUnit.has(unitId)) {
        sessionsByUnit.set(unitId, []);
      }

      sessionsByUnit.get(unitId)!.push(mappedSession);
    }

    const now = Date.now();

    const classes = studentRegistrations.map((registration) => {
      const unitSessions = sessionsByUnit.get(registration.unitId) ?? [];

      const completedSessions = unitSessions.filter(
        (item) => new Date(item.sessionTime).getTime() <= now
      );

      const attendedSessions = completedSessions.filter(
        (item) =>
          item.attendanceStatus !== 'ABSENT' &&
          item.attendanceStatus !== AttendanceStatus.PENDING
      );

      const attendanceRate =
        completedSessions.length > 0
          ? Math.round(
              (attendedSessions.length / completedSessions.length) * 100
            )
          : 0;

      const sessionTypes = Array.from(
        new Set(unitSessions.map((item) => item.sessionName))
      );

      const lecturers = Array.from(
        new Set(
          unitSessions
            .map((item) => item.lecturer)
            .filter((value): value is string => Boolean(value))
        )
      );

      const nextSession =
        unitSessions.find((item) => item.sessionStatus !== 'Completed') ??
        unitSessions[0] ??
        null;

      return {
        id: registration.unit.id,
        code: registration.unit.code,
        name: registration.unit.name,
        lecturer: lecturers.join(', ') || null,
        day: nextSession?.day ?? null,
        time: nextSession?.time ?? null,
        venue: nextSession?.venue ?? null,
        location: nextSession?.location ?? null,
        sessionType: nextSession?.sessionName ?? null,
        sessionTypes,
        attendanceRate,
        sessions: unitSessions,
      };
    });

    return NextResponse.json({ classes });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      markStudentDbUnavailable();
      console.warn(
        '[STUDENT_CLASSES_GET] Database unavailable, returning fallback classes'
      );
      return NextResponse.json({
        classes: [],
        warning: 'Database unavailable',
      });
    }

    console.error('[STUDENT_CLASSES_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}