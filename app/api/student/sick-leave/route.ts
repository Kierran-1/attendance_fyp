import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configure file upload settings
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const UPLOAD_DIR = 'uploads/sick-leave';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated and is a student
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit sick leave' }, { status: 403 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const attendanceRecordId = formData.get('attendanceRecordId') as string;
    const reason = formData.get('reason') as string || 'Sick leave request';
    const classSessionId = formData.get('classSessionId') as string;

    // 3. Validate required fields
    if (!file || !attendanceRecordId || !classSessionId) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, attendanceRecordId, classSessionId' 
      }, { status: 400 });
    }

    // 4. Validate file type and size
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: PDF, JPEG, PNG, JPG' 
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // 5. Verify attendance record exists and belongs to the student
    const attendanceRecord = await prisma.classAttendanceRecord.findFirst({
      where: {
        id: attendanceRecordId,
        studentId: user.id,
        classSessionId: classSessionId
      },
      include: {
        classSession: {
          include: {
            unitRegistration: true
          }
        }
      }
    });

    if (!attendanceRecord) {
      return NextResponse.json({ 
        error: 'Attendance record not found or does not belong to you' 
      }, { status: 404 });
    }

    // 6. Check if evidence already exists for this attendance record
    const existingEvidence = await prisma.attendanceEvidence.findFirst({
      where: { attendanceRecordId: attendanceRecordId }
    });

    if (existingEvidence) {
      return NextResponse.json({ 
        error: 'Sick leave already submitted for this attendance record' 
      }, { status: 400 });
    }

    // 7. Save file to disk
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExtension}`;
    const uploadPath = path.join(process.cwd(), 'public', UPLOAD_DIR, fileName);
    
    // Ensure directory exists
    await mkdir(path.dirname(uploadPath), { recursive: true });
    await writeFile(uploadPath, fileBuffer);
    
    // Generate public URL
    const fileUrl = `/${UPLOAD_DIR}/${fileName}`;

    // 8. Create attendance evidence record
    const evidence = await prisma.attendanceEvidence.create({
      data: {
        attendanceRecordId: attendanceRecordId,
        uploadedBy: user.id,
        fileUrl: fileUrl,
        fileName: file.name,
        reason: reason,
        status: 'PENDING',
        lecturerComment: null,
        reviewedBy: null,
        reviewedAt: null
      }
    });

    // 9. (Optional) Update attendance record status to PENDING if needed
    if (attendanceRecord.status === 'ABSENT') {
      await prisma.classAttendanceRecord.update({
        where: { id: attendanceRecordId },
        data: { status: 'PENDING' }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sick leave submitted successfully',
      evidence: {
        id: evidence.id,
        fileUrl: evidence.fileUrl,
        fileName: evidence.fileName,
        status: evidence.status,
        uploadedAt: evidence.uploadedAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Sick leave submission error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET endpoint to fetch student's sick leave history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const attendanceRecordId = searchParams.get('attendanceRecordId');

    const whereClause: any = {
      attendanceRecord: {
        studentId: user.id
      }
    };

    if (attendanceRecordId) {
      whereClause.attendanceRecordId = attendanceRecordId;
    }

    const sickLeaveRecords = await prisma.attendanceEvidence.findMany({
      where: whereClause,
      include: {
        attendanceRecord: {
          include: {
            classSession: {
              include: {
                unitRegistration: {
                  include: {
                    unit: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: sickLeaveRecords
    });

  } catch (error) {
    console.error('Fetch sick leave error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}