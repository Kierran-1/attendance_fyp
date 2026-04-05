import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, AttendanceStatus } from '@prisma/client';
import { verifyQRToken } from '@/lib/qr';

function isSessionActive(s: { sessionTime: Date; sessionDuration: number }): boolean {
  const now = Date.now();
  const end = s.sessionTime.getTime() + s.sessionDuration * 60_000;
  return now >= s.sessionTime.getTime() && now <= end;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  let payload: ReturnType<typeof verifyQRToken>;
  try {
    payload = verifyQRToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 400 });
  }

  const classSession = await prisma.classSession.findUnique({
    where: { id: payload.sessionId },
  });

  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (!isSessionActive(classSession)) {
    return NextResponse.json({ error: 'Session is not currently active' }, { status: 400 });
  }

  const now = new Date();

  await prisma.classAttendanceData.create({
    data: {
      classSessionId: classSession.id,
      scanPayload: { token, timestamp: now.toISOString() },
      scanMethod: 'QR',
      verificationStage: 'VERIFIED',
    },
  });

  const record = await prisma.classAttendanceRecord.upsert({
    where: {
      classSessionId_studentId: {
        classSessionId: classSession.id,
        studentId: payload.userId,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      verifiedAt: now,
    },
    create: {
      classSessionId: classSession.id,
      studentId: payload.userId,
      status: AttendanceStatus.PRESENT,
      verifiedAt: now,
    },
  });

  return NextResponse.json({ success: true, record }, { status: 200 });
}
