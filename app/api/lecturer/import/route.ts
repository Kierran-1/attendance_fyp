// app/api/lecturer/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionType, UserRole } from '@prisma/client';

type StudentInput = {
  studentId: string;
  name: string;
  major?: string | null;
  nationality?: string | null;
  schoolStatus?: string | null;
};

type UnitInput = {
  code: string;
  name: string;
  semester: string;
  classType: string;
  classGroup?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  venue?: string | null;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const lecturerProfile = await prisma.lecturerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!lecturerProfile) {
    return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { unit: UnitInput; students: StudentInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { unit: unitInput, students } = body;
  if (!unitInput?.code || !unitInput?.name || !Array.isArray(students)) {
    return NextResponse.json(
      { error: 'unit.code, unit.name, and students[] are required' },
      { status: 400 }
    );
  }

  console.log(`[Import] Starting import for ${unitInput.code} with ${students.length} students`);

  // ── Map classType ──────────────────────────────────────────────────────────
  const VALID_TYPES = ['LECTURE', 'TUTORIAL', 'LAB', 'PRACTICAL'] as const;
  const rawType = (unitInput.classType || '').toUpperCase();
  const classType: SessionType = (
    VALID_TYPES.includes(rawType as (typeof VALID_TYPES)[number]) ? rawType : 'LECTURE'
  ) as SessionType;

  const semester = (unitInput.semester || '').split(/\s*[-,]\s*/)[0].trim() || unitInput.semester;
  const classGroup = unitInput.classGroup ?? null;

  // ── Upsert Unit ─────────────────────────────────────────────────────────────
  let unit;
  try {
    unit = await prisma.unit.upsert({
      where: {
        code_classGroup_lecturerId: {
          code:       unitInput.code,
          classGroup: classGroup ?? '',
          lecturerId: lecturerProfile.id,
        },
      },
      update: {
        name:         unitInput.name,
        semester,
        classType,
        scheduleDay:  unitInput.scheduleDay  ?? null,
        scheduleTime: unitInput.scheduleTime ?? null,
        venue:        unitInput.venue        ?? null,
      },
      create: {
        code:         unitInput.code,
        name:         unitInput.name,
        semester,
        year:         new Date().getFullYear(),
        capacity:     999,
        classType,
        classGroup,
        scheduleDay:  unitInput.scheduleDay  ?? null,
        scheduleTime: unitInput.scheduleTime ?? null,
        venue:        unitInput.venue        ?? null,
        lecturerId:   lecturerProfile.id,
      },
    });
  } catch (err) {
    console.error('Unit upsert failed:', err);
    return NextResponse.json(
      { error: 'Failed to create/update unit', detail: String(err) },
      { status: 500 }
    );
  }

  console.log(`[Import] Unit ready: ${unit.id}, processing ${students.length} students...`);

  // ── 1. Filter valid students ────────────────────────────────────────────────
  const validStudents = students.filter(s => s.studentId && s.name);

  // ── 2. Bulk create User rows (skip duplicates) ──────────────────────────────
  const userData = validStudents.map(s => ({
    email: `${s.studentId}@students.swinburne.edu.my`,
    name:  s.name,
    role:  'STUDENT' as const,
  }));

  try {
    await prisma.user.createMany({ data: userData, skipDuplicates: true });
  } catch (err) {
    console.error('User bulk create failed:', err);
  }

  // ── 3. Fetch all User IDs ───────────────────────────────────────────────────
  const emails  = userData.map(u => u.email);
  const users   = await prisma.user.findMany({
    where:  { email: { in: emails } },
    select: { id: true, email: true },
  });
  const userMap = new Map(users.map(u => [u.email, u.id]));

  // ── 4. Bulk create StudentProfile rows ─────────────────────────────────────
  const profileData = validStudents
    .map(s => {
      const userId = userMap.get(`${s.studentId}@students.swinburne.edu.my`);
      if (!userId) return null;
      return {
        userId,
        studentId:      s.studentId,
        major:          s.major        || null,
        nationality:    s.nationality  || null,
        schoolStatus:   s.schoolStatus || null,
        enrollmentYear: new Date().getFullYear(),
      };
    })
    .filter(Boolean);

  let createdProfiles = 0;
  try {
    const result = await prisma.studentProfile.createMany({
      data: profileData as any,
      skipDuplicates: true,
    });
    createdProfiles = result.count;
  } catch (err) {
    console.error('Profile bulk create failed:', err);
  }

  // ── 5. Fetch all profiles (new + existing) for this batch ──────────────────
  const allProfiles = await prisma.studentProfile.findMany({
    where:  { studentId: { in: validStudents.map(s => s.studentId) } },
    select: { id: true, studentId: true },
  });

  // ── 6. Update existing profiles with latest data ───────────────────────────
  if (createdProfiles < validStudents.length) {
    const studentInputMap = new Map(validStudents.map(s => [s.studentId, s]));

    await Promise.all(
      allProfiles.map(profile => {
        const input = studentInputMap.get(profile.studentId);
        if (!input) return Promise.resolve();
        return prisma.studentProfile.update({
          where: { id: profile.id },
          data: {
            ...(input.major        !== undefined && { major:        input.major        || null }),
            ...(input.nationality  !== undefined && { nationality:  input.nationality  || null }),
            ...(input.schoolStatus !== undefined && { schoolStatus: input.schoolStatus || null }),
          },
        });
      })
    );
  }

  // ── 7. Bulk create UnitEnrollment rows (skip duplicates) ───────────────────
  const enrollmentData = allProfiles.map(p => ({
    studentId: p.id,
    unitId:    unit.id,
  }));

  let enrolled = 0;
  try {
    const result = await prisma.unitEnrollment.createMany({
      data: enrollmentData,
      skipDuplicates: true,
    });
    enrolled = result.count;
  } catch (err) {
    console.error('Enrollment bulk create failed:', err);
  }

  const duration = Date.now() - startTime;
  console.log(`[Bulk Import] Completed in ${duration}ms:`, {
    unit:     unitInput.code,
    users:    userData.length,
    profiles: createdProfiles,
    enrolled,
  });

  return NextResponse.json({
    unitId:   unit.id,
    created:  createdProfiles,
    enrolled,
    skipped:  validStudents.length - enrolled,
    errors:   [],
    duration: `${duration}ms`,
  });
}