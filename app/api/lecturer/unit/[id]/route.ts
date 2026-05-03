import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

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

    // Delete all sessions in this group (same registration + subcomponent scope)
    await prisma.classSession.deleteMany({
      where: {
        unitRegistrationId: cs.unitRegistrationId,
        subcomponent: cs.subcomponent,
      },
    });

    // Remove the lecturer's unit registration (and cascade student registrations via the unit)
    await prisma.unitRegistration.delete({ where: { id: cs.unitRegistrationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class session:', error);
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}