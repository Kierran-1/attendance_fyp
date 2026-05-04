import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, SessionName } from '@prisma/client';

// DEV ONLY — creates an active 60-min session under the current user's lecturer account.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const year = new Date().getFullYear();
  const semester = 'DEV';
  const now = new Date();

  // 1. Find or create the dev unit
  const devUnit = await prisma.unit.upsert({
    where: { code: 'DEV0001' },
    update: {},
    create: { code: 'DEV0001', name: 'Dev Test Unit' },
  });

  // 2. Clean up any accidental STUDENT enrollment for the current user
  await prisma.unitRegistration.deleteMany({
    where: { unitId: devUnit.id, userId, userStatus: UserStatus.STUDENT },
  });

  // 3. Register the current user as a LECTURER for this unit
  let myLecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId: devUnit.id, userId, userStatus: UserStatus.LECTURER },
  });

  if (!myLecturerReg) {
    myLecturerReg = await prisma.unitRegistration.create({
      data: { unitId: devUnit.id, userId, userStatus: UserStatus.LECTURER, year, semester },
    });
  }

  // 4. Create the class session — set status ACTIVE and liveStartedAt so the
  //    sessions API recognises it as a running session
  const classSession = await prisma.classSession.create({
    data: {
      unitRegistrationId: myLecturerReg.id,
      lecturerId: userId,
      sessionName: SessionName.LECTURE,
      sessionTime: now,
      sessionDuration: 60,
      scheduledDate: now,
      weekNumber: 1,
      status: 'ACTIVE',
      liveStartedAt: now,
    },
  });

  return NextResponse.json({ sessionId: classSession.id, session: classSession }, { status: 201 });
}
