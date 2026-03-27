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

  const profile = await prisma.lecturerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
  }

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: { id, lecturerId: profile.id },
  });

  if (!attendanceSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  await prisma.attendanceSession.update({
    where: { id },
    data: { isActive: false, endTime: new Date() },
  });

  return NextResponse.json({ success: true });
}
