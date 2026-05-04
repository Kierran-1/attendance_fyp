import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const evidence = await prisma.attendanceEvidence.findFirst({
      where: {
        id,
        uploadedBy: user.id,
        status: 'PENDING' // Only allow deletion if still pending
      }
    });

    if (!evidence) {
      return NextResponse.json({ 
        error: 'Sick leave record not found or cannot be deleted' 
      }, { status: 404 });
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), 'public', evidence.fileUrl);
    try {
      await unlink(filePath);
    } catch (err) {
      console.warn('File deletion warning:', err);
    }

    // Delete database record
    await prisma.attendanceEvidence.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Sick leave request cancelled'
    });

  } catch (error) {
    console.error('Delete sick leave error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}