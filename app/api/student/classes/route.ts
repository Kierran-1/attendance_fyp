import { NextResponse } from 'next/server';
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

    if (session.user.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    const studentRegistrations = await prisma.unitRegistration.findMany({
      where: { userId, userStatus: UserStatus.STUDENT },
      include: { unit: true },
    });

    if (studentRegistrations.length === 0) {
      return NextResponse.json({ classes: [] });
    }

    const unitIds = studentRegistrations.map((r) => r.unitId);

    // Find lecturer registrations for the same units to get ClassSessions
    const lecturerRegistrations = await prisma.unitRegistration.findMany({
      where: { unitId: { in: unitIds }, userStatus: UserStatus.LECTURER },
      select: { id: true, unitId: true },
    });

    const lecturerRegIds = lecturerRegistrations.map((r) => r.id);

    // Get all class sessions for those lecturer registrations
    const allSessions = await prisma.classSession.findMany({
      where: {
        unitRegistrationId: { in: lecturerRegIds },
        sessionTime: { lte: new Date() },
      },
      select: {
        id: true,
        unitRegistration: { select: { unitId: true } },
      },
    });

    // Count total sessions per unit
    const sessionsByUnit = new Map<string, string[]>();
    for (const s of allSessions) {
      const uid = s.unitRegistration.unitId;
      if (!sessionsByUnit.has(uid)) sessionsByUnit.set(uid, []);
      sessionsByUnit.get(uid)!.push(s.id);
    }

    const allSessionIds = allSessions.map((s) => s.id);

    // Count attendance records for this student across all sessions
    const attendedRecords = await prisma.classAttendanceRecord.findMany({
      where: {
        studentId: userId,
        classSessionId: { in: allSessionIds },
        status: { not: 'ABSENT' },
      },
      select: { classSessionId: true },
    });

    const attendedSessionIds = new Set(attendedRecords.map((r) => r.classSessionId));

    // Build per-unit attendance counts
    const attendedByUnit = new Map<string, number>();
    for (const s of allSessions) {
      const uid = s.unitRegistration.unitId;
      if (attendedSessionIds.has(s.id)) {
        attendedByUnit.set(uid, (attendedByUnit.get(uid) ?? 0) + 1);
      }
    }

    const classes = studentRegistrations.map((reg) => {
      const total = sessionsByUnit.get(reg.unitId)?.length ?? 0;
      const attended = attendedByUnit.get(reg.unitId) ?? 0;
      const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

      return {
        id: reg.unit.id,
        code: reg.unit.code,
        name: reg.unit.name,
        lecturer: null,
        day: null,
        time: null,
        venue: null,
        sessionType: null,
        attendanceRate,
      };
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('[STUDENT_CLASSES_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
