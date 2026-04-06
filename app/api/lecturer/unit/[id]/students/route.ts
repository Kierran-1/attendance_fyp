import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

// [id] = lecturer's UnitRegistration.id

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: registrationId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const lecturerReg = await prisma.unitRegistration.findUnique({ where: { id: registrationId } });
  if (!lecturerReg || lecturerReg.userStatus !== UserStatus.LECTURER) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  const studentRegistrations = await prisma.unitRegistration.findMany({
    where: { unitId: lecturerReg.unitId, userStatus: UserStatus.STUDENT },
    include: { user: { select: { id: true, name: true, email: true, programName: true } } },
  });

  return NextResponse.json(studentRegistrations.map((reg) => ({
    id: reg.id,
    studentNumber: reg.user.email?.split('@')[0] ?? '—',
    name: reg.user.name ?? 'Unknown',
    program: reg.user.programName ?? '',
    email: reg.user.email,
  })));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: registrationId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = session.user.id;

  const lecturerReg = await prisma.unitRegistration.findUnique({ where: { id: registrationId } });
  if (!lecturerReg || lecturerReg.userId !== userId || lecturerReg.userStatus !== UserStatus.LECTURER) {
    return NextResponse.json({ error: 'Unit not found or not assigned to you' }, { status: 404 });
  }

  const unitId = lecturerReg.unitId;

  let body: { email?: string; name?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { email, name } = body;
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const studentUser = await prisma.user.upsert({
    where: { email },
    update: { ...(name ? { name } : {}) },
    create: { email, name: name ?? null, role: UserRole.STUDENT },
  });

  // findFirst because unique constraint is now [unitId, userId, name]
  const existing = await prisma.unitRegistration.findFirst({
    where: { unitId, userId: studentUser.id, userStatus: UserStatus.STUDENT },
  });
  if (existing) return NextResponse.json({ error: 'Student already enrolled' }, { status: 409 });

  const registration = await prisma.unitRegistration.create({
    data: {
      unitId,
      userId: studentUser.id,
      userStatus: UserStatus.STUDENT,
      year: lecturerReg.year,
      semester: lecturerReg.semester,
    },
    include: { user: { select: { id: true, name: true, email: true, programName: true } } },
  });

  return NextResponse.json({
    id: registration.id,
    studentNumber: studentUser.email?.split('@')[0] ?? '—',
    name: studentUser.name ?? 'Unknown',
    program: registration.user.programName ?? '',
    email: studentUser.email,
  }, { status: 201 });
}