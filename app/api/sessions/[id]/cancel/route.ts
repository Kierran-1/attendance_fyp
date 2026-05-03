import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, SessionStatus, AttendanceStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    let body: { reason?: string } = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id },
      include: {
        unitRegistration: true,
      },
    });

    if (!classSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (classSession.unitRegistration.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own session' },
        { status: 403 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const cancelledRecords = await tx.classAttendanceRecord.updateMany({
        where: {
          classSessionId: id,
        },
        data: {
          status: AttendanceStatus.CANCELLED,
        },
      });

      const cancelledSession = await tx.classSession.update({
        where: { id },
        data: {
          status: SessionStatus.CANCELLED,
          liveEndedAt: now,
          cancelledAt: now,
          cancelReason:
            body.reason || 'Accidentally opened live attendance session',
        },
      });

      return {
        cancelledSession,
        cancelledRecordsCount: cancelledRecords.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully',
      session: result.cancelledSession,
      cancelledRecordsCount: result.cancelledRecordsCount,
    });
  } catch (error) {
    console.error('Cancel session API error:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}