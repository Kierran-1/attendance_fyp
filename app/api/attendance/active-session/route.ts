import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;
  const now = new Date();

  if (role === UserRole.STUDENT) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        courseEnrollments: {
          select: { courseId: true },
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ session: null });
    }

    const courseIds = studentProfile.courseEnrollments.map((e) => e.courseId);

    if (courseIds.length === 0) {
      return NextResponse.json({ session: null });
    }

    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        courseId: { in: courseIds },
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        course: {
          select: { code: true, name: true, venue: true },
        },
      },
    });

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: activeSession.id,
        courseId: activeSession.courseId,
        course: activeSession.course,
        sessionType: activeSession.sessionType,
        startTime: activeSession.startTime,
        endTime: activeSession.endTime,
      },
    });
  }

  if (role === UserRole.LECTURER) {
    const lecturerProfile = await prisma.lecturerProfile.findUnique({
      where: { userId },
    });

    if (!lecturerProfile) {
      return NextResponse.json({ sessions: [] });
    }

    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        lecturerId: lecturerProfile.id,
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        course: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json({
      sessions: activeSessions.map((s) => ({
        id: s.id,
        courseId: s.courseId,
        course: s.course,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
