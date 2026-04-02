import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/student/classes
 * Fetch enrolled classes for the authenticated student (from database, synced with Microsoft)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch only the student profile id to avoid selecting legacy-missing columns.
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ classes: [] });
    }

    const courseEnrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: studentProfile.id },
      include: {
        course: {
          include: {
            lecturer: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const courseIds = courseEnrollments.map((enrollment) => enrollment.course.id);

    const attendanceSummary: Record<string, { total: number; attended: number }> = {};

    if (courseIds.length > 0) {
      const [totalSessionsByCourse, attendedRecords] = await Promise.all([
        prisma.attendanceSession.groupBy({
          by: ['courseId'],
          where: {
            courseId: { in: courseIds },
            startTime: { lte: new Date() },
          },
          _count: { _all: true },
        }),
        prisma.attendanceRecord.findMany({
          where: {
            userId: session.user.id,
            status: { not: 'ABSENT' },
            session: {
              courseId: { in: courseIds },
              startTime: { lte: new Date() },
            },
          },
          select: {
            session: {
              select: {
                courseId: true,
              },
            },
          },
        }),
      ]);

      for (const row of totalSessionsByCourse) {
        attendanceSummary[row.courseId] = {
          total: row._count._all,
          attended: 0,
        };
      }

      for (const row of attendedRecords) {
        const cid = row.session.courseId;
        if (!attendanceSummary[cid]) {
          attendanceSummary[cid] = { total: 0, attended: 0 };
        }
        attendanceSummary[cid].attended += 1;
      }
    }

    // Map database courses to class format
    const classes = courseEnrollments.map((enrollment) => ({
      id: enrollment.course.id,
      code: enrollment.course.code,
      name: enrollment.course.name,
      lecturer: enrollment.course.lecturer.user.name || 'TBD',
      faculty: enrollment.course.lecturer.department || '',
      day: enrollment.course.scheduleDay || 'TBD',
      time: enrollment.course.scheduleTime || 'TBD',
      venue: enrollment.course.venue || 'TBD',
      location: enrollment.course.venue || 'TBD',
      sessionType:
        enrollment.course.sessionType === 'LECTURE'
          ? 'Lecture'
          : enrollment.course.sessionType === 'TUTORIAL'
            ? 'Tutorial'
            : enrollment.course.sessionType === 'LAB'
              ? 'Lab'
              : 'Practical',
      attendanceRate:
        attendanceSummary[enrollment.course.id]?.total > 0
          ? Math.round(
              (attendanceSummary[enrollment.course.id].attended /
                attendanceSummary[enrollment.course.id].total) *
                100
            )
          : 0,
    }));

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('[STUDENT_CLASSES_GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
