import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

// [id] = ClassSession.id

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classSessionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = session.user.id;

    const cs = await prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { unitRegistration: true },
    });

    if (!cs) return NextResponse.json({ error: 'Class session not found' }, { status: 404 });
    if (cs.unitRegistration.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const unitId = cs.unitRegistration.unitId;
    const scopeKey = cs.subcomponent ?? cs.groupNo ?? null;

    // Delete the class session (cascades to attendance records/data)
    await prisma.classSession.delete({ where: { id: classSessionId } });

    // Also remove student enrollments scoped to this session type+group
    await prisma.unitRegistration.deleteMany({
      where: { unitId, userStatus: UserStatus.STUDENT, name: scopeKey },
    });

    // If no more class sessions exist for this unit registration, delete it too
    const remainingSessions = await prisma.classSession.count({
      where: { unitRegistrationId: cs.unitRegistrationId },
    });
    if (remainingSessions === 0) {
      await prisma.unitRegistration.delete({ where: { id: cs.unitRegistrationId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class session:', error);
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}