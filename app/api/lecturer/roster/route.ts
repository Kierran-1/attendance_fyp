import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const unitId = formData.get('courseId') as string | null;
  const file = formData.get('file') as File | null;

  if (!unitId || !file) {
    return NextResponse.json({ error: 'courseId and file are required' }, { status: 400 });
  }

  // Verify lecturer has a registration for this unit
  const lecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId, userId, userStatus: UserStatus.LECTURER },
  });

  if (!lecturerReg) {
    return NextResponse.json({ error: 'Unit not found or not assigned to you' }, { status: 404 });
  }

  const text = await file.text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    return NextResponse.json(
      { error: 'CSV must have a header row and at least one data row' },
      { status: 400 }
    );
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));

  const nameIdx = headers.indexOf('name');
  const studentIdIdx = headers.findIndex(
    (h) => h === 'studentid' || h === 'student_id' || h === 'id'
  );
  const emailIdx = headers.indexOf('email');

  if (nameIdx === -1 || (studentIdIdx === -1 && emailIdx === -1)) {
    return NextResponse.json(
      { error: 'CSV must include columns: name, and either studentId or email' },
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

    let email: string;
    if (emailIdx !== -1 && cols[emailIdx]) {
      email = cols[emailIdx];
    } else if (studentIdIdx !== -1 && cols[studentIdIdx]) {
      email = `${cols[studentIdIdx]}@students.swinburne.edu.my`;
    } else {
      errors.push(`Row ${i + 1}: missing email or studentId`);
      continue;
    }

    if (!name || !email) {
      errors.push(`Row ${i + 1}: missing required fields`);
      continue;
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      const user = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name, role: UserRole.STUDENT },
      });

      if (!existingUser) created++;

      const existingReg = await prisma.unitRegistration.findUnique({
        where: { unitId_userId_name: { unitId, userId: user.id, name: null } },
      });

      if (!existingReg) {
        await prisma.unitRegistration.create({
          data: {
            unitId,
            userId: user.id,
            userStatus: UserStatus.STUDENT,
            year: lecturerReg.year,
            semester: lecturerReg.semester,
          },
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
