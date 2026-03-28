import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, SessionType } from '@prisma/client';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { courseId?: string; sessionType?: string; durationMinutes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { courseId, sessionType, durationMinutes } = body;

  if (!courseId || !sessionType || !durationMinutes) {
    return NextResponse.json({ error: 'courseId, sessionType, and durationMinutes are required' }, { status: 400 });
  }

  if (!Object.values(SessionType).includes(sessionType as SessionType)) {
    return NextResponse.json({ error: 'Invalid sessionType' }, { status: 400 });
  }

  const profile = await prisma.lecturerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
  }

  // Verify the course belongs to this lecturer
  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: profile.id },
  });

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // End any existing active sessions for this course
  await prisma.attendanceSession.updateMany({
    where: { courseId, isActive: true },
    data: { isActive: false, endTime: new Date() },
  });

  const now = new Date();
  const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      courseId,
      lecturerId: profile.id,
      sessionType: sessionType as SessionType,
      qrCode: crypto.randomUUID(),
      startTime: now,
      endTime,
      isActive: true,
    },
    include: {
      course: { select: { code: true, name: true } },
    },
  });

  return NextResponse.json({ session: attendanceSession }, { status: 201 });
}
