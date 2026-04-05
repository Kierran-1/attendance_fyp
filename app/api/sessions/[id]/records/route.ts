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

  const records = await prisma.classAttendanceRecord.findMany({
    where: { classSessionId: id },
    orderBy: { verifiedAt: 'asc' },
  });

  // Fetch user info for each record
  const userIds = records.map((r) => r.studentId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    records: records.map((r) => {
      const user = userMap.get(r.studentId);
      const emailPrefix = user?.email?.split('@')[0] ?? '—';
      return {
        id: r.id,
        studentName: user?.name ?? '—',
        studentId: emailPrefix,
        checkInTime: r.verifiedAt,
        status: r.status,
      };
    }),
  });
}
