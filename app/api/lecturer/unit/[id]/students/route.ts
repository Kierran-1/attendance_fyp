import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: unitId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const studentRegistrations = await prisma.unitRegistration.findMany({
    where: { unitId, userStatus: UserStatus.STUDENT },
    include: {
      user: { select: { id: true, name: true, email: true, programName: true } },
    },
  });

  const students = studentRegistrations.map((reg) => ({
    id: reg.id,
    studentNumber: reg.user.email?.split('@')[0] ?? '—',
    name: reg.user.name ?? 'Unknown',
    program: reg.user.programName ?? '',
    email: reg.user.email,
  }));

  return NextResponse.json(students);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: unitId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;

  // Verify lecturer owns this unit
  const lecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId, userId, userStatus: UserStatus.LECTURER },
  });

  if (!lecturerReg) {
    return NextResponse.json({ error: 'Unit not found or not assigned to you' }, { status: 404 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, name } = body;
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  // Upsert the student User
  const studentUser = await prisma.user.upsert({
    where: { email },
    update: { ...(name ? { name } : {}) },
    create: { email, name: name ?? null, role: UserRole.STUDENT },
  });

  // Create UnitRegistration(STUDENT) if not exists
  const existing = await prisma.unitRegistration.findUnique({
    where: { unitId_userId: { unitId, userId: studentUser.id } },
  });

  if (existing) {
    return NextResponse.json({ error: 'Student already enrolled' }, { status: 409 });
  }

  const registration = await prisma.unitRegistration.create({
    data: {
      unitId,
      userId: studentUser.id,
      userStatus: UserStatus.STUDENT,
      year: lecturerReg.year,
      semester: lecturerReg.semester,
    },
    include: {
      user: { select: { id: true, name: true, email: true, programName: true } },
    },
  });

  return NextResponse.json(
    {
      id: registration.id,
      studentNumber: studentUser.email?.split('@')[0] ?? '—',
      name: studentUser.name ?? 'Unknown',
      program: studentUser.programName ?? '',
      email: studentUser.email,
    },
    { status: 201 }
  );
}
