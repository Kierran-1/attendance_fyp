import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;

  // id param is the Unit.id — verify lecturer has a registration for it
  const registration = await prisma.unitRegistration.findFirst({
    where: { unitId: id, userId, userStatus: UserStatus.LECTURER },
  });

  if (!registration) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  // Delete the unit (cascades to all UnitRegistrations and ClassSessions)
  await prisma.unit.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
