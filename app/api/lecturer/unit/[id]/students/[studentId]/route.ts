// app/api/lecturer/unit/[id]/students/[studentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ── Shared auth + unit ownership check ────────────────────────────────────────

async function getLecturerAndUnit(email: string, unitId: string) {
  const lecturer = await prisma.lecturerProfile.findFirst({
    where: { user: { email } },
  });
  if (!lecturer) return { lecturer: null, unit: null };

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, lecturerId: lecturer.id },
  });

  return { lecturer, unit };
}

// ── PUT — edit student name / program ─────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: unitId, studentId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lecturer, unit } = await getLecturerAndUnit(session.user.email, unitId);
    if (!lecturer) return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    if (!unit)     return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    // studentId param is the StudentProfile.id (cuid), NOT the human-readable student number
    if (!studentId) {
      return NextResponse.json({ error: 'studentId param is missing' }, { status: 400 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },   // ← StudentProfile.id (cuid)
      include: { user: true },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify the student is actually enrolled in this unit
    const enrollment = await prisma.unitEnrollment.findUnique({
      where: {
        studentId_unitId: { studentId: studentProfile.id, unitId: unit.id },
      },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'Student is not enrolled in this class' }, { status: 404 });
    }

    const body = await request.json();
    const { name, program, nationality, schoolStatus } = body;

    // Update User.name if provided
    if (name) {
      await prisma.user.update({
        where: { id: studentProfile.userId },
        data: { name },
      });
    }

    // Update StudentProfile.major if provided
    if (program !== undefined) {
      await prisma.studentProfile.update({
        where: { id: studentProfile.id },
        data: { major: program || null },
      });
    }

    return NextResponse.json({
      id:            studentProfile.id,
      studentNumber: studentProfile.studentId,
      name:          name ?? studentProfile.user.name ?? '',
      program:       program !== undefined ? (program || '') : (studentProfile.major || ''),
      nationality:   nationality || '',
      schoolStatus:  schoolStatus || 'Active',
    });

  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

// ── DELETE — remove student from unit enrollment ───────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: unitId, studentId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lecturer, unit } = await getLecturerAndUnit(session.user.email, unitId);
    if (!lecturer) return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    if (!unit)     return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    if (!studentId) {
      return NextResponse.json({ error: 'studentId param is missing' }, { status: 400 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },   // ← StudentProfile.id (cuid)
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete enrollment only — preserves the student's User + StudentProfile records
    const enrollment = await prisma.unitEnrollment.findUnique({
      where: {
        studentId_unitId: { studentId: studentProfile.id, unitId: unit.id },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Student is not enrolled in this class' }, { status: 404 });
    }

    await prisma.unitEnrollment.delete({
      where: {
        studentId_unitId: { studentId: studentProfile.id, unitId: unit.id },
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing student:', error);
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
  }
}