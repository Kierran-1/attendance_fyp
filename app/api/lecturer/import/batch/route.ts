import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, SessionName } from '@prisma/client';

type StudentInput = {
  studentId: string;
  name: string;
  major?: string | null;
  nationality?: string | null;
  programName?: string | null;
  schoolStatus?: string | null;
};

type UnitInput = {
  code: string;
  name: string;
  semester: string;
  year?: number;
  sessionType?: string;
  groupNo?: string;
  day?: string;
  time?: string;
  location?: string;
  lecturerName?: string;  // ← renamed from `lecturer` for consistency
};

type SheetPayload = {
  unit: UnitInput;
  students: StudentInput[];
};

function toSessionName(sessionType: string): SessionName {
  const prefix = sessionType.slice(0, 2).toUpperCase();
  if (prefix === 'LA') return SessionName.LAB;
  if (prefix === 'TU') return SessionName.TUTORIAL;
  return SessionName.LECTURE;
}

function parseTime(timeStr: string): { startHour: number; startMin: number; durationMinutes: number } {
  const parts = timeStr.split('-').map(s => s.trim());
  const [sh, sm] = (parts[0] || '00:00').split(':').map(Number);
  const [eh, em] = (parts[1] || parts[0] || '00:00').split(':').map(Number);
  const startHour = isNaN(sh) ? 0 : sh;
  const startMin = isNaN(sm) ? 0 : sm;
  const endHour = isNaN(eh) ? startHour + 2 : eh;
  const endMin = isNaN(em) ? 0 : em;
  const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  return { startHour, startMin, durationMinutes: durationMinutes > 0 ? durationMinutes : 120 };
}

function buildSessionDates(day: string, startHour: number, startMin: number, year: number, count = 12): Date[] {
  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const targetDay = dayMap[day.trim().toLowerCase().slice(0, 3)] ?? 1;
  const first = new Date(year, 0, 1, startHour, startMin, 0, 0);
  while (first.getDay() !== targetDay) {
    first.setDate(first.getDate() + 1);
  }
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + i * 7);
    return d;
  });
}

