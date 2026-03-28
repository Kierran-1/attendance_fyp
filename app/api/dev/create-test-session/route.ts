import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// DEV ONLY — creates a temporary 1-hour attendance session for testing.
// Reuses the student's first enrolled course, or creates a dummy course+lecturer.
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
    include: { courseEnrollments: { include: { course: true }, take: 1 } },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: 'No student profile found' }, { status: 404 });
  }

  let courseId: string;
  let lecturerId: string;

  if (studentProfile.courseEnrollments.length > 0) {
    // Use the student's first enrolled course
    const enrollment = studentProfile.courseEnrollments[0];
    courseId = enrollment.courseId;
    lecturerId = enrollment.course.lecturerId;
  } else {
    // No enrollment — create a dev dummy lecturer + course + enrollment
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

    const devCourse = await prisma.course.upsert({
      where: { code: 'DEV0001' },
      update: {},
      create: {
        code: 'DEV0001',
        name: 'Dev Test Course',
        lecturer: { connect: { id: devLecturerProfile.id } },
        sessionType: 'LECTURE',
        semester: 'Dev',
        year: new Date().getFullYear(),
        capacity: 999,
      },
    });

    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: studentProfile.id, courseId: devCourse.id } },
      update: {},
      create: { studentId: studentProfile.id, courseId: devCourse.id },
    });

    courseId = devCourse.id;
    lecturerId = devLecturerProfile.id;
  }

  // Close any existing dev sessions for this course to keep things tidy
  await prisma.attendanceSession.updateMany({
    where: { courseId, qrCode: { startsWith: 'DEV-' } },
    data: { isActive: false },
  });

  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      courseId,
      lecturerId,
      sessionType: 'LECTURE',
      qrCode: `DEV-${crypto.randomUUID()}`,
      startTime: now,
      endTime,
      isActive: true,
    },
    include: { course: { select: { code: true, name: true } } },
  });

  return NextResponse.json({ session: attendanceSession }, { status: 201 });
}
