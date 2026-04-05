import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { signQRToken } from '@/lib/qr';

// Generates a QR token for any session without role restrictions.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { sessionId?: string; studentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { sessionId, studentId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Use provided studentId (for simulating a different student) or fall back to self
  const effectiveStudentId = studentId ?? userId;

  const token = signQRToken({
    studentId: effectiveStudentId,
    userId: effectiveStudentId,
    sessionId,
  });

  return NextResponse.json({ token }, { status: 200 });
}
