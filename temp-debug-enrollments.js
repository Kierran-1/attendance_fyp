const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      studentProfile: {
        select: {
          id: true,
          studentId: true,
          courseEnrollments: {
            select: {
              id: true,
              courseId: true,
              course: { select: { code: true, name: true } }
            }
          }
        }
      }
    },
    orderBy: { email: 'asc' }
  });

  for (const u of users) {
    if (!u.studentProfile) continue;
    console.log('\nUSER:', u.email, '| userId:', u.id, '| profileId:', u.studentProfile.id, '| studentId:', u.studentProfile.studentId);
    console.log('ENROLLMENTS:', u.studentProfile.courseEnrollments.length);
    for (const e of u.studentProfile.courseEnrollments) {
      console.log('-', e.course.code, e.course.name, '| courseId:', e.courseId, '| enrId:', e.id);
    }
  }

  await prisma.$disconnect();
})();
