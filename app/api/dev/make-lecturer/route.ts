import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DEV ONLY — promotes the currently logged-in user to LECTURER and creates a LecturerProfile.
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: 'LECTURER' },
  });

  await prisma.lecturerProfile.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id, department: 'Computing' },
  });

  return NextResponse.json({
    ok: true,
    message: `User ${session.user.email} promoted to LECTURER. Sign out and sign back in for the session to update.`,
  });
}
