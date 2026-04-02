const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const email = '102789110@students.swinburne.edu.my';

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      studentProfile: { select: { id: true, studentId: true } }
    }
  });
  console.log('TARGET_USER:', JSON.stringify(user, null, 2));

  const badEnrollments = await prisma.$queryRawUnsafe(`
    SELECT ue."id", ue."studentId", ue."unitId"
    FROM "UnitEnrollment" ue
    LEFT JOIN "StudentProfile" sp ON sp."id" = ue."studentId"
    WHERE sp."id" IS NULL
    LIMIT 20;
  `);
  console.log('\nENROLLMENTS_WITHOUT_PROFILE_ID_LINK:', badEnrollments.length);
  console.log(JSON.stringify(badEnrollments.slice(0, 5), null, 2));

  if (user?.studentProfile?.id) {
    const direct = await prisma.$queryRawUnsafe(`
      SELECT ue."id", ue."studentId", ue."unitId", u."code", u."name"
      FROM "UnitEnrollment" ue
      JOIN "Unit" u ON u."id" = ue."unitId"
      WHERE ue."studentId" = '${user.studentProfile.id}'
      ORDER BY ue."enrolledAt" DESC;
    `);
    console.log('\nDIRECT_ENROLLMENTS_FOR_PROFILE_ID:', direct.length);
    console.log(JSON.stringify(direct, null, 2));

    const byStudentIdText = await prisma.$queryRawUnsafe(`
      SELECT ue."id", ue."studentId", ue."unitId", u."code", u."name"
      FROM "UnitEnrollment" ue
      JOIN "Unit" u ON u."id" = ue."unitId"
      WHERE ue."studentId" = '${user.studentProfile.studentId}'
      ORDER BY ue."enrolledAt" DESC;
    `);
    console.log('\nENROLLMENTS_USING_STUDENT_NUMBER_TEXT:', byStudentIdText.length);
    console.log(JSON.stringify(byStudentIdText, null, 2));
  }

  await prisma.$disconnect();
})();
