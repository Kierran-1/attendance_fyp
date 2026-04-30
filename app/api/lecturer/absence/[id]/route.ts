import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;
    const { id } = params;

    let body: { status: string; lecturerComment?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { status, lecturerComment } = body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED.' },
        { status: 400 }
      );
    }

    // Verify the evidence belongs to a session led by this lecturer
    const evidence = await prisma.attendanceEvidence.findFirst({
      where: {
        id,
        attendanceRecord: {
          classSession: { lecturerId: userId },
        },
      },
    });
    if (!evidence) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const updated = await prisma.attendanceEvidence.update({
      where: { id },
      data: {
        status,
        lecturerComment: lecturerComment?.trim() || null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error('[LECTURER_ABSENCE_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
