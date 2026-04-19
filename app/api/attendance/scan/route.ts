import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, AttendanceStatus } from '@prisma/client';
import {
  detectTokenType,
  verifyQRToken,
  verifyChallengeToken,
  signChallengeToken,
} from '@/lib/qr';

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

  const tokenType = detectTokenType(token);

  if (tokenType === 'invalid') {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 });
  }

  // ── Stage 2: Challenge response ─────────────────────────────────────────────
  if (tokenType === 'challenge') {
    let payload;
    try {
      payload = verifyChallengeToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 400 });
    }

    // Find the Stage 1 data record
    const stage1Data = await prisma.classAttendanceData.findUnique({
      where: { id: payload.dataId },
      include: { classSession: true },
    });

    if (!stage1Data) {
      return NextResponse.json({ error: 'Stage 1 record not found' }, { status: 400 });
    }

    if (stage1Data.verificationStage !== 'STAGE_1') {
      return NextResponse.json({ error: 'Stage 1 not completed' }, { status: 400 });
    }

    if (stage1Data.challengeToken !== token) {
      return NextResponse.json({ error: 'Challenge token mismatch' }, { status: 400 });
    }

    if (stage1Data.studentId !== payload.studentId) {
      return NextResponse.json({ error: 'Student mismatch' }, { status: 400 });
    }

    if (!isSessionActive(stage1Data.classSession)) {
      return NextResponse.json({ error: 'Session is no longer active' }, { status: 400 });
    }

    // Check if challenge token was already used (prevent reuse)
    if (stage1Data.usedAt) {
      return NextResponse.json({ error: 'Challenge token already used' }, { status: 409 });
    }

    const now = new Date();

    // Record Stage 2 raw scan
    const stage2Record = await prisma.classAttendanceData.create({
      data: {
        classSessionId: stage1Data.classSessionId,
        studentId: payload.studentId,
        scanPayload: { token, timestamp: now.toISOString() },
        scanMethod: 'QR',
        verificationStage: 'STAGE_2',
      },
    });

    // Mark Stage 1 challenge token as used to prevent replay attacks
    await prisma.classAttendanceData.update({
      where: { id: stage1Data.id },
      data: { usedAt: now },
    });

    // Confirm attendance
    const record = await prisma.classAttendanceRecord.upsert({
      where: {
        classSessionId_studentId: {
          classSessionId: stage1Data.classSessionId,
          studentId: payload.studentId,
        },
      },
      update: {
        status: AttendanceStatus.PRESENT,
        verifiedAt: now,
      },
      create: {
        classSessionId: stage1Data.classSessionId,
        studentId: payload.studentId,
        status: AttendanceStatus.PRESENT,
        verifiedAt: now,
      },
    });

    return NextResponse.json({
      stage: 2,
      success: true,
      message: 'Attendance verified — marked PRESENT',
      record,
    }, { status: 200 });
  }

  // ── Stage 1: Initial attendance token ───────────────────────────────────────
  let payload;
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

  // Check if Stage 1 already scanned (prevent duplicate Stage 1 submissions)
  const existingStage1 = await prisma.classAttendanceData.findFirst({
    where: {
      classSessionId: classSession.id,
      studentId: payload.userId,
      verificationStage: 'STAGE_1',
    },
    orderBy: { createdAt: 'desc' },
  });

  // If Stage 2 is already complete, reject
  if (existingStage1) {
    const stage2Done = await prisma.classAttendanceData.findFirst({
      where: {
        classSessionId: classSession.id,
        studentId: payload.userId,
        verificationStage: 'STAGE_2',
      },
    });

    if (stage2Done) {
      return NextResponse.json({ error: 'Attendance already fully verified for this student' }, { status: 409 });
    }

    // Stage 1 already done — return the existing challenge so lecturer can prompt student again
    return NextResponse.json({
      stage: 1,
      alreadyScanned: true,
      message: 'Stage 1 already complete — ask student to show Stage 2 QR',
      studentId: payload.userId,
    }, { status: 200 });
  }

  const now = new Date();

  // Generate challenge token (we need the data record id, so create the record first)
  // Using upsert with unique constraint prevents race condition of duplicate Stage 1 records
  let stage1Record;
  try {
    stage1Record = await prisma.classAttendanceData.create({
      data: {
        classSessionId: classSession.id,
        studentId: payload.userId,
        scanPayload: { token, timestamp: now.toISOString() },
        scanMethod: 'QR',
        verificationStage: 'STAGE_1',
      },
    });
  } catch (err: any) {
    // Handle unique constraint violation - Stage 1 already exists due to concurrent request
    if (err.code === 'P2002') {
      const existing = await prisma.classAttendanceData.findFirst({
        where: {
          classSessionId: classSession.id,
          studentId: payload.userId,
          verificationStage: 'STAGE_1',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing && existing.challengeToken) {
        return NextResponse.json({
          stage: 1,
          alreadyScanned: true,
          message: 'Stage 1 already complete — ask student to show Stage 2 QR',
          studentId: payload.userId,
        }, { status: 200 });
      }
    }
    throw err;
  }

  const challengeToken = signChallengeToken({
    studentId: payload.userId,
    sessionId: classSession.id,
    dataId: stage1Record.id,
  });

  // Store challenge token on the Stage 1 record
  await prisma.classAttendanceData.update({
    where: { id: stage1Record.id },
    data: { challengeToken },
  });

  // Create PENDING attendance record so the live check-in log shows the student
  await prisma.classAttendanceRecord.upsert({
    where: {
      classSessionId_studentId: {
        classSessionId: classSession.id,
        studentId: payload.userId,
      },
    },
    update: { status: AttendanceStatus.PENDING },
    create: {
      classSessionId: classSession.id,
      studentId: payload.userId,
      status: AttendanceStatus.PENDING,
    },
  });

  // Look up the student name for the scan feedback
  const student = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { name: true },
  });

  return NextResponse.json({
    stage: 1,
    message: 'Stage 1 complete — ask student to show their refreshed QR for Stage 2',
    studentName: student?.name ?? 'Unknown',
    studentId: payload.userId,
  }, { status: 200 });
}
