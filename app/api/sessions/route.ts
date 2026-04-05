import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, SessionName } from '@prisma/client';

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
    weekNumber?: number;
    groupNo?: string;
    subcomponent?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Accept legacy courseId as alias for unitId
  const unitId = body.unitId ?? body.courseId;
  const { sessionName, durationMinutes, weekNumber, groupNo, subcomponent } = body;

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
    where: { unitId, userId, userStatus: UserStatus.LECTURER },
  });

  if (!unitRegistration) {
    return NextResponse.json(
      { error: 'Unit not found or not assigned to you' },
      { status: 404 }
    );
  }

  const now = new Date();

  const classSession = await prisma.classSession.create({
    data: {
      unitRegistrationId: unitRegistration.id,
      lecturerId: userId,
      sessionName: sessionName as SessionName,
      sessionTime: now,
      sessionDuration: durationMinutes,
      weekNumber: weekNumber ?? null,
      groupNo: groupNo ?? null,
      subcomponent: subcomponent ?? null,
    },
  });

  return NextResponse.json({ session: classSession }, { status: 201 });
}
