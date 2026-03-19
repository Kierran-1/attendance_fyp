import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyQRToken } from '@/lib/qr';
import { UserRole } from '@prisma/client';

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

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: {
      id: payload.sessionId,
      isActive: true,
    },
  });

  if (!attendanceSession) {
    return NextResponse.json({ error: 'Session not found or inactive' }, { status: 404 });
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      userId_sessionId: {
        userId: payload.userId,
        sessionId: payload.sessionId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'Already checked in' }, { status: 409 });
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      userId: payload.userId,
      sessionId: payload.sessionId,
      checkInTime: new Date(),
      recognitionMethod: 'QR_CODE',
      status: 'PRESENT',
    },
  });

  return NextResponse.json({ success: true, record }, { status: 201 });
}
