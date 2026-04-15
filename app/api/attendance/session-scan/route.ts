import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, AttendanceStatus } from '@prisma/client';
import { verifySessionQRToken } from '@/lib/qr';

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

  if (session.user.role !== UserRole.STUDENT) {
    return NextResponse.json({ error: 'Only students can use this endpoint' }, { status: 403 });
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

  let payload;
  try {
    payload = verifySessionQRToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 400 });
  }

  const classSession = await prisma.classSession.findUnique({
    where: { id: payload.sessionId },
    include: {
      unitRegistration: {
        include: { unit: true },
      },
    },
  });

  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (!isSessionActive(classSession)) {
    return NextResponse.json({ error: 'Session is no longer active' }, { status: 400 });
  }

  // Verify student is enrolled in the unit
  const unitId = classSession.unitRegistration.unitId;
  const enrollment = await prisma.unitRegistration.findFirst({
    where: {
      userId: session.user.id,
      unitId,
      userStatus: UserStatus.STUDENT,
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: 'You are not enrolled in this unit' }, { status: 403 });
  }

  // Prevent duplicate attendance
  const existing = await prisma.classAttendanceRecord.findUnique({
    where: {
      classSessionId_studentId: {
        classSessionId: classSession.id,
        studentId: session.user.id,
      },
    },
  });

  if (existing?.status === AttendanceStatus.PRESENT) {
    return NextResponse.json(
      { error: 'You have already marked attendance for this session' },
      { status: 409 }
    );
  }

  const now = new Date();

  // Audit trail
  await prisma.classAttendanceData.create({
    data: {
      classSessionId: classSession.id,
      studentId: session.user.id,
      scanPayload: { token, timestamp: now.toISOString(), method: 'SESSION_QR' },
      scanMethod: 'SESSION_QR',
      verificationStage: 'SESSION_QR',
    },
  });

  // Mark attendance as PRESENT
  const record = await prisma.classAttendanceRecord.upsert({
    where: {
      classSessionId_studentId: {
        classSessionId: classSession.id,
        studentId: session.user.id,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      verifiedAt: now,
    },
    create: {
      classSessionId: classSession.id,
      studentId: session.user.id,
      status: AttendanceStatus.PRESENT,
      verifiedAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Attendance marked — you are present!',
    sessionId: classSession.id,
    unitCode: classSession.unitRegistration.unit.code,
    unitName: classSession.unitRegistration.unit.name,
    record,
  });
}
