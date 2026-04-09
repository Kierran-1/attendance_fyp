import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus, UserRole, UserStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { sessionId?: string; bulkStudents?: boolean };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { sessionId, bulkStudents } = body;
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  const classSession = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { unitRegistration: true },
  });
  if (!classSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const unitId = classSession.unitRegistration.unitId;
  const now = new Date();
  const year = new Date().getFullYear();
  const semester = 'DEV';

  // ── Bulk mode: create fake students and mark attendance ──────────────────
  if (bulkStudents) {
    const fakeStudents = [
      { email: 'dev-s1@students.swinburne.edu.my', name: 'Ahmad Faris' },
      { email: 'dev-s2@students.swinburne.edu.my', name: 'Nur Aisyah' },
      { email: 'dev-s3@students.swinburne.edu.my', name: 'Lee Wen Hao' },
      { email: 'dev-s4@students.swinburne.edu.my', name: 'Priya Nair' },
      { email: 'dev-s5@students.swinburne.edu.my', name: 'Brandon Lim' },
      { email: 'dev-s6@students.swinburne.edu.my', name: 'Alya Sofia' },
      { email: 'dev-s7@students.swinburne.edu.my', name: 'Muhammad Danish' },
      { email: 'dev-s8@students.swinburne.edu.my', name: 'Chloe Ting' },
    ];

    const errors: string[] = [];
    let present = 0;

    for (let i = 0; i < fakeStudents.length; i++) {
      const s = fakeStudents[i];
      try {
        // 1. Upsert the user
        const user = await prisma.user.upsert({
          where: { email: s.email },
          update: { name: s.name },
          create: { email: s.email, name: s.name, role: UserRole.STUDENT },
        });

        // 2. Enroll in unit — use findFirst + create to avoid null unique key issue
        const existing = await prisma.unitRegistration.findFirst({
          where: { unitId, userId: user.id, userStatus: UserStatus.STUDENT },
        });
        if (!existing) {
          await prisma.unitRegistration.create({
            data: { unitId, userId: user.id, userStatus: UserStatus.STUDENT, year, semester },
          });
        }

        // 3. Mark 6 present, 2 absent
        if (i < 6) {
          await prisma.classAttendanceRecord.upsert({
            where: { classSessionId_studentId: { classSessionId: sessionId, studentId: user.id } },
            update: { status: AttendanceStatus.PRESENT, verifiedAt: now },
            create: { classSessionId: sessionId, studentId: user.id, status: AttendanceStatus.PRESENT, verifiedAt: now },
          });
          present++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${s.name}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      created: fakeStudents.length,
      present,
      absent: fakeStudents.length - present,
      errors,
    });
  }

  // ── Single mode: mark current user as present ────────────────────────────
  try {
    await prisma.classAttendanceData.create({
      data: {
        classSessionId: sessionId,
        scanPayload: { simulatedBy: session.user.id, timestamp: now.toISOString() },
        scanMethod: 'DEV_SIMULATE',
        verificationStage: 'VERIFIED',
      },
    });

    const record = await prisma.classAttendanceRecord.upsert({
      where: { classSessionId_studentId: { classSessionId: sessionId, studentId: session.user.id } },
      update: { status: AttendanceStatus.PRESENT, verifiedAt: now },
      create: { classSessionId: sessionId, studentId: session.user.id, status: AttendanceStatus.PRESENT, verifiedAt: now },
    });

    return NextResponse.json({ success: true, record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
