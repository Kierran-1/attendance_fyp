import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus, UserRole } from '@prisma/client';
import { getSupabaseAdmin } from '@/lib/supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    const [absentRecords, evidenceRecords] = await Promise.all([
      prisma.classAttendanceRecord.findMany({
        where: { studentId: userId, status: AttendanceStatus.ABSENT },
        include: {
          classSession: {
            include: {
              unitRegistration: { include: { unit: true } },
            },
          },
          evidence: {
            where: { uploadedBy: userId },
            take: 1,
            orderBy: { uploadedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendanceEvidence.findMany({
        where: { uploadedBy: userId },
        include: {
          attendanceRecord: {
            include: {
              classSession: {
                include: {
                  unitRegistration: { include: { unit: true } },
                },
              },
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      absentSessions: absentRecords.map((r) => ({
        attendanceRecordId: r.id,
        unitCode: r.classSession.unitRegistration.unit.code,
        unitName: r.classSession.unitRegistration.unit.name,
        sessionName: r.classSession.sessionName,
        sessionDate: r.classSession.sessionTime?.toISOString() ?? null,
        sessionDay: r.classSession.day,
        sessionWeek: r.classSession.weekNumber,
        existingSubmission: r.evidence[0]
          ? { id: r.evidence[0].id, status: r.evidence[0].status }
          : null,
      })),
      submissions: evidenceRecords.map((e) => ({
        id: e.id,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        reason: e.reason,
        status: e.status,
        lecturerComment: e.lecturerComment,
        reviewedAt: e.reviewedAt?.toISOString() ?? null,
        uploadedAt: e.uploadedAt.toISOString(),
        unitCode: e.attendanceRecord.classSession.unitRegistration.unit.code,
        unitName: e.attendanceRecord.classSession.unitRegistration.unit.name,
        sessionName: e.attendanceRecord.classSession.sessionName,
        sessionDate: e.attendanceRecord.classSession.sessionTime?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error('[STUDENT_ABSENCE_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
    }

    const attendanceRecordId = formData.get('attendanceRecordId') as string | null;
    const reason = (formData.get('reason') as string | null)?.trim();
    const file = formData.get('file') as File | null;

    if (!attendanceRecordId || !reason) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPG, PNG, and WEBP are accepted.' },
        { status: 400 }
      );
    }

    const record = await prisma.classAttendanceRecord.findFirst({
      where: { id: attendanceRecordId, studentId: userId },
    });
    if (!record) {
      return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
    }
    if (record.status !== AttendanceStatus.ABSENT) {
      return NextResponse.json(
        { error: 'You can only submit absence documents for sessions marked as Absent.' },
        { status: 400 }
      );
    }

    const existing = await prisma.attendanceEvidence.findFirst({
      where: {
        attendanceRecordId,
        uploadedBy: userId,
        status: { not: 'REJECTED' },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An active submission already exists for this session.' },
        { status: 409 }
      );
    }

    const supabase = getSupabaseAdmin();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'pdf';
    const storagePath = `${userId}/${attendanceRecordId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('absence-documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('[STUDENT_ABSENCE_UPLOAD]', uploadError);
      return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('absence-documents')
      .getPublicUrl(storagePath);

    const evidence = await prisma.attendanceEvidence.create({
      data: {
        attendanceRecordId,
        uploadedBy: userId,
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        reason,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ submission: evidence }, { status: 201 });
  } catch (error) {
    console.error('[STUDENT_ABSENCE_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
