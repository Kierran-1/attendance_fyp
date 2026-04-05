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

    const unitEnrollment = await prisma.unitEnrollment.findMany({
      where: { studentId: studentProfile.id },
      include: {
        unit: {
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

    const unitIds = unitEnrollment.map((enrollment) => enrollment.unit.id);

    const attendanceSummary: Record<string, { total: number; attended: number }> = {};

    if (unitIds.length > 0) {
      const [totalSessionsByUnit, attendedRecords] = await Promise.all([
        prisma.attendanceSession.groupBy({
          by: ['unitId'],
          where: {
            unitId: { in: unitIds },
            startTime: { lte: new Date() },
          },
          _count: { _all: true },
        }),
        prisma.attendanceRecord.findMany({
          where: {
            userId: session.user.id,
            status: { not: 'ABSENT' },
            session: {
              unitId: { in: unitIds },
              startTime: { lte: new Date() },
            },
          },
          select: {
            session: {
              select: {
                unitId: true,
              },
            },
          },
        }),
      ]);

      for (const row of totalSessionsByUnit) {
        attendanceSummary[row.unitId] = {
          total: row._count._all,
          attended: 0,
        };
      }

      for (const row of attendedRecords) {
        const cid = row.session.unitId;
        if (!attendanceSummary[cid]) {
          attendanceSummary[cid] = { total: 0, attended: 0 };
        }
        attendanceSummary[cid].attended += 1;
      }
    }

    // Map database units to class format
    const classes = unitEnrollment.map((enrollment) => ({
      id: enrollment.unit.id,
      code: enrollment.unit.code,
      name: enrollment.unit.name,
      lecturer: enrollment.unit.lecturer.user.name || 'TBD',
      faculty: enrollment.unit.lecturer.department || '',
      day: enrollment.unit.scheduleDay || 'TBD',
      time: enrollment.unit.scheduleTime || 'TBD',
      venue: enrollment.unit.venue || 'TBD',
      location: enrollment.unit.venue || 'TBD',
      sessionType:
        enrollment.unit.sessionType === 'LECTURE'
          ? 'Lecture'
          : enrollment.unit.sessionType === 'TUTORIAL'
            ? 'Tutorial'
            : enrollment.unit.sessionType === 'LAB'
              ? 'Lab'
              : 'Practical',
      attendanceRate:
        attendanceSummary[enrollment.unit.id]?.total > 0
          ? Math.round(
              (attendanceSummary[enrollment.unit.id].attended /
                attendanceSummary[enrollment.unit.id].total) *
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
