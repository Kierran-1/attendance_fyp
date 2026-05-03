import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const classSession = await prisma.classSession.findFirst({
    where: { id, lecturerId: session.user.id },
  });

  if (!classSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  let body: {
    scheduledDate?: string | null;
    sessionTime?: string | null;
    sessionDuration?: number;
    location?: string | null;
    weekNumber?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if ('scheduledDate' in body) {
    updateData.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
  }
  if ('sessionTime' in body) {
    updateData.sessionTime = body.sessionTime ? new Date(body.sessionTime) : null;
  }
  if ('sessionDuration' in body && body.sessionDuration !== undefined) {
    updateData.sessionDuration = Number(body.sessionDuration);
  }
  if ('location' in body) {
    updateData.location = body.location ?? null;
  }
  if ('weekNumber' in body) {
    updateData.weekNumber = body.weekNumber != null ? Number(body.weekNumber) : null;
  }

  const updated = await prisma.classSession.update({ where: { id }, data: updateData });
  return NextResponse.json({ session: updated });
}
