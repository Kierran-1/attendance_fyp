import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ClassType } from '@prisma/client';
import crypto from 'crypto';

// DEV ONLY — seeds 3 courses, 15 students, 8 weeks of sessions, and varied attendance records.
// Idempotent: re-running will skip session creation if sessions already exist.

const STUDENTS = [
  { name: 'Ahmad Hakim bin Abdullah',    studentId: '103210001', email: 'dev.student1@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Priya Nair',                  studentId: '103210002', email: 'dev.student2@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Lee Wei Jian',                studentId: '103210003', email: 'dev.student3@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Siti Rahmah binti Osman',     studentId: '103210004', email: 'dev.student4@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'James Tan Ah Kow',            studentId: '103210005', email: 'dev.student5@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Nurul Izzati binti Malik',    studentId: '103210006', email: 'dev.student6@swinburne.edu.my',  major: 'Bachelor of Engineering (Honours) (Robotics and Mechatronics) / Bachelor of Computer Science' },
  { name: 'Kevin Lim Boon Seng',         studentId: '103210007', email: 'dev.student7@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Ainul Mardhiah binti Hassan', studentId: '103210008', email: 'dev.student8@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Raj Kumar s/o Muthu',         studentId: '103210009', email: 'dev.student9@swinburne.edu.my',  major: 'Bachelor of Computer Science' },
  { name: 'Chua Hui Ling',               studentId: '103210010', email: 'dev.student10@swinburne.edu.my', major: 'Bachelor of Computer Science' },
  { name: 'Muhammad Hafiz bin Ramli',    studentId: '103210011', email: 'dev.student11@swinburne.edu.my', major: 'Bachelor of Information Systems' },
  { name: 'Stephanie Wong Mei Lin',      studentId: '103210012', email: 'dev.student12@swinburne.edu.my', major: 'Bachelor of Computer Science' },
  { name: 'Abdullah bin Yusof',          studentId: '103210013', email: 'dev.student13@swinburne.edu.my', major: 'Bachelor of Information Systems' },
  { name: 'Tan Shu Min',                 studentId: '103210014', email: 'dev.student14@swinburne.edu.my', major: 'Bachelor of Computer Science' },
  { name: 'Amelia Josephine',            studentId: '103210015', email: 'dev.student15@swinburne.edu.my', major: 'Bachelor of Computer Science' },
];

// Attendance rate per student (index 0-14): first 10 are good, last 5 are at-risk
const ATTENDANCE_RATES = [0.92, 0.88, 0.95, 0.85, 0.90, 0.88, 0.92, 0.85, 0.90, 0.88, 0.62, 0.55, 0.68, 0.40, 0.35];

const COURSES_DATA = [
  { code: 'COS40005', name: 'Computing Technology Project',    semester: 'Sem 1', year: 2026, capacity: 40, classType: ClassType.LECTURE, classGroup: '01', scheduleDay: 'Tue', scheduleTime: '13:00 - 15:00', venue: 'G603' },
  { code: 'COS20019', name: 'Web Technology',                  semester: 'Sem 1', year: 2026, capacity: 60, classType: ClassType.LECTURE, classGroup: '01', scheduleDay: 'Mon', scheduleTime: '09:00 - 11:00', venue: 'G501' },
  { code: 'COS30049', name: 'Computing Technology Innovation', semester: 'Sem 1', year: 2026, capacity: 50, classType: ClassType.LECTURE, classGroup: '02', scheduleDay: 'Wed', scheduleTime: '11:00 - 13:00', venue: 'G602' },
];

// Which student indices are enrolled per course
const COURSE_ENROLLMENTS = [
  Array.from({ length: 15 }, (_, i) => i),     // All 15
  Array.from({ length: 12 }, (_, i) => i),     // First 12
  Array.from({ length: 10 }, (_, i) => i + 5), // Students 5–14
];

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Ensure current user is a lecturer
  await prisma.user.update({ where: { id: userId }, data: { role: 'LECTURER' } });
  const lecturerProfile = await prisma.lecturerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, department: 'Computing' },
  });

  // Create/upsert courses
  const courseRecords = [];
  for (const c of COURSES_DATA) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: { lecturer: { connect: { id: lecturerProfile.id } }, name: c.name },
      create: { ...c, lecturer: { connect: { id: lecturerProfile.id } } },
    });
    courseRecords.push(course);
  }

  // Create student users and profiles
  const studentProfiles: { id: string; userId: string }[] = [];
  for (const s of STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name },
      create: { email: s.email, name: s.name, role: 'STUDENT' },
    });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { major: s.major },
      create: { userId: user.id, studentId: s.studentId, major: s.major, enrollmentYear: 2023 },
    });
    studentProfiles.push({ id: profile.id, userId: user.id });
  }

  // Enroll students in courses
  for (let ci = 0; ci < courseRecords.length; ci++) {
    const course = courseRecords[ci];
    for (const idx of COURSE_ENROLLMENTS[ci]) {
      await prisma.courseEnrollment.upsert({
        where: { studentId_courseId: { studentId: studentProfiles[idx].id, courseId: course.id } },
        update: {},
        create: { studentId: studentProfiles[idx].id, courseId: course.id },
      });
    }
  }

  // Create past sessions only if none exist yet
  const existingCount = await prisma.attendanceSession.count({
    where: { lecturerId: lecturerProfile.id, isActive: false },
  });

  let sessionsCreated = 0;

  if (existingCount === 0) {
    const WEEKS = 8;

    for (let ci = 0; ci < courseRecords.length; ci++) {
      const course = courseRecords[ci];
      const studentIdxs = COURSE_ENROLLMENTS[ci];

      for (let w = WEEKS; w >= 1; w--) {
        const sessionStart = new Date();
        sessionStart.setDate(sessionStart.getDate() - w * 7 + ci); // Stagger by course
        sessionStart.setHours(9 + ci * 2, 0, 0, 0);
        const sessionEnd = new Date(sessionStart.getTime() + 2 * 60 * 60 * 1000);

        const attendanceSession = await prisma.attendanceSession.create({
          data: {
            courseId: course.id,
            lecturerId: lecturerProfile.id,
            sessionType: 'LECTURE',
            qrCode: crypto.randomUUID(),
            startTime: sessionStart,
            endTime: sessionEnd,
            isActive: false,
          },
        });
        sessionsCreated++;

        for (const idx of studentIdxs) {
          const student = studentProfiles[idx];
          if (Math.random() < ATTENDANCE_RATES[idx]) {
            try {
              await prisma.attendanceRecord.create({
                data: {
                  userId: student.userId,
                  sessionId: attendanceSession.id,
                  checkInTime: new Date(sessionStart.getTime() + Math.floor(Math.random() * 600_000)),
                  recognitionMethod: 'QR_CODE',
                  status: 'PRESENT',
                },
              });
            } catch {
              // Skip duplicate
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Done — ${courseRecords.length} courses, ${studentProfiles.length} students, ${sessionsCreated} sessions created (${existingCount > 0 ? 'sessions already existed, skipped' : 'fresh seed'})`,
  });
}
