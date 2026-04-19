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

    // Group ClassSessions by slot (sessionName + groupNo + subcomponent) so the UI
    // shows one card per class group, with all 12 weekly sessions nested inside.
    const result: any[] = [];

    for (const reg of lecturerRegistrations) {
      // Group sessions by their slot key
      const slotMap = new Map<string, typeof reg.classSessions>();
      for (const cs of reg.classSessions) {
        const key = `${cs.sessionName}:${cs.groupNo ?? ''}:${cs.subcomponent ?? ''}`;
        if (!slotMap.has(key)) slotMap.set(key, []);
        slotMap.get(key)!.push(cs);
      }

      for (const slotSessions of slotMap.values()) {
        const first = slotSessions[0];

        // Fetch students scoped to this slot's scopeKey (e.g. "LA1-01")
        const studentRegistrations = await prisma.unitRegistration.findMany({
          where: {
            unitId: reg.unitId,
            userStatus: UserStatus.STUDENT,
            name: first.subcomponent ?? first.groupNo ?? null,
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

        const now = Date.now();

        const padTime = (h: number, m: number) =>
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const startH = first.scheduledDate?.getHours() ?? 0;
        const startM = first.scheduledDate?.getMinutes() ?? 0;
        const time = first.scheduledDate ? padTime(startH, startM) : '—';

        const sessions = slotSessions
          .sort((a, b) => (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0))
          .map((cs) => {
            const present = cs.attendanceRecords.filter(
              (r) => r.status === 'PRESENT' || r.status === 'LATE'
            ).length;
            const absent = cs.attendanceRecords.filter((r) => r.status === 'ABSENT').length;
            const total = cs.attendanceRecords.length;
            const isActive = cs.sessionTime !== null && cs.sessionDuration !== null &&
              now >= cs.sessionTime.getTime() &&
              now <= cs.sessionTime.getTime() + cs.sessionDuration * 60_000;
            const status = isActive ? 'Ongoing' : (cs.sessionTime !== null ? 'Completed' : 'Scheduled');
            return {
              id: cs.id,
              date: cs.scheduledDate?.toISOString().split('T')[0] ?? '—',
              attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
              status,
              presentCount: present,
              absentCount: absent,
            };
          });

        result.push({
          id: first.id,               // unique per slot (first session's id)
          unitRegistrationId: reg.id,
          unitId: reg.unitId,
          unitCode: reg.unit.code,
          unitName: reg.unit.name,
          semester: reg.semester,
          year: reg.year,
          classType: first.sessionName,
          group: first.groupNo ?? '',
          subcomponent: first.subcomponent ?? '',
          day: first.day ?? '',
          time,
          location: first.location ?? '',
          lecturer: '',
          students,
          sessions,
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