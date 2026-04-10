import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

type ProfileResponse = {
  studentId?: string;
  program?: string;
};

type StudentClass = {
  id: string;
  code: string;
  name: string;
  attendanceRate?: number | null;
};

type ClassesResponse = {
  classes?: StudentClass[];
};

type AttendanceRecord = {
  sessionId: string;
  date: string;
  unitId: string;
  courseCode: string;
  courseName: string;
  sessionName: string;
  sessionTime: string;
  checkInTime: string | null;
  status: string;
};

type AttendanceResponse = {
  records?: AttendanceRecord[];
};

function buildBaseUrl(req: NextRequest) {
  const host = req.headers.get('host');
  const protocol =
    process.env.NODE_ENV === 'development' ? 'http' : 'https';

  return `${protocol}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const baseUrl = buildBaseUrl(req);
    const cookie = req.headers.get('cookie') ?? '';

    const [profileRes, classesRes, attendanceRes] = await Promise.all([
      fetch(`${baseUrl}/api/student/profile?basic=1`, {
        headers: { cookie },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/student/classes`, {
        headers: { cookie },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/student/attendance`, {
        headers: { cookie },
        cache: 'no-store',
      }),
    ]);

    const profileJson: ProfileResponse = profileRes.ok
      ? await profileRes.json()
      : {};

    const classesJson: ClassesResponse = classesRes.ok
      ? await classesRes.json()
      : { classes: [] };

    const attendanceJson: AttendanceResponse = attendanceRes.ok
      ? await attendanceRes.json()
      : { records: [] };

    const classes = Array.isArray(classesJson.classes) ? classesJson.classes : [];
    const records = Array.isArray(attendanceJson.records)
      ? attendanceJson.records
      : [];

    const courseMap = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        totalSessions: number;
        attendedSessions: number;
      }
    >();

    for (const cls of classes) {
      courseMap.set(cls.id, {
        id: cls.id,
        code: cls.code,
        name: cls.name,
        totalSessions: 0,
        attendedSessions: 0,
      });
    }

    for (const record of records) {
      const existing = courseMap.get(record.unitId);

      if (!existing) {
        courseMap.set(record.unitId, {
          id: record.unitId,
          code: record.courseCode,
          name: record.courseName,
          totalSessions: 1,
          attendedSessions: record.status === 'ABSENT' ? 0 : 1,
        });
      } else {
        existing.totalSessions += 1;
        if (record.status !== 'ABSENT') {
          existing.attendedSessions += 1;
        }
      }
    }

    const courses = Array.from(courseMap.values()).map((course) => ({
      ...course,
      semester: null,
      year: null,
    }));

    const totalSessions = courses.reduce(
      (sum, item) => sum + item.totalSessions,
      0
    );
    const totalAttended = courses.reduce(
      (sum, item) => sum + item.attendedSessions,
      0
    );
    const totalAbsent = Math.max(totalSessions - totalAttended, 0);
    const overallPct =
      totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : null;

    const recentAttendance = records.slice(0, 5).map((record) => ({
      sessionId: record.sessionId,
      date: record.date,
      courseCode: record.courseCode,
      courseName: record.courseName,
      sessionName: record.sessionName,
      checkInTime: record.checkInTime ?? null,
      status: record.status ?? 'ABSENT',
    }));

    return NextResponse.json({
      profile: {
        studentId: profileJson.studentId ?? '',
        programName: profileJson.program ?? null,
      },
      courses,
      recentAttendance,
      stats: {
        overallPct,
        enrolledCourses: courses.length,
        totalAbsent,
      },
    });
  } catch (error) {
    console.error('[STUDENT_DASHBOARD_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}