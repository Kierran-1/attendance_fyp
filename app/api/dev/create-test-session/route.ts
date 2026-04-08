import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, SessionName } from '@prisma/client';

// DEV ONLY — creates a 60-min session under the current user's lecturer account.
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

  // 1. Find or create the dev unit
  const devUnit = await prisma.unit.upsert({
    where: { code: 'DEV0001' },
    update: {},
    create: { code: 'DEV0001', name: 'Dev Test Unit' },
  });

  // 2. Register the CURRENT USER as a lecturer for this unit
  //    This is the key — the session must be owned by the logged-in account
  //    so it shows up in /lecturer/reports and /lecturer/unit
  let myLecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId: devUnit.id, userId, userStatus: UserStatus.LECTURER },
  });

  if (!myLecturerReg) {
    myLecturerReg = await prisma.unitRegistration.create({
      data: { unitId: devUnit.id, userId, userStatus: UserStatus.LECTURER, year, semester },
    });
  }

  // 3. Create the class session under the current user's lecturer registration
  const classSession = await prisma.classSession.create({
    data: {
      unitRegistrationId: myLecturerReg.id,
      lecturerId: userId,
      sessionName: SessionName.LECTURE,
      sessionTime: new Date(),
      sessionDuration: 60,
    },
  });

  return NextResponse.json({ sessionId: classSession.id, session: classSession }, { status: 201 });
}
