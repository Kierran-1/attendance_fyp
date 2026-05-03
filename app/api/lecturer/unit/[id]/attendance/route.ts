import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, AttendanceStatus } from '@prisma/client';

async function resolveSlot(classSessionId: string, userId: string) {
  const cs = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: { unitRegistration: true },
  });
  if (!cs || cs.unitRegistration.userId !== userId) return null;
  return cs;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const cs = await resolveSlot(id, session.user.id);
  if (!cs) return NextResponse.json({ error: 'Class session not found' }, { status: 404 });

  // All sessions in this slot
  const allSessions = await prisma.classSession.findMany({
    where: {
      unitRegistrationId: cs.unitRegistrationId,
      sessionName: cs.sessionName,
      groupNo: cs.groupNo,
      subcomponent: cs.subcomponent,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  const sessionIds = allSessions.map(s => s.id);
  const now = Date.now();

  // All enrolled students for this slot's scope
  const studentRegs = await prisma.unitRegistration.findMany({
    where: {
      unitId: cs.unitRegistration.unitId,
      userStatus: UserStatus.STUDENT,
      name: cs.subcomponent ?? cs.groupNo ?? null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // All attendance records for these sessions
  const records = await prisma.classAttendanceRecord.findMany({
    where: { classSessionId: { in: sessionIds } },
  });

  return NextResponse.json({
    sessions: allSessions.map((s, i) => {
      const isActive = s.sessionTime !== null && s.sessionDuration !== null &&
        now >= s.sessionTime.getTime() &&
        now <= s.sessionTime.getTime() + s.sessionDuration * 60_000;
      return {
        id: s.id,
        weekNumber: s.weekNumber ?? i + 1,
        day: s.day,
        scheduledDate: s.scheduledDate,
        status: isActive ? 'Ongoing' : s.sessionTime !== null ? 'Completed' : 'Scheduled',
      };
    }),
    students: studentRegs.map(sr => ({
      userId: sr.user.id,
      studentNumber: sr.user.email?.split('@')[0] ?? '—',
      name: sr.user.name ?? 'Unknown',
    })),
    records: records.map(r => ({
      id: r.id,
      sessionId: r.classSessionId,
      userId: r.studentId,
      status: r.status,
    })),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const cs = await resolveSlot(id, session.user.id);
  if (!cs) return NextResponse.json({ error: 'Class session not found' }, { status: 404 });

  let body: { sessionId?: string; userId?: string; status?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { sessionId, userId: studentUserId, status } = body;
  if (!sessionId || !studentUserId || !status) {
    return NextResponse.json({ error: 'sessionId, userId, and status are required' }, { status: 400 });
  }

  if (!Object.values(AttendanceStatus).includes(status as AttendanceStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Verify the session belongs to this slot
  const targetSession = await prisma.classSession.findFirst({
    where: { id: sessionId, unitRegistrationId: cs.unitRegistrationId },
  });
  if (!targetSession) return NextResponse.json({ error: 'Session not found in this class' }, { status: 404 });

  const record = await prisma.classAttendanceRecord.upsert({
    where: { classSessionId_studentId: { classSessionId: sessionId, studentId: studentUserId } },
    create: {
      classSessionId: sessionId,
      studentId: studentUserId,
      status: status as AttendanceStatus,
      verifiedAt: new Date(),
    },
    update: {
      status: status as AttendanceStatus,
      verifiedAt: new Date(),
    },
  });

  return NextResponse.json({ record: { id: record.id, sessionId: record.classSessionId, userId: record.studentId, status: record.status } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== UserRole.LECTURER) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const cs = await resolveSlot(id, session.user.id);
  if (!cs) return NextResponse.json({ error: 'Class session not found' }, { status: 404 });

  let body: { sessionId?: string; userId?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { sessionId, userId: studentUserId } = body;
  if (!sessionId || !studentUserId) {
    return NextResponse.json({ error: 'sessionId and userId are required' }, { status: 400 });
  }

  await prisma.classAttendanceRecord.deleteMany({
    where: { classSessionId: sessionId, studentId: studentUserId },
  });

  return NextResponse.json({ success: true });
}
