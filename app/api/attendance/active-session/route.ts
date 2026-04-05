import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;
  const now = new Date();

  // ── Student: find an active session for any unit they are enrolled in ────────
  if (role === UserRole.STUDENT) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        unitEnrollments: {
          select: { unitId: true },   // ← was courseId
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ session: null });
    }

    const unitIds = studentProfile.unitEnrollments.map((e) => e.unitId);

    if (unitIds.length === 0) {
      return NextResponse.json({ session: null });
    }

    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        unitId: { in: unitIds },      // ← was courseId
        isActive: true,
        startTime: { lte: now },
        endTime:   { gte: now },
      },
      include: {
        unit: {                        // ← was "course" relation
          select: { code: true, name: true, venue: true },
        },
      },
    });

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id:          activeSession.id,
        unitId:      activeSession.unitId,        // ← was courseId
        unit:        activeSession.unit,          // ← was course
        classType:   activeSession.classType,     // ← was sessionType
        startTime:   activeSession.startTime,
        endTime:     activeSession.endTime,
      },
    });
  }

  // ── Lecturer: return all their active sessions ────────────────────────────────
  if (role === UserRole.LECTURER) {
    const lecturerProfile = await prisma.lecturerProfile.findUnique({
      where: { userId },
    });

    if (!lecturerProfile) {
      return NextResponse.json({ sessions: [] });
    }

    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        lecturerId: lecturerProfile.id,
        isActive:   true,
        startTime:  { lte: now },
        endTime:    { gte: now },
      },
      include: {
        unit: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json({
      sessions: activeSessions.map((s) => ({
        id:        s.id,
        unitId:    s.unitId,       // ← was courseId
        unit:      s.unit,
        classType: s.classType,    // ← was sessionType
        startTime: s.startTime,
        endTime:   s.endTime,
      })),
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}