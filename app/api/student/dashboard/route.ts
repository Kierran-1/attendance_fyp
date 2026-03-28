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
      courseEnrollments: {
        include: {
          course: {
            include: {
              _count: { select: { attendanceSessions: true } },
            },
          },
        },
      },
    },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  const courseIds = studentProfile.courseEnrollments.map((e) => e.courseId);

  // Count attended sessions per course for this student
  const records = await prisma.attendanceRecord.findMany({
    where: { userId },
    select: { session: { select: { courseId: true } } },
  });

  const attendedByCourse: Record<string, number> = {};
  for (const r of records) {
    const cid = r.session.courseId;
    attendedByCourse[cid] = (attendedByCourse[cid] ?? 0) + 1;
  }

  const courses = studentProfile.courseEnrollments.map((e) => ({
    id: e.course.id,
    code: e.course.code,
    name: e.course.name,
    semester: e.course.semester,
    year: e.course.year,
    totalSessions: e.course._count.attendanceSessions,
    attendedSessions: attendedByCourse[e.course.id] ?? 0,
  }));

  const totalSessions = courses.reduce((sum, c) => sum + c.totalSessions, 0);
  const totalAttended = courses.reduce((sum, c) => sum + c.attendedSessions, 0);
  const overallPct = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : null;
  const totalAbsent = totalSessions - totalAttended;

  // Recent past sessions with attendance status (attended or absent)
  const recentSessions =
    courseIds.length > 0
      ? await prisma.attendanceSession.findMany({
          where: {
            courseId: { in: courseIds },
            startTime: { lte: now },
          },
          include: {
            course: { select: { code: true, name: true } },
            attendanceRecords: {
              where: { userId },
              take: 1,
            },
          },
          orderBy: { startTime: 'desc' },
          take: 5,
        })
      : [];

  const recentAttendance = recentSessions.map((s) => ({
    sessionId: s.id,
    date: s.startTime,
    courseCode: s.course.code,
    courseName: s.course.name,
    sessionType: s.sessionType,
    checkInTime: s.attendanceRecords[0]?.checkInTime ?? null,
    status: s.attendanceRecords[0]?.status ?? 'ABSENT',
  }));

  return NextResponse.json({
    profile: {
      studentId: studentProfile.studentId,
      major: studentProfile.major,
      enrollmentYear: studentProfile.enrollmentYear,
    },
    courses,
    recentAttendance,
    stats: {
      overallPct,
      enrolledCourses: courses.length,
      totalAbsent,
    },
  });
}
