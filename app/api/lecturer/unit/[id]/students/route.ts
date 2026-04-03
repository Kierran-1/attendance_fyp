// app/api/lecturer/unit/[id]/students/[studentsID]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Edit student details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentsID: string }> }  // Changed to studentsID
) {
  try {
    const { id: unitId, studentsID } = await params;  // Changed to studentsID
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, program, nationality, schoolStatus } = body;

    // Verify lecturer owns this unit
    const lecturer = await prisma.lecturerProfile.findFirst({
      where: { user: { email: session.user.email } },
    });

    if (!lecturer) {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    }

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, lecturerId: lecturer.id },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Find the student profile - use studentsID here
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentsID },  // Changed to studentsID
      include: { user: true },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify student is enrolled in this unit
    const enrollment = await prisma.unitEnrollment.findUnique({
      where: {
        studentId_unitId: {
          studentId: studentProfile.id,
          unitId: unit.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 404 }
      );
    }

    // Update user name if provided
    if (name) {
      await prisma.user.update({
        where: { id: studentProfile.userId },
        data: { name },
      });
    }

    // Update student profile if program provided
    if (program !== undefined) {
      await prisma.studentProfile.update({
        where: { id: studentProfile.id },
        data: { major: program || null },
      });
    }

    // Return updated student
    const updatedStudent = {
      id: studentProfile.id,
      studentNumber: studentProfile.studentId,
      name: name || studentProfile.user.name,
      program: program !== undefined ? program : (studentProfile.major || ''),
      nationality: nationality || '',
      schoolStatus: schoolStatus || 'Active',
    };

    return NextResponse.json(updatedStudent);

  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE - Remove student from the unit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentsID: string }> }  // Changed to studentsID
) {
  try {
    const { id: unitId, studentsID } = await params;  // Changed to studentsID
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify lecturer owns this unit
    const lecturer = await prisma.lecturerProfile.findFirst({
      where: { user: { email: session.user.email } },
    });

    if (!lecturer) {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    }

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, lecturerId: lecturer.id },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Find the student profile - use studentsID here
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentsID },  // Changed to studentsID
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete the enrollment (removes student from this unit only)
    const enrollment = await prisma.unitEnrollment.findUnique({
      where: {
        studentId_unitId: {
          studentId: studentProfile.id,
          unitId: unit.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 404 }
      );
    }

    await prisma.unitEnrollment.delete({
      where: {
        studentId_unitId: {
          studentId: studentProfile.id,
          unitId: unit.id,
        },
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing student:', error);
    return NextResponse.json(
      { error: 'Failed to remove student' },
      { status: 500 }
    );
  }
}