import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, SessionName } from '@prisma/client';

function getSessionStatus(s: { sessionTime: Date | null; sessionDuration: number | null }) {
  if (!s.sessionTime) return 'unscheduled';
  const start = s.sessionTime.getTime();
  const now = Date.now();
  if (start > now) return 'scheduled';
  const end = start + (s.sessionDuration ?? 0) * 60_000;
  if (now <= end) return 'active';
  return 'completed';
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const unitId = url.searchParams.get('unitId') ?? undefined;
  const statusFilter = url.searchParams.get('status') ?? undefined;

  const registrations = await prisma.unitRegistration.findMany({
    where: {
      userId: session.user.id,
      userStatus: 'LECTURER',
      ...(unitId ? { unitId } : {}),
    },
    select: { id: true, unitId: true, unit: { select: { id: true, code: true, name: true } } },
  });

  const regIds = registrations.map((r) => r.id);
  if (regIds.length === 0) return NextResponse.json({ sessions: [] });

  const classSessions = await prisma.classSession.findMany({
    where: { unitRegistrationId: { in: regIds } },
    orderBy: [{ scheduledDate: 'asc' }, { weekNumber: 'asc' }],
    include: {
      _count: { select: { attendanceRecords: true } },
      unitRegistration: {
        include: { unit: { select: { id: true, code: true, name: true } } },
      },
    },
  });

  const mapped = classSessions.map((s) => ({
    id: s.id,
    unitId: s.unitRegistration?.unit?.id ?? '',
    unitCode: s.unitRegistration?.unit?.code ?? '—',
    unitName: s.unitRegistration?.unit?.name ?? '—',
    sessionName: s.sessionName,
    weekNumber: s.weekNumber,
    day: s.day,
    scheduledDate: s.scheduledDate,
    sessionTime: s.sessionTime,
    sessionDuration: s.sessionDuration,
    location: s.location,
    groupNo: s.groupNo,
    subcomponent: s.subcomponent,
    status: getSessionStatus(s),
    attendanceCount: s._count.attendanceRecords,
  }));

  const filtered = statusFilter ? mapped.filter((s) => s.status === statusFilter) : mapped;
  return NextResponse.json({ sessions: filtered });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    let body: {
      unitId?: string;
      courseId?: string;
      sessionName?: string;
      durationMinutes?: number;
      groupNo?: string;
      subcomponent?: string;
      scheduledStartTime?: string;
      sessionId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { sessionName, durationMinutes, scheduledStartTime, sessionId, groupNo, subcomponent } = body;
    const unitId = body.unitId ?? body.courseId;

    if (!durationMinutes) {
      return NextResponse.json({ error: 'durationMinutes is required' }, { status: 400 });
    }

    let startTime: Date = new Date();
    if (scheduledStartTime) {
      const parsed = new Date(scheduledStartTime);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledStartTime' }, { status: 400 });
      }
      startTime = parsed;
    }

    // Direct activation by sessionId — skip candidate search
    if (sessionId) {
      const target = await prisma.classSession.findFirst({
        where: { id: sessionId, lecturerId: userId, sessionTime: null },
      });
      if (!target) {
        return NextResponse.json(
          { error: 'Session not found, already activated, or not owned by you' },
          { status: 404 }
        );
      }
      const classSession = await prisma.classSession.update({
        where: { id: sessionId },
        data: { sessionTime: startTime, sessionDuration: durationMinutes },
      });
      return NextResponse.json({ session: classSession }, { status: 200 });
    }

    if (!unitId || !sessionName) {
      return NextResponse.json(
        { error: 'unitId (or courseId) and sessionName are required when sessionId is not provided' },
        { status: 400 }
      );
    }

    if (!Object.values(SessionName).includes(sessionName as SessionName)) {
      return NextResponse.json({ error: 'Invalid sessionName' }, { status: 400 });
    }

    const unitRegistration = await prisma.unitRegistration.findFirst({
      where: { unitId, userId, userStatus: UserRole.LECTURER },
    });

    if (!unitRegistration) {
      return NextResponse.json(
        { error: 'You are not registered as a lecturer for this unit' },
        { status: 404 }
      );
    }

    const candidates = await prisma.classSession.findMany({
      where: {
        unitRegistrationId: unitRegistration.id,
        sessionName: sessionName as SessionName,
        sessionTime: null,
        ...(groupNo ? { groupNo } : {}),
        ...(subcomponent ? { subcomponent } : {}),
      },
      orderBy: { scheduledDate: 'asc' },
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No pre-created sessions found for this slot. Please upload the class timetable first.' },
        { status: 404 }
      );
    }

    const now = new Date();
    const closest = candidates.reduce((best, s) =>
      Math.abs((s.scheduledDate?.getTime() ?? 0) - now.getTime()) <
      Math.abs((best.scheduledDate?.getTime() ?? 0) - now.getTime())
        ? s
        : best
    );

    const classSession = await prisma.classSession.update({
      where: { id: closest.id },
      data: { sessionTime: startTime, sessionDuration: durationMinutes },
    });

    return NextResponse.json({ session: classSession }, { status: 200 });
  } catch (error) {
    console.error('Start session API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
