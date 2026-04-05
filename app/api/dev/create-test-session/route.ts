import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, SessionName } from '@prisma/client';

// DEV ONLY — creates a temporary 1-hour ClassSession for testing.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Find user's first student UnitRegistration
  const studentReg = await prisma.unitRegistration.findFirst({
    where: { userId, userStatus: UserStatus.STUDENT },
    include: { unit: true },
  });

  let lecturerRegId: string;
  let lecturerUserId: string;

  if (studentReg) {
    // Find any lecturer UnitRegistration for the same unit
    const lecturerReg = await prisma.unitRegistration.findFirst({
      where: { unitId: studentReg.unitId, userStatus: UserStatus.LECTURER },
    });

    if (lecturerReg) {
      lecturerRegId = lecturerReg.id;
      lecturerUserId = lecturerReg.userId;
    } else {
      // No lecturer reg found — create dev lecturer + registration
      const devLecturer = await prisma.user.upsert({
        where: { email: 'dev-lecturer@swinburne.edu.my' },
        update: {},
        create: {
          email: 'dev-lecturer@swinburne.edu.my',
          name: 'Dev Lecturer',
          role: UserRole.LECTURER,
        },
      });

      const devLecturerReg = await prisma.unitRegistration.upsert({
        where: { unitId_userId: { unitId: studentReg.unitId, userId: devLecturer.id } },
        update: {},
        create: {
          unitId: studentReg.unitId,
          userId: devLecturer.id,
          userStatus: UserStatus.LECTURER,
          year: studentReg.year,
          semester: studentReg.semester,
        },
      });

      lecturerRegId = devLecturerReg.id;
      lecturerUserId = devLecturer.id;
    }
  } else {
    // No student registration — create a full dev setup
    const devLecturer = await prisma.user.upsert({
      where: { email: 'dev-lecturer@swinburne.edu.my' },
      update: {},
      create: {
        email: 'dev-lecturer@swinburne.edu.my',
        name: 'Dev Lecturer',
        role: UserRole.LECTURER,
      },
    });

    const devUnit = await prisma.unit.upsert({
      where: { code: 'DEV0001' },
      update: {},
      create: { code: 'DEV0001', name: 'Dev Test Unit' },
    });

    const devLecturerReg = await prisma.unitRegistration.upsert({
      where: { unitId_userId: { unitId: devUnit.id, userId: devLecturer.id } },
      update: {},
      create: {
        unitId: devUnit.id,
        userId: devLecturer.id,
        userStatus: UserStatus.LECTURER,
        year: new Date().getFullYear(),
        semester: 'Dev',
      },
    });

    // Also create student registration so the current user is enrolled
    await prisma.unitRegistration.upsert({
      where: { unitId_userId: { unitId: devUnit.id, userId } },
      update: {},
      create: {
        unitId: devUnit.id,
        userId,
        userStatus: UserStatus.STUDENT,
        year: new Date().getFullYear(),
        semester: 'Dev',
      },
    });

    lecturerRegId = devLecturerReg.id;
    lecturerUserId = devLecturer.id;
  }

  const now = new Date();

  const classSession = await prisma.classSession.create({
    data: {
      unitRegistrationId: lecturerRegId,
      lecturerId: lecturerUserId,
      sessionName: SessionName.LECTURE,
      sessionTime: now,
      sessionDuration: 60,
    },
  });

  return NextResponse.json({ sessionId: classSession.id, session: classSession }, { status: 201 });
}
