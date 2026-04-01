import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// DEV ONLY — creates a temporary 1-hour attendance session for testing.
// Reuses the student's first enrolled unit, or creates a dummy unit+lecturer.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { unitEnrollments: { include: { unit: true }, take: 1 } },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: 'No student profile found' }, { status: 404 });
  }

  let unitId: string;
  let lecturerId: string;

  if (studentProfile.unitEnrollments.length > 0) {
    // Use the student's first enrolled unit
    const enrollment = studentProfile.unitEnrollments[0];
    unitId = enrollment.unitId;
    lecturerId = enrollment.unit.lecturerId;
  } else {
    // No enrollment — create a dev dummy lecturer + unit + enrollment
    const devLecturerUser = await prisma.user.upsert({
      where: { email: 'dev-lecturer@swinburne.edu.my' },
      update: {},
      create: {
        email: 'dev-lecturer@swinburne.edu.my',
        name: 'Dev Lecturer',
        role: 'LECTURER',
      },
    });

    const devLecturerProfile = await prisma.lecturerProfile.upsert({
      where: { userId: devLecturerUser.id },
      update: {},
      create: { userId: devLecturerUser.id, department: 'Dev' },
    });

    const devUnit = await prisma.unit.upsert({
      where: { code_classGroup_lecturerId: { code: 'DEV0001', classGroup: '', lecturerId: devLecturerProfile.id } },
      update: {},
      create: {
        code: 'DEV0001',
        name: 'Dev Test Unit',
        lecturer: { connect: { id: devLecturerProfile.id } },
        classType: 'LECTURE',
        semester: 'Dev',
        year: new Date().getFullYear(),
        capacity: 999,
      },
    });

    await prisma.unitEnrollment.upsert({
      where: { studentId_unitId: { studentId: studentProfile.id, unitId: devUnit.id } },
      update: {},
      create: { studentId: studentProfile.id, unitId: devUnit.id },
    });

    unitId = devUnit.id;
    lecturerId = devLecturerProfile.id;
  }

  // Close any existing dev sessions for this unit to keep things tidy
  await prisma.attendanceSession.updateMany({
    where: { unitId, qrCode: { startsWith: 'DEV-' } },
    data: { isActive: false },
  });

  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      unitId,
      lecturerId,
      classType: 'LECTURE',
      qrCode: `DEV-${crypto.randomUUID()}`,
      startTime: now,
      endTime,
      isActive: true,
    },
    include: { unit: { select: { code: true, name: true } } },
  });

  return NextResponse.json({ session: attendanceSession }, { status: 201 });
}
