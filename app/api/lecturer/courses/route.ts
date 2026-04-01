import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth'; 

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lecturer = await prisma.lecturerProfile.findFirst({
      where: { user: { email: session.user.email } },
      include: {
        user: true, // ✅ Added - needed for lecturer.user.name below
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
      LECTURE: 'LE',
      TUTORIAL: 'TU',
      LAB: 'LA',
      PRACTICAL: 'PR',
    };

    const transformedCourses = lecturer.courses.map(course => {
      const uniqueStudents = new Map<string, object>();

      course.enrollments.forEach(enrollment => {
        const student = enrollment.student;
        if (!uniqueStudents.has(student.studentId)) {
          uniqueStudents.set(student.studentId, {
            id: student.id,
            studentNumber: student.studentId,
            name: student.user.name ?? 'Unknown',
            program: student.major ?? 'Unknown',
            nationality: '',
            schoolStatus: 'Active',
          });
        }
      });

      const sessions = course.attendanceSessions.map(s => {
        const records = s.attendanceRecords;
        const presentCount  = records.filter(r => r.status === 'PRESENT').length;
        const absentCount   = records.filter(r => r.status === 'ABSENT').length;
        const lateCount     = records.filter(r => r.status === 'LATE').length;
        const excusedCount  = records.filter(r => r.status === 'EXCUSED').length;
        const total         = records.length;

        return {
          id: s.id,
          date: s.startTime.toISOString().split('T')[0],
          attendancePercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
          status: s.isActive ? 'Ongoing' : 'Completed',
          presentCount,
          absentCount,
          lateCount,
          sickCount: excusedCount,
        };
      });

      return {
        id: course.id,
        unitCode: course.code,
        unitName: course.name,
        day: course.scheduleDay ?? 'TBA',
        time: course.scheduleTime ?? 'TBA',
        location: course.venue ?? 'TBA',
        lecturer: lecturer.user.name ?? '',
        classType: classTypeMap[course.sessionType] ?? course.sessionType,
        group: course.classGroup ?? '01',
        term: course.semester,
        students: Array.from(uniqueStudents.values()),
        sessions,
        createdAt: course.createdAt.toISOString().split('T')[0],
      };
    });

    return NextResponse.json(transformedCourses);
  } catch (error) {
    console.error('Error fetching lecturer courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
<<<<<<< HEAD

  return NextResponse.json({
    courses: profile.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      semester: c.semester,
      year: c.year,
      sessionType: c.sessionType,
      venue: c.venue,
      scheduleDay: c.scheduleDay,
      scheduleTime: c.scheduleTime,
      enrollmentCount: c._count.enrollments,
    })),
  });
=======
>>>>>>> 4066a64542b4437794186610f7e1f1c0b5d83f7f
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

    const course = await prisma.course.create({
      data: {
        code:         body.code,
        name:         body.name,
        semester:     body.semester,
        year:         body.year,
        capacity:     body.capacity,
        sessionType:  body.sessionType,
        classGroup:   body.classGroup,
        scheduleDay:  body.scheduleDay,
        scheduleTime: body.scheduleTime,
        venue:        body.venue,
        lecturerId:   lecturer.id,
      },
    });

    return NextResponse.json(course, { status: 201 }); // ✅ 201 for resource creation
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}