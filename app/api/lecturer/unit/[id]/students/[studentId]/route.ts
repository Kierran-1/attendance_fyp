import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

// [id] = ClassSession.id, [studentId] = student UnitRegistration.id

async function resolveSession(classSessionId: string, userId: string) {
  const cs = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: { unitRegistration: true },
  });
  if (!cs || cs.unitRegistration.userId !== userId) return null;
  return cs;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: classSessionId, studentId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cs = await resolveSession(classSessionId, session.user.id);
    if (!cs) return NextResponse.json({ error: 'Class session not found' }, { status: 404 });

    const studentReg = await prisma.unitRegistration.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    if (!studentReg || studentReg.unitId !== cs.unitRegistration.unitId || studentReg.userStatus !== UserStatus.STUDENT) {
      return NextResponse.json({ error: 'Student not found in this unit' }, { status: 404 });
    }

    const body = await request.json();
    const { name, programName, nationality } = body;
    
    const updatedUser = await prisma.user.update({ 
      where: { id: studentReg.userId }, 
      data: { 
        ...(name ? { name } : {}),
        ...(programName ? { programName } : {}),
        ...(nationality ? { nationality } : {}),
      } 
    });

    return NextResponse.json({
      id: studentReg.id,
      studentNumber: updatedUser.email?.split('@')[0] ?? '—',
      name: updatedUser.name ?? '',
      program: updatedUser.programName ?? '',
      nationality: updatedUser.nationality ?? '',
      schoolStatus: 'Active',
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
    const { id: classSessionId, studentId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cs = await resolveSession(classSessionId, session.user.id);
    if (!cs) return NextResponse.json({ error: 'Class session not found' }, { status: 404 });

    const studentReg = await prisma.unitRegistration.findUnique({ where: { id: studentId } });
    if (!studentReg || studentReg.unitId !== cs.unitRegistration.unitId || studentReg.userStatus !== UserStatus.STUDENT) {
      return NextResponse.json({ error: 'Student not found in this unit' }, { status: 404 });
    }

    await prisma.unitRegistration.delete({ where: { id: studentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing student:', error);
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
  }
}