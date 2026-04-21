import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, SessionName } from '@prisma/client';

export async function POST(request: NextRequest) {
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const unitId = body.unitId ?? body.courseId;
  const { sessionName, durationMinutes, groupNo, subcomponent } = body;

  if (!unitId || !sessionName || !durationMinutes) {
    return NextResponse.json(
      { error: 'unitId (or courseId), sessionName, and durationMinutes are required' },
      { status: 400 }
    );
  }

  if (!Object.values(SessionName).includes(sessionName as SessionName)) {
    return NextResponse.json({ error: 'Invalid sessionName' }, { status: 400 });
  }

  const unitRegistration = await prisma.unitRegistration.findFirst({
    where: { unitId, userId, userStatus: 'LECTURER' },
  });

  if (!unitRegistration) {
    return NextResponse.json(
      { error: 'You are not registered as a lecturer for this unit' },
      { status: 404 }
    );
  }

  // Find all pre-created sessions for this slot from the Excel upload
  const candidates = await prisma.classSession.findMany({
    where: {
      unitRegistrationId: unitRegistration.id,
      sessionName: sessionName as SessionName,
      ...(groupNo ? { groupNo } : {}),
      ...(subcomponent ? { subcomponent } : {}),
    },
    orderBy: { sessionTime: 'asc' },
  });

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'No pre-created sessions found for this slot. Please upload the class timetable first.' },
      { status: 404 }
    );
  }

  // Pick the session whose scheduled date is closest to today
  const now = new Date();
  const closest = candidates.reduce((best, s) =>
    Math.abs((s.sessionTime?.getTime() ?? 0) - now.getTime()) <
    Math.abs((best.sessionTime?.getTime() ?? 0) - now.getTime())
      ? s
      : best
  );

  // Activate the session: set sessionTime to now and record the chosen duration
  const classSession = await prisma.classSession.update({
    where: { id: closest.id },
    data: {
      sessionTime: now,
      sessionDuration: durationMinutes,
    },
  });

  return NextResponse.json({ session: classSession }, { status: 200 });
}
