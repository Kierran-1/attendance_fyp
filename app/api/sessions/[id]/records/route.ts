import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: id },
    include: {
      user: {
        select: {
          name: true,
          studentProfile: { select: { studentId: true } },
        },
      },
    },
    orderBy: { checkInTime: 'asc' },
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      studentName: r.user.name ?? '—',
      studentId: r.user.studentProfile?.studentId ?? '—',
      checkInTime: r.checkInTime,
      status: r.status,
    })),
  });
}
