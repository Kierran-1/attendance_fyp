import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    const lecturerRegistrations = await prisma.unitRegistration.findMany({
      where: { userId, userStatus: UserStatus.LECTURER },
      include: {
        unit: true,
        classSessions: {
          include: {
            attendanceRecords: {
              select: { studentId: true, status: true },
            },
          },
        },
      },
    });

    const result = await Promise.all(
      lecturerRegistrations.map(async (reg) => {
        const studentRegistrations = await prisma.unitRegistration.findMany({
          where: { unitId: reg.unitId, userStatus: UserStatus.STUDENT },
          include: {
            user: { select: { id: true, name: true, email: true, programName: true } },
          },
        });

        const students = studentRegistrations.map((sr) => ({
          id: sr.id,
          studentNumber: sr.user.email?.split('@')[0] ?? '—',
          name: sr.user.name ?? 'Unknown',
          program: sr.user.programName ?? '',
        }));

        const sessions = reg.classSessions.map((cs) => {
          const presentCount = cs.attendanceRecords.filter(
            (r) => r.status === 'PRESENT' || r.status === 'LATE'
          ).length;
          const absentCount = cs.attendanceRecords.filter(
            (r) => r.status === 'ABSENT'
          ).length;
          const total = cs.attendanceRecords.length;
          const now = Date.now();
          const end = cs.sessionTime.getTime() + cs.sessionDuration * 60_000;
          const isActive = now >= cs.sessionTime.getTime() && now <= end;

          return {
            id: cs.id,
            date: cs.sessionTime.toISOString().split('T')[0],
            attendancePercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
            status: isActive ? 'Ongoing' : 'Completed',
            presentCount,
            absentCount,
          };
        });

        return {
          id: reg.id,
          unitId: reg.unitId,
          unitCode: reg.unit.code,
          unitName: reg.unit.name,
          semester: reg.semester,
          year: reg.year,
          students,
          sessions,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    let body: { code?: string; name?: string; semester?: string; year?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { code, name, semester, year } = body;

    if (!code || !name || !semester || !year) {
      return NextResponse.json(
        { error: 'code, name, semester, and year are required' },
        { status: 400 }
      );
    }

    // Upsert unit by code
    const unit = await prisma.unit.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });

    // Create UnitRegistration(LECTURER) if not exists
    const existing = await prisma.unitRegistration.findUnique({
      where: { unitId_userId: { unitId: unit.id, userId } },
    });

    if (existing) {
      return NextResponse.json({ ...existing, unit }, { status: 200 });
    }

    const registration = await prisma.unitRegistration.create({
      data: {
        unitId: unit.id,
        userId,
        userStatus: UserStatus.LECTURER,
        year,
        semester,
      },
      include: { unit: true },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}
