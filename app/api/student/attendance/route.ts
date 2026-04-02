import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.STUDENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;
  const now = new Date();
  const queryDate = req.nextUrl.searchParams.get('date');

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: studentProfile.id },
    select: { courseId: true },
  });

  const courseIds = enrollments.map((e) => e.courseId);

  if (courseIds.length === 0) {
    return NextResponse.json({ records: [], courses: [] });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (queryDate === 'today') {
    const todaySessions = await prisma.attendanceSession.findMany({
      where: {
        courseId: { in: courseIds },
        startTime: { gte: todayStart, lte: todayEnd },
      },
      include: {
        course: { select: { code: true } },
        attendanceRecords: {
          where: { userId },
          take: 1,
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const attendance = todaySessions.map((s) => ({
      id: s.id,
      code: s.course.code,
      session:
        s.sessionType === 'LECTURE'
          ? 'Lecture'
          : s.sessionType === 'TUTORIAL'
            ? 'Tutorial'
            : s.sessionType === 'LAB'
              ? 'Lab'
              : 'Practical',
      status: s.attendanceRecords[0]?.status === 'ABSENT' ? 'Absent' : 'Present',
      recordedAt: s.attendanceRecords[0]?.checkInTime
        ? new Date(s.attendanceRecords[0].checkInTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
    }));

    return NextResponse.json({ attendance });
  }

  // All past sessions for enrolled courses with attendance status
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      courseId: { in: courseIds },
      startTime: { lte: now },
    },
    include: {
      course: { select: { id: true, code: true, name: true, venue: true } },
      attendanceRecords: {
        where: { userId },
        take: 1,
      },
    },
    orderBy: { startTime: 'desc' },
    take: 200,
  });

  const records = sessions.map((s) => ({
    sessionId: s.id,
    date: s.startTime,
    courseId: s.course.id,
    courseCode: s.course.code,
    courseName: s.course.name,
    venue: s.course.venue,
    sessionType: s.sessionType,
    startTime: s.startTime,
    endTime: s.endTime,
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

  const attendance = records
    .filter((r) => {
      const sessionDate = new Date(r.date);
      return sessionDate >= todayStart && sessionDate <= todayEnd;
    })
    .map((r) => ({
      id: r.sessionId,
      code: r.courseCode,
      session:
        r.sessionType === 'LECTURE'
          ? 'Lecture'
          : r.sessionType === 'TUTORIAL'
            ? 'Tutorial'
            : r.sessionType === 'LAB'
              ? 'Lab'
              : 'Practical',
      status: r.status === 'ABSENT' ? 'Absent' : 'Present',
      recordedAt: r.checkInTime
        ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null,
    }));

  return NextResponse.json({
    records,
    courses: Object.values(courseSummaries),
    attendance,
  });
}
