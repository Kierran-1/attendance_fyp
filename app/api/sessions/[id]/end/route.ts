import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const classSession = await prisma.classSession.findFirst({
    where: { id, lecturerId: userId },
  });

  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const now = Date.now();
  const elapsed = Math.floor((now - classSession.sessionTime.getTime()) / 60_000);
  const newDuration = Math.max(0, elapsed);

  await prisma.classSession.update({
    where: { id },
    data: { sessionDuration: newDuration },
  });

  return NextResponse.json({ success: true });
}
