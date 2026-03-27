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

  const profile = await prisma.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      courses: {
        include: {
          _count: { select: { enrollments: true } },
        },
        orderBy: { code: 'asc' },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ courses: [] });
  }

  return NextResponse.json({
    courses: profile.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      semester: c.semester,
      year: c.year,
      enrollmentCount: c._count.enrollments,
    })),
  });
}
