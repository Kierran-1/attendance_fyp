import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

// studentId here is the UnitRegistration.id of the student

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: unitId, studentId } = await params;

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

    // studentId param is the student's UnitRegistration.id
    const studentReg = await prisma.unitRegistration.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!studentReg || studentReg.unitId !== unitId || studentReg.userStatus !== UserStatus.STUDENT) {
      return NextResponse.json({ error: 'Student not found in this unit' }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (name) {
      await prisma.user.update({
        where: { id: studentReg.userId },
        data: { name },
      });
    }

    return NextResponse.json({
      id: studentReg.id,
      studentNumber: studentReg.user.email?.split('@')[0] ?? '—',
      name: name ?? studentReg.user.name ?? '',
      program: studentReg.user.programName ?? '',
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: unitId, studentId } = await params;

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

    // studentId param is the student's UnitRegistration.id
    const studentReg = await prisma.unitRegistration.findUnique({
      where: { id: studentId },
    });

    if (!studentReg || studentReg.unitId !== unitId || studentReg.userStatus !== UserStatus.STUDENT) {
      return NextResponse.json({ error: 'Student not found in this unit' }, { status: 404 });
    }

    await prisma.unitRegistration.delete({ where: { id: studentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing student:', error);
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
  }
}
