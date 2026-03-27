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

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const lecturerProfile = await prisma.lecturerProfile.findUnique({
    where: { userId },
  });

  if (!lecturerProfile) {
    return NextResponse.json({
      stats: { todaysClasses: 0, avgAttendancePct: null, atRiskCount: 0, totalStudents: 0 },
      todaysCourses: [],
      atRiskStudents: [],
      weeklyAttendance: [],
    });
  }

  // Courses with today's sessions and enrollment counts
  const courses = await prisma.course.findMany({
    where: { lecturerId: lecturerProfile.id },
    include: {
      _count: { select: { enrollments: true } },
      attendanceSessions: {
        where: { startTime: { gte: todayStart, lt: todayEnd } },
        include: { _count: { select: { attendanceRecords: true } } },
      },
    },
    orderBy: { code: 'asc' },
  });

  const courseIds = courses.map((c) => c.id);
  const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const todaysClasses = courses.filter((c) => c.attendanceSessions.length > 0).length;

  // All sessions for this lecturer's courses
  const allSessions = await prisma.attendanceSession.findMany({
    where: { lecturerId: lecturerProfile.id },
    select: { id: true, courseId: true, _count: { select: { attendanceRecords: true } } },
  });

  // Build sessions per course and total records per course
  const sessionsPerCourse: Record<string, number> = {};
  const recordsPerCourse: Record<string, number> = {};
  for (const s of allSessions) {
    sessionsPerCourse[s.courseId] = (sessionsPerCourse[s.courseId] ?? 0) + 1;
    recordsPerCourse[s.courseId] = (recordsPerCourse[s.courseId] ?? 0) + s._count.attendanceRecords;
  }

  // Average attendance % across all courses
  let avgNumerator = 0;
  let avgDenominator = 0;
  for (const c of courses) {
    const total = (sessionsPerCourse[c.id] ?? 0) * c._count.enrollments;
    const attended = recordsPerCourse[c.id] ?? 0;
    if (total > 0) {
      avgNumerator += attended;
      avgDenominator += total;
    }
  }
  const avgAttendancePct =
    avgDenominator > 0 ? Math.round((avgNumerator / avgDenominator) * 100) : null;

  // At-risk students: enrolled students with < 80% attendance per course
  const enrollments =
    courseIds.length > 0
      ? await prisma.courseEnrollment.findMany({
          where: { courseId: { in: courseIds } },
          include: {
            student: {
              include: { user: { select: { name: true } } },
            },
            course: { select: { id: true, code: true } },
          },
        })
      : [];

  // Attendance records per student per course
  const studentCourseRecords = await prisma.attendanceRecord.groupBy({
    by: ['userId'],
    where: {
      session: { courseId: { in: courseIds } },
    },
    _count: { id: true },
  });

  // We need per-student per-course counts — groupBy can't do multi-field join
  // So fetch records individually per at-risk check
  const allRecords =
    courseIds.length > 0
      ? await prisma.attendanceRecord.findMany({
          where: { session: { courseId: { in: courseIds } } },
          select: { userId: true, session: { select: { courseId: true } } },
        })
      : [];

  const attendanceMap: Record<string, Record<string, number>> = {};
  for (const r of allRecords) {
    if (!attendanceMap[r.userId]) attendanceMap[r.userId] = {};
    const cid = r.session.courseId;
    attendanceMap[r.userId][cid] = (attendanceMap[r.userId][cid] ?? 0) + 1;
  }

  const atRiskStudents: {
    name: string;
    studentId: string;
    courseCode: string;
    attendancePct: number;
    status: string;
  }[] = [];

  const seenPairs = new Set<string>();
  for (const e of enrollments) {
    const totalForCourse = sessionsPerCourse[e.courseId] ?? 0;
    if (totalForCourse === 0) continue;
    const attended = attendanceMap[e.student.userId]?.[e.courseId] ?? 0;
    const pct = Math.round((attended / totalForCourse) * 100);
    const key = `${e.student.userId}-${e.courseId}`;
    if (pct < 80 && !seenPairs.has(key)) {
      seenPairs.add(key);
      atRiskStudents.push({
        name: e.student.user.name ?? '—',
        studentId: e.student.studentId,
        courseCode: e.course.code,
        attendancePct: pct,
        status: pct < 60 ? 'High Risk' : 'Medium',
      });
    }
  }

  atRiskStudents.sort((a, b) => a.attendancePct - b.attendancePct);

  // Weekly attendance (Mon–Fri of current week)
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday

  const weeklyAttendance = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const dayStart = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const daySessions = await prisma.attendanceSession.findMany({
        where: {
          lecturerId: lecturerProfile.id,
          startTime: { gte: dayStart, lt: dayEnd },
        },
        include: {
          _count: { select: { attendanceRecords: true } },
          course: { select: { _count: { select: { enrollments: true } } } },
        },
      });

      let sessionTotal = 0;
      let sessionAttended = 0;
      for (const s of daySessions) {
        sessionTotal += s.course._count.enrollments;
        sessionAttended += s._count.attendanceRecords;
      }

      return {
        date: dayStart.toISOString(),
        pct: sessionTotal > 0 ? Math.round((sessionAttended / sessionTotal) * 100) : null,
      };
    })
  );

  return NextResponse.json({
    stats: {
      todaysClasses,
      avgAttendancePct,
      atRiskCount: atRiskStudents.length,
      totalStudents,
    },
    todaysCourses: courses.map((c) => {
      const todaySession = c.attendanceSessions[0] ?? null;
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        enrollmentCount: c._count.enrollments,
        todaySession: todaySession
          ? {
              id: todaySession.id,
              sessionType: todaySession.sessionType,
              startTime: todaySession.startTime,
              attendanceCount: todaySession._count.attendanceRecords,
            }
          : null,
      };
    }),
    atRiskStudents,
    weeklyAttendance,
  });
}
