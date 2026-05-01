import { prisma } from '@/lib/prisma';

type EnrollmentTableConfig = {
  tableName: string;
  studentColumn: string;
  courseColumn: string;
} | null;

// Cached after first discovery so later API calls are much faster.
let cachedEnrollmentConfig: EnrollmentTableConfig | undefined;

/**
 * Discover the actual enrollment table in the current database.
 *
 * We search for likely table names and confirm they contain:
 * - a student reference column
 * - a course reference column
 *
 * This avoids guessing model names like prisma.courseEnrollment
 * when the real DB may still use another name.
 */
export async function discoverEnrollmentTable(): Promise<EnrollmentTableConfig> {
  if (cachedEnrollmentConfig !== undefined) {
    return cachedEnrollmentConfig;
  }

  const tables = (await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `)) as Array<{ table_name: string }>;

  const preferredPatterns = [
    'courseenrollment',
    'courseregistration',
    'unitregistration',
    'unitenrollment',
    'enrollment',
    'registration',
  ];

  const rankedTables = tables
    .map((t) => t.table_name)
    .sort((a, b) => {
      const aIdx = preferredPatterns.findIndex((p) => a.toLowerCase().includes(p));
      const bIdx = preferredPatterns.findIndex((p) => b.toLowerCase().includes(p));
      const safeA = aIdx === -1 ? 999 : aIdx;
      const safeB = bIdx === -1 ? 999 : bIdx;
      return safeA - safeB;
    });

  for (const tableName of rankedTables) {
    const columns = (await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName.replace(/'/g, "''")}'
    `)) as Array<{ column_name: string }>;

    const colNames = columns.map((c) => c.column_name.toLowerCase());

    const studentColumn =
      columns.find((c) => c.column_name.toLowerCase() === 'studentid')?.column_name ??
      columns.find((c) => c.column_name.toLowerCase() === 'userid')?.column_name ??
      null;

    const courseColumn =
      columns.find((c) => c.column_name.toLowerCase() === 'courseid')?.column_name ??
      columns.find((c) => c.column_name.toLowerCase() === 'unitid')?.column_name ??
      null;

    const looksRelevant =
      preferredPatterns.some((p) => tableName.toLowerCase().includes(p)) ||
      (colNames.includes('studentid') && (colNames.includes('courseid') || colNames.includes('unitid')));

    if (looksRelevant && studentColumn && courseColumn) {
      cachedEnrollmentConfig = {
        tableName,
        studentColumn,
        courseColumn,
      };
      return cachedEnrollmentConfig;
    }
  }

  cachedEnrollmentConfig = null;
  return null;
}

/**
 * Fetch enrolled course IDs for a student using the discovered table.
 * If the DB is still mid-migration and no matching table exists yet,
 * return an empty list instead of crashing the whole app.
 */
export async function getEnrolledCourseIdsForStudentProfile(
  studentProfileId: string
): Promise<string[]> {
  const config = await discoverEnrollmentTable();

  if (!config) {
    return [];
  }

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT "${config.courseColumn}" AS "courseId"
      FROM "public"."${config.tableName}"
      WHERE "${config.studentColumn}" = $1
    `,
    studentProfileId
  )) as Array<{ courseId: string | null }>;

  return rows
    .map((row) => row.courseId)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

/**
 * Check whether a student is enrolled in one specific course.
 */
export async function isStudentEnrolledInCourse(
  studentProfileId: string,
  courseId: string
): Promise<boolean> {
  const courseIds = await getEnrolledCourseIdsForStudentProfile(studentProfileId);
  return courseIds.includes(courseId);
}