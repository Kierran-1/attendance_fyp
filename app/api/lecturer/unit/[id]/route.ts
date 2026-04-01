// app/api/lecturer/unit/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  
) {
  const { id } = await params;  

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lecturer = await prisma.lecturerProfile.findFirst({
    where: { user: { email: session.user.email } },
  });

  if (!lecturer) {
    return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
  }

  const unit = await prisma.unit.findFirst({
    where: { id, lecturerId: lecturer.id },  
  });

  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  await prisma.unit.delete({ where: { id } });  
  return NextResponse.json({ success: true });
}