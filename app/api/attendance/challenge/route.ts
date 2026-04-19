import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// Students call this to check if a challenge (Stage 2 token) is waiting for them.
// Returns { challengeToken, expiresAt } if pending, or { challengeToken: null } if not.

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.STUDENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const userId = session.user.id;

  // Find most recent Stage 1 record for this student + session that has a challenge token
  const stage1 = await prisma.classAttendanceData.findFirst({
    where: {
      classSessionId: sessionId,
      studentId: userId,
      verificationStage: 'STAGE_1',
      challengeToken: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!stage1?.challengeToken) {
    return NextResponse.json({ challengeToken: null }, { status: 200 });
  }

  // Check if challenge token was already used (prevent reuse)
  if (stage1.usedAt) {
    return NextResponse.json({ challengeToken: null }, { status: 200 });
  }

  // Check if session is still active (challenge should be invalidated if session ended)
  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!classSession) {
    return NextResponse.json({ challengeToken: null }, { status: 200 });
  }

  const now = Date.now();
  const sessionEnd = classSession.sessionTime.getTime() + classSession.sessionDuration * 60_000;
  if (now > sessionEnd) {
    return NextResponse.json({ challengeToken: null }, { status: 200 });
  }

  // Check if Stage 2 is already done for this record
  const stage2Done = await prisma.classAttendanceData.findFirst({
    where: {
      classSessionId: sessionId,
      studentId: userId,
      verificationStage: 'STAGE_2',
    },
  });

  if (stage2Done) {
    // Stage 2 complete — no challenge needed
    return NextResponse.json({ challengeToken: null, verified: true }, { status: 200 });
  }

  return NextResponse.json({ challengeToken: stage1.challengeToken }, { status: 200 });
}
