// app/api/lecturer/unit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { SessionType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lecturer = await prisma.lecturerProfile.findFirst({
      where: { user: { email: session.user.email } },
      include: {
        user: true,
        courses: {
          include: {
            enrollments: {
              include: {
                student: {
                  include: { user: true },
                },
              },
            },
            attendanceSessions: {
              include: { attendanceRecords: true },
            },
          },
        },
      },
    });

    if (!lecturer) {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    }

    const classTypeMap: Record<string, string> = {
      LECTURE:   'LE',
      TUTORIAL:  'TU',
      LAB:       'LA',
      PRACTICAL: 'PR',
    };

    const transformedUnits = lecturer.courses.map(unit => {
      const uniqueStudents = new Map<string, object>();

      unit.enrollments.forEach(enrollment => {
        const student = enrollment.student;
        if (!uniqueStudents.has(student.studentId)) {
          uniqueStudents.set(student.studentId, {
            id:            student.id,
            studentNumber: student.studentId,
            name:          student.user.name    ?? 'Unknown',
            program:       student.major        ?? '',
            nationality:   student.nationality  ?? '',       // ← read from DB
            schoolStatus:  student.schoolStatus ?? 'Active', // ← read from DB
          });
        }
      });

      const sessions = unit.attendanceSessions.map(s => {
        const records      = s.attendanceRecords;
        const presentCount = records.filter(r => r.status === 'PRESENT').length;
        const absentCount  = records.filter(r => r.status === 'ABSENT').length;
        const lateCount    = records.filter(r => r.status === 'LATE').length;
        const excusedCount = records.filter(r => r.status === 'EXCUSED').length;
        const total        = records.length;

        return {
          id:                   s.id,
          date:                 s.startTime.toISOString().split('T')[0],
          attendancePercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
          status:               s.isActive ? 'Ongoing' : 'Completed',
          presentCount,
          absentCount,
          lateCount,
          sickCount: excusedCount,
        };
      });

      return {
        id:        unit.id,
        unitCode:  unit.code,
        unitName:  unit.name,
        day:       unit.scheduleDay  ?? 'TBA',
        time:      unit.scheduleTime ?? 'TBA',
        location:  unit.venue        ?? 'TBA',
        lecturer:  lecturer.user.name ?? '',
        classType: classTypeMap[unit.classType] ?? unit.classType,
        group:     unit.classGroup ?? '01',
        term:      unit.semester,
        students:  Array.from(uniqueStudents.values()),
        sessions,
        createdAt: unit.createdAt.toISOString().split('T')[0],
      };
    });

    return NextResponse.json(transformedUnits);
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lecturer = await prisma.lecturerProfile.findFirst({
      where: { user: { email: session.user.email } },
    });

    if (!lecturer) {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    }

    const body = await request.json();

    const VALID_TYPES = ['LECTURE', 'TUTORIAL', 'LAB', 'PRACTICAL'] as const;
    const rawType = (body.classType ?? body.sessionType ?? '').toUpperCase();
    const classType: SessionType = (
      VALID_TYPES.includes(rawType as (typeof VALID_TYPES)[number]) ? rawType : 'LECTURE'
    ) as SessionType;

    const unit = await prisma.unit.create({
      data: {
        code:         body.code,
        name:         body.name,
        semester:     body.semester,
        year:         body.year         ?? new Date().getFullYear(),
        capacity:     body.capacity     ?? 999,
        classType,
        classGroup:   body.classGroup   ?? null,
        scheduleDay:  body.scheduleDay  ?? null,
        scheduleTime: body.scheduleTime ?? null,
        venue:        body.venue        ?? null,
        lecturerId:   lecturer.id,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}