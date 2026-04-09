import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = session.user.id;

    const lecturerRegistrations = await prisma.unitRegistration.findMany({
      where: { userId, userStatus: UserStatus.LECTURER },
      include: {
        unit: true,
        classSessions: {
          include: {
            attendanceRecords: { select: { studentId: true, status: true } },
          },
        },
      },
    });

    // Each lecturer registration may have multiple class sessions (groups).
    // Expand into one entry per ClassSession so the UI shows separate cards.
    const result: any[] = [];

    for (const reg of lecturerRegistrations) {
      for (const cs of reg.classSessions) {
        // Fetch students scoped to this session's scopeKey (e.g. "LA1-01")
        // stored in subcomponent during import to uniquely identify session type+group
        const studentRegistrations = await prisma.unitRegistration.findMany({
          where: {
            unitId: reg.unitId,
            userStatus: UserStatus.STUDENT,
            name: cs.subcomponent ?? cs.groupNo ?? null,
          },
          include: {
            user: { select: { id: true, name: true, email: true, programName: true, nationality: true, schoolStatus: true } },
          },
        });

        const students = studentRegistrations.map((sr) => ({
          id: sr.id,
          studentNumber: sr.user.email?.split('@')[0] ?? '—',
          name: sr.user.name ?? 'Unknown',
          program: sr.user.programName ?? '',
          nationality: sr.user.nationality ?? '',
          schoolStatus: sr.user.schoolStatus ?? 'Active',  
        }));

        const presentCount = cs.attendanceRecords.filter(
          (r) => r.status === 'PRESENT' || r.status === 'LATE'
        ).length;
        const absentCount = cs.attendanceRecords.filter((r) => r.status === 'ABSENT').length;
        const total = cs.attendanceRecords.length;
        const now = Date.now();
        const end = cs.sessionTime.getTime() + cs.sessionDuration * 60_000;
        const isActive = now >= cs.sessionTime.getTime() && now <= end;

        // Derive day and time from sessionTime
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const day = days[cs.sessionTime.getDay()] ?? '';
        const padTime = (h: number, m: number) =>
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const startH = cs.sessionTime.getHours();
        const startM = cs.sessionTime.getMinutes();
        const endDate = new Date(cs.sessionTime.getTime() + cs.sessionDuration * 60_000);
        const time = `${padTime(startH, startM)} - ${padTime(endDate.getHours(), endDate.getMinutes())}`;

        result.push({
          // Use classSessionId as the card id so the frontend can scope operations
          id: cs.id,
          unitRegistrationId: reg.id,
          unitId: reg.unitId,
          unitCode: reg.unit.code,
          unitName: reg.unit.name,
          semester: reg.semester,
          year: reg.year,
          classType: cs.sessionName,   // "LAB" | "LECTURE" | "TUTORIAL"
          group: cs.groupNo ?? '',
          day,
          time,
          location: cs.location ?? '',               // not stored
          lecturer: '',               // not stored
          students,
          sessions: [{
            id: cs.id,
            date: cs.sessionTime.toISOString().split('T')[0],
            attendancePercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
            status: isActive ? 'Ongoing' : 'Completed',
            presentCount,
            absentCount,
          }],
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = session.user.id;

    let body: { code?: string; name?: string; semester?: string; year?: number };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

    const { code, name, semester, year } = body;
    if (!code || !name || !semester || !year) {
      return NextResponse.json({ error: 'code, name, semester, and year are required' }, { status: 400 });
    }

    const unit = await prisma.unit.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });

    const existing = await prisma.unitRegistration.findFirst({
      where: { unitId: unit.id, userId, userStatus: UserStatus.LECTURER },
    });
    if (existing) return NextResponse.json({ ...existing, unit }, { status: 200 });

    const registration = await prisma.unitRegistration.create({
      data: { unitId: unit.id, userId, userStatus: UserStatus.LECTURER, year, semester },
      include: { unit: true },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}