import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    const submissions = await prisma.attendanceEvidence.findMany({
      where: {
        attendanceRecord: {
          classSession: { lecturerId: userId },
        },
      },
      include: {
        attendanceRecord: {
          include: {
            classSession: {
              include: {
                unitRegistration: {
                  include: {
                    unit: true,
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({
      submissions: submissions.map((e) => {
        const cs = e.attendanceRecord.classSession;
        const student = cs.unitRegistration.user;
        const unit = cs.unitRegistration.unit;
        return {
          id: e.id,
          fileUrl: e.fileUrl,
          fileName: e.fileName,
          reason: e.reason,
          status: e.status,
          lecturerComment: e.lecturerComment,
          reviewedAt: e.reviewedAt?.toISOString() ?? null,
          uploadedAt: e.uploadedAt.toISOString(),
          studentId: e.attendanceRecord.studentId,
          studentName: student.name,
          studentEmail: student.email,
          unitCode: unit.code,
          unitName: unit.name,
          sessionName: cs.sessionName,
          sessionDate: cs.sessionTime?.toISOString() ?? null,
          sessionDay: cs.day,
          sessionWeek: cs.weekNumber,
        };
      }),
    });
  } catch (error) {
    console.error('[LECTURER_ABSENCE_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
