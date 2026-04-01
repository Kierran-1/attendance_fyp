// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { SessionType, UserRole } from '@prisma/client';

// type StudentInput = {
//   studentId: string;
//   name: string;
//   major?: string | null;
// };

// type CourseInput = {
//   code: string;
//   name: string;
//   semester: string;
//   sessionType: string;
//   classGroup?: string;
//   scheduleDay?: string;
//   scheduleTime?: string;
//   venue?: string;
// };

// export async function POST(request: NextRequest) {
//   const session = await getServerSession(authOptions);

//   if (!session?.user?.id) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }

//   if (session.user.role !== UserRole.LECTURER) {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//   }

//   const lecturerProfile = await prisma.lecturerProfile.findUnique({
//     where: { userId: session.user.id },
//   });

//   if (!lecturerProfile) {
//     return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 });
//   }

//   let body: { course: CourseInput; students: StudentInput[] };
//   try {
//     body = await request.json();
//   } catch {
//     return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
//   }

//   const { course: courseInput, students } = body;

//   if (!courseInput?.code || !courseInput?.name || !Array.isArray(students)) {
//     return NextResponse.json({ error: 'course.code, course.name, and students are required' }, { status: 400 });
//   }

//   const rawType = (courseInput.sessionType || '').toUpperCase();
//   const classType: SessionType = (['LECTURE', 'TUTORIAL', 'LAB', 'PRACTICAL'].includes(rawType)
//     ? rawType
//     : 'LECTURE') as SessionType;

//   // Upsert unit under this lecturer
//   const course = await prisma.unit.upsert({
//     where: { code_classGroup_lecturerId: { code: courseInput.code, classGroup: courseInput.classGroup ?? '', lecturerId: lecturerProfile.id } },
//     update: {
//       name: courseInput.name,
//       semester: courseInput.semester,
//       classType,
//       classGroup: courseInput.classGroup ?? null,
//       scheduleDay: courseInput.scheduleDay ?? null,
//       scheduleTime: courseInput.scheduleTime ?? null,
//       venue: courseInput.venue ?? null,
//       lecturer: { connect: { id: lecturerProfile.id } },
//     },
//     create: {
//       code: courseInput.code,
//       name: courseInput.name,
//       semester: courseInput.semester,
//       year: new Date().getFullYear(),
//       capacity: 999,
//       classType,
//       classGroup: courseInput.classGroup ?? null,
//       scheduleDay: courseInput.scheduleDay ?? null,
//       scheduleTime: courseInput.scheduleTime ?? null,
//       venue: courseInput.venue ?? null,
//       lecturer: { connect: { id: lecturerProfile.id } },
//     },
//   });

//   let created = 0;
//   let enrolled = 0;
//   let skipped = 0;
//   const errors: string[] = [];

//   for (const s of students) {
//     if (!s.studentId || !s.name) {
//       errors.push(`Skipped row: missing studentId or name`);
//       continue;
//     }

//     const email = `${s.studentId}@student.swinburne.edu.my`;

//     try {
//       const user = await prisma.user.upsert({
//         where: { email },
//         update: { name: s.name },
//         create: { email, name: s.name, role: 'STUDENT' },
//       });

//       let studentProfile = await prisma.studentProfile.findUnique({
//         where: { userId: user.id },
//       });

//       if (!studentProfile) {
//         // Check studentId isn't taken by another user
//         const taken = await prisma.studentProfile.findUnique({ where: { studentId: s.studentId } });
//         if (taken) {
//           errors.push(`Student ID ${s.studentId} is already assigned to another account`);
//           continue;
//         }
//         studentProfile = await prisma.studentProfile.create({
//           data: {
//             userId: user.id,
//             studentId: s.studentId,
//             major: s.major || null,
//             enrollmentYear: new Date().getFullYear(),
//           },
//         });
//         created++;
//       } else if (s.major) {
//         await prisma.studentProfile.update({
//           where: { id: studentProfile.id },
//           data: { major: s.major },
//         });
//       }

//       const existingEnrollment = await prisma.unitEnrollment.findUnique({
//         where: { studentId_unitId: { studentId: studentProfile.id, unitId: course.id } },
//       });

//       if (!existingEnrollment) {
//         await prisma.unitEnrollment.create({
//           data: { studentId: studentProfile.id, unitId: course.id },
//         });
//         enrolled++;
//       } else {
//         skipped++;
//       }
//     } catch (err) {
//       errors.push(`${s.studentId}: ${err instanceof Error ? err.message : 'Failed'}`);
//     }
//   }

//   return NextResponse.json({ unitId: course.id, created, enrolled, skipped, errors });
// }
