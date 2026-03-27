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

  if (session.user.role !== UserRole.STUDENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;
  const now = new Date();

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      courseEnrollments: { select: { courseId: true } },
    },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  const courseIds = studentProfile.courseEnrollments.map((e) => e.courseId);

  if (courseIds.length === 0) {
    return NextResponse.json({ records: [], courses: [] });
  }

  // All past sessions for enrolled courses with attendance status
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      courseId: { in: courseIds },
      startTime: { lte: now },
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      attendanceRecords: {
        where: { userId },
        take: 1,
      },
    },
    orderBy: { startTime: 'desc' },
  });

  const records = sessions.map((s) => ({
    sessionId: s.id,
    date: s.startTime,
    courseId: s.course.id,
    courseCode: s.course.code,
    courseName: s.course.name,
    sessionType: s.sessionType,
    checkInTime: s.attendanceRecords[0]?.checkInTime ?? null,
    status: s.attendanceRecords[0]?.status ?? 'ABSENT',
  }));

  // Per-course summary
  const courseSummaries: Record<
    string,
    { id: string; code: string; name: string; total: number; attended: number }
  > = {};

  for (const r of records) {
    if (!courseSummaries[r.courseId]) {
      courseSummaries[r.courseId] = {
        id: r.courseId,
        code: r.courseCode,
        name: r.courseName,
        total: 0,
        attended: 0,
      };
    }
    courseSummaries[r.courseId].total += 1;
    if (r.status !== 'ABSENT') {
      courseSummaries[r.courseId].attended += 1;
    }
  }

  return NextResponse.json({
    records,
    courses: Object.values(courseSummaries),
  });
}
