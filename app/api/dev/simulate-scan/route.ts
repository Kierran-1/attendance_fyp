import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';

// DEV ONLY — creates ClassAttendanceData + ClassAttendanceRecord for the current user.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const now = new Date();

  await prisma.classAttendanceData.create({
    data: {
      classSessionId: sessionId,
      scanPayload: { simulatedBy: userId, timestamp: now.toISOString() },
      scanMethod: 'DEV_SIMULATE',
      verificationStage: 'VERIFIED',
    },
  });

  const record = await prisma.classAttendanceRecord.upsert({
    where: {
      classSessionId_studentId: {
        classSessionId: sessionId,
        studentId: userId,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      verifiedAt: now,
    },
    create: {
      classSessionId: sessionId,
      studentId: userId,
      status: AttendanceStatus.PRESENT,
      verifiedAt: now,
    },
  });

  return NextResponse.json({ success: true, record }, { status: 200 });
}