async function importSheet(
  userId: string,
  payload: SheetPayload
): Promise<{ created: number; enrolled: number; skipped: number; errors: string[] }> {
  const { unit: unitInput, students } = payload;

  const year = unitInput.year ?? new Date().getFullYear();
  const semester = unitInput.semester;
  const groupNo = unitInput.groupNo?.trim() || '01';
  const sessionType = unitInput.sessionType?.trim() || 'LE';
  const sessionNameEnum = toSessionName(sessionType);
  const scopeKey = `${sessionType}-${groupNo}`;

  const unit = await prisma.unit.upsert({
    where: { code: unitInput.code },
    update: { name: unitInput.name },
    create: { code: unitInput.code, name: unitInput.name },
  });

  let lecturerReg = await prisma.unitRegistration.findFirst({
    where: { unitId: unit.id, userId, userStatus: UserStatus.LECTURER },
  });

  if (!lecturerReg) {
    lecturerReg = await prisma.unitRegistration.create({
      data: {
        unitId: unit.id,
        userId,
        userStatus: UserStatus.LECTURER,
        year,
        semester,
        name: null,
      },
    });
  }

  const { startHour, startMin } = parseTime(unitInput.time || '08:00 - 10:00');
  const hasExplicitDates = unitInput.sessionDates && unitInput.sessionDates.length > 0;

  const existingSession = await prisma.classSession.findFirst({
    where: {
      unitRegistrationId: lecturerReg.id,
      sessionName: sessionNameEnum,
      groupNo,
      subcomponent: scopeKey,
    },
  });

  if (existingSession && hasExplicitDates) {
    await prisma.classSession.deleteMany({
      where: {
        unitRegistrationId: lecturerReg.id,
        sessionName: sessionNameEnum,
        groupNo,
        subcomponent: scopeKey,
      },
    });
  }

  if (!existingSession || hasExplicitDates) {
    const scheduledDates: Date[] = hasExplicitDates
      ? unitInput.sessionDates!.map((iso) => {
          const d = new Date(iso);
          d.setHours(startHour, startMin, 0, 0);
          return d;
        })
      : buildSessionDates(unitInput.day || 'Mon', startHour, startMin, year);

    await prisma.classSession.createMany({
      data: scheduledDates.map((scheduledDate) => ({
        unitRegistrationId: lecturerReg.id,
        unitId: unit.id,
        lecturerId: userId,
        sessionName: sessionNameEnum,
        scheduledDate,
        groupNo,
        subcomponent: scopeKey,
        location: unitInput.location ?? null,
        day: unitInput.day ?? null,
        lecturerName: unitInput.lecturerName ?? null,  // ← save lecturer name from Excel
      },
    });
  } else if (unitInput.lecturerName && !classSession.lecturerName) {
    // Backfill lecturerName if the session already exists but has no name stored yet
    classSession = await prisma.classSession.update({
      where: { id: classSession.id },
      data: { lecturerName: unitInput.lecturerName },
    });
  }

  const validStudents = students.filter(s => s.studentId && s.name);
  const userData = validStudents.map(s => ({
    email: `${s.studentId}@students.swinburne.edu.my`,
    name: s.name,
    role: UserRole.STUDENT,
    nationality: s.nationality,
    programName: s.programName,
    schoolStatus: 'Active',
  }));

  try {
    await prisma.user.createMany({ data: userData, skipDuplicates: true });
  } catch (err) {
    console.error('User bulk create failed:', err);
  }

  const emails = userData.map(u => u.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const userMap = new Map(users.map(u => [u.email, u.id]));

  let enrolled = 0;
  const errors: string[] = [];

  for (const s of validStudents) {
    const studentUserId = userMap.get(`${s.studentId}@students.swinburne.edu.my`);
    if (!studentUserId) continue;
    try {
      await prisma.unitRegistration.upsert({
        where: {
          unitId_userId_name: {
            unitId: unit.id,
            userId: studentUserId,
            name: scopeKey,
          },
        },
        update: {},
        create: {
          unitId: unit.id,
          userId: studentUserId,
          userStatus: UserStatus.STUDENT,
          year,
          semester,
          name: scopeKey,
        },
      });
      enrolled++;
    } catch (err) {
      errors.push(String(err));
    }
  }

  return {
    created: userData.length,
    enrolled,
    skipped: validStudents.length - enrolled,
    errors,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== UserRole.LECTURER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = session.user.id;

  let sheets: SheetPayload[];
  try {
    sheets = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(sheets) || sheets.length === 0) {
    return NextResponse.json({ error: 'Expected a non-empty array of sheet payloads' }, { status: 400 });
  }

  for (let i = 0; i < sheets.length; i++) {
    const { unit, students } = sheets[i];
    if (!unit?.code || !unit?.name || !Array.isArray(students)) {
      return NextResponse.json(
        { error: `Sheet at index ${i}: unit.code, unit.name, and students[] are required` },
        { status: 400 }
      );
    }
  }

  const results = [];
  let totalCreated = 0;
  let totalEnrolled = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (const payload of sheets) {
    try {
      const result = await importSheet(userId, payload);
      results.push({
        unitCode: payload.unit.code,
        sessionType: payload.unit.sessionType,
        groupNo: payload.unit.groupNo,
        lecturerName: payload.unit.lecturerName ?? null,
        ...result,
      });
      totalCreated += result.created;
      totalEnrolled += result.enrolled;
      totalSkipped += result.skipped;
      allErrors.push(...result.errors);
    } catch (err) {
      const msg = `Failed to import ${payload.unit.code} (${payload.unit.sessionType}-${payload.unit.groupNo}): ${String(err)}`;
      allErrors.push(msg);
      results.push({
        unitCode: payload.unit.code,
        sessionType: payload.unit.sessionType,
        groupNo: payload.unit.groupNo,
        lecturerName: payload.unit.lecturerName ?? null,
        created: 0,
        enrolled: 0,
        skipped: 0,
        errors: [msg],
      });
    }
  }

  return NextResponse.json({
    sheets: results,
    totalCreated,
    totalEnrolled,
    totalSkipped,
    errors: allErrors,
    duration: `${Date.now() - startTime}ms`,
  });
}