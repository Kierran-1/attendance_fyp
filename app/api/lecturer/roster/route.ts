import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const profile = await prisma.lecturerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const courseId = formData.get('courseId') as string | null;
  const file = formData.get('file') as File | null;

  if (!courseId || !file) {
    return NextResponse.json({ error: 'courseId and file are required' }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: profile.id },
  });

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const text = await file.text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    return NextResponse.json(
      { error: 'CSV must have a header row and at least one data row' },
      { status: 400 }
    );
  }

  // Normalise headers: lowercase, strip spaces
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));

  const nameIdx = headers.indexOf('name');
  const studentIdIdx = headers.findIndex(
    (h) => h === 'studentid' || h === 'student_id' || h === 'id'
  );
  const emailIdx = headers.indexOf('email');
  const programIdx = headers.findIndex((h) => h === 'program' || h === 'major');
  const nationalityIdx = headers.indexOf('nationality');
  const schoolStatusIdx = headers.findIndex((h) => h === 'schoolstatus' || h === 'school_status' || h === 'status');

  if (nameIdx === -1 || studentIdIdx === -1 || emailIdx === -1) {
    return NextResponse.json(
      { error: 'CSV must include columns: name, studentId, email' },
      { status: 400 }
    );
  }

  let created = 0;
  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const name = cols[nameIdx];
    const studentId = cols[studentIdIdx];
    const email = cols[emailIdx];
    const program = programIdx !== -1 ? cols[programIdx] || null : null;
    const nationality = nationalityIdx !== -1 ? cols[nationalityIdx] || null : null;
    const schoolStatus = schoolStatusIdx !== -1 ? cols[schoolStatusIdx] || null : null;

    if (!name || !studentId || !email) {
      errors.push(`Row ${i + 1}: missing required fields`);
      continue;
    }

    try {
      // Upsert user by email
      const existingUser = await prisma.user.findUnique({ where: { email } });
      const user = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name, role: 'STUDENT' },
      });

      // Find or create student profile
      let studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });

      if (!studentProfile) {
        // Check studentId isn't already taken by another user
        const takenProfile = await prisma.studentProfile.findUnique({
          where: { studentId },
        });
        if (takenProfile) {
          errors.push(`Row ${i + 1}: Student ID ${studentId} is already assigned to another account`);
          continue;
        }
        studentProfile = await prisma.studentProfile.create({
          data: {
            userId: user.id,
            studentId,
            ...(program && { major: program }),
          },
        });
        if (!existingUser) created++;
      } else {
        // Update optional fields if provided
        if (program) {
          await prisma.studentProfile.update({
            where: { id: studentProfile.id },
            data: { major: program },
          });
        }
      }

      // Enroll in course
      const existingEnrollment = await prisma.courseEnrollment.findUnique({
        where: { studentId_courseId: { studentId: studentProfile.id, courseId } },
      });

      if (!existingEnrollment) {
        await prisma.courseEnrollment.create({
          data: { studentId: studentProfile.id, courseId },
        });
        enrolled++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(`Row ${i + 1} (${email}): ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  return NextResponse.json({ created, enrolled, skipped, errors });
}
