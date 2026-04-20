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
  sessionType?: string;    // e.g. "LA1", "LE1", "TU1"
  groupNo?: string;        // e.g. "01", "02"
  day?: string;            // e.g. "Tue"
  time?: string;           // e.g. "13:00 - 15:00"
  location?: string;
  lecturerName?: string;
  sessionDates?: string[]; // ISO date strings from Excel columns
};

// Map Excel session prefix to Prisma SessionName enum
function toSessionName(sessionType: string): SessionName {
  const prefix = sessionType.slice(0, 2).toUpperCase();
  if (prefix === 'LA') return SessionName.LAB;
  if (prefix === 'TU') return SessionName.TUTORIAL;
  return SessionName.LECTURE;
}

// Parse "13:00 - 15:00" into { startHour, startMin, durationMinutes }
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

// Build 12 weekly session dates starting from the first matching weekday of the year
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

  const year = unitInput.year ?? new Date().getFullYear();
  const semester = unitInput.semester;
  const groupNo = unitInput.groupNo?.trim() || '01';
  const sessionType = unitInput.sessionType?.trim() || 'LE';
  const sessionNameEnum = toSessionName(sessionType);
  const scopeKey = `${sessionType}-${groupNo}`;

  // Upsert Unit
  const unit = await prisma.unit.upsert({
    where: { code: unitInput.code },
    update: { name: unitInput.name },
    create: { code: unitInput.code, name: unitInput.name },
  });

  // One UnitRegistration per lecturer per unit
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
  console.log('[import] sessionDates received:', unitInput.sessionDates);
  const hasExplicitDates = unitInput.sessionDates && unitInput.sessionDates.length > 0;

  const existingSession = await prisma.classSession.findFirst({
    where: {
      unitRegistrationId: lecturerReg.id,
      sessionName: sessionNameEnum,
      groupNo,
      subcomponent: scopeKey,
    },
  });

  // If explicit dates come from the Excel file, always recreate to get correct dates.
  // If no explicit dates, only create if none exist yet.
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

  // Upsert user accounts for all students
  const validStudents = students.filter((s) => s.studentId && s.name);
  const userData = validStudents.map((s) => ({
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

  const emails = userData.map((u) => u.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.email, u.id]));

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

  return NextResponse.json({
    unitId: unit.id,
    registrationId: lecturerReg.id,
    created: userData.length,
    enrolled,
    skipped: validStudents.length - enrolled,
    errors,
    duration: `${Date.now() - startTime}ms`,
  });
}