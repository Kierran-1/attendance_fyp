import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

type StudentInput = {
  studentId: string;
  name: string;
  major?: string | null;
  nationality?: string | null;
  schoolStatus?: string | null;
};

type UnitInput = {
  code: string;
  name: string;
  semester: string;
  year?: number;
  classType?: string;
  group?: string;
  day?: string;
  time?: string;
  room?: string;
  lecturer?: string;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;

  let body: { unit: UnitInput; students: StudentInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { unit: unitInput, students } = body;
  if (!unitInput?.code || !unitInput?.name || !Array.isArray(students)) {
    return NextResponse.json(
      { error: 'unit.code, unit.name, and students[] are required' },
      { status: 400 }
    );
  }

  const year = unitInput.year ?? new Date().getFullYear();
  const semester = unitInput.semester;

  // Store all class metadata as JSON in the `name` field.
  // This avoids needing extra columns while preserving all class-specific info.
  const classMeta = JSON.stringify({
    classType: unitInput.classType || '',
    group: unitInput.group || '',
    day: unitInput.day || '',
    time: unitInput.time || '',
    room: unitInput.room || '',
    lecturer: unitInput.lecturer || '',
  });

  // Upsert Unit by code
  const unit = await prisma.unit.upsert({
    where: { code: unitInput.code },
    update: { name: unitInput.name },
    create: { code: unitInput.code, name: unitInput.name },
  });

  // Find existing registration for this exact class group (matched by classMeta in name)
  let lecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId: unit.id, userId, userStatus: UserStatus.LECTURER, name: classMeta },
  });

  if (!lecturerReg) {
    lecturerReg = await prisma.unitRegistration.create({
      data: {
        unitId: unit.id,
        userId,
        userStatus: UserStatus.LECTURER,
        year,
        semester,
        name: classMeta,
      },
    });
  }

  const validStudents = students.filter((s) => s.studentId && s.name);

  const userData = validStudents.map((s) => ({
    email: `${s.studentId}@students.swinburne.edu.my`,
    name: s.name,
    role: UserRole.STUDENT,
  }));

  try {
    await prisma.user.createMany({ data: userData, skipDuplicates: true });
  } catch (err) {
    console.error('User bulk create failed:', err);
  }

  const emails = userData.map((u) => u.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.email, u.id]));

  const enrollmentData = validStudents
    .map((s) => {
      const studentUserId = userMap.get(`${s.studentId}@students.swinburne.edu.my`);
      if (!studentUserId) return null;
      return {
        unitId: unit.id,
        userId: studentUserId,
        userStatus: UserStatus.STUDENT,
        year,
        semester,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  let enrolled = 0;
  const errors: string[] = [];

  try {
    const result = await prisma.unitRegistration.createMany({
      data: enrollmentData,
      skipDuplicates: true,
    });
    enrolled = result.count;
  } catch (err) {
    console.error('Enrollment bulk create failed:', err);
    errors.push(String(err));
  }

  return NextResponse.json({
    unitId: unit.id,
    registrationId: lecturerReg.id,
    created: userData.length,
    enrolled,
    skipped: validStudents.length - enrolled,
    errors,
    duration: `${Date.now() - startTime}ms`,
  });
}