import { prisma } from '@/lib/prisma';

export type StoredAlertLevel = 'Critical' | 'Warning' | 'Info';
export type StoredAlertTargetGroup =
  | 'ALL_STUDENTS'
  | 'ABSENT_STUDENTS'
  | 'LATE_STUDENTS'
  | 'AT_RISK_STUDENTS';

export type StoredAlert = {
  id: string;
  title: string;
  message: string;
  level: StoredAlertLevel;
  targetGroup: StoredAlertTargetGroup;
  unitCode: string;
  unitName: string | null;
  actionHref: string | null;
  actionLabel: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
};

type AlertRow = {
  id: string;
  title: string;
  message: string;
  level: StoredAlertLevel;
  targetGroup: StoredAlertTargetGroup;
  unitCode: string;
  unitName: string | null;
  actionHref: string | null;
  actionLabel: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: Date | string;
};

function mapAlertRow(row: AlertRow): StoredAlert {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    level: row.level,
    targetGroup: row.targetGroup,
    unitCode: row.unitCode,
    unitName: row.unitName,
    actionHref: row.actionHref,
    actionLabel: row.actionLabel,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
  };
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

// Keep this compatible with the previously-created AppAlert table.
// We add missing columns if needed, instead of assuming a fresh table.
export async function ensureAlertsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppAlert" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "level" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'Lecturer Message',
      "audienceRole" TEXT NOT NULL DEFAULT 'STUDENT',
      "targetGroup" TEXT NOT NULL DEFAULT 'ALL_STUDENTS',
      "targetUserId" TEXT,
      "unitCode" TEXT NOT NULL,
      "unitName" TEXT,
      "actionHref" TEXT,
      "actionLabel" TEXT,
      "createdByUserId" TEXT NOT NULL,
      "createdByName" TEXT,
      "source" TEXT NOT NULL DEFAULT 'lecturer',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Make older/newer structures converge safely.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "type" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "audienceRole" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "targetGroup" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "targetUserId" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "unitCode" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "unitName" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "actionHref" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "actionLabel" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "createdByName" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppAlert"
    ADD COLUMN IF NOT EXISTS "source" TEXT
  `);

  // Fill older rows / nullable structure safely so future inserts won't fail.
  await prisma.$executeRawUnsafe(`
    UPDATE "AppAlert"
    SET "type" = 'Lecturer Message'
    WHERE "type" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "AppAlert"
    SET "audienceRole" = 'STUDENT'
    WHERE "audienceRole" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "AppAlert"
    SET "targetGroup" = 'ALL_STUDENTS'
    WHERE "targetGroup" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "AppAlert"
    SET "source" = 'lecturer'
    WHERE "source" IS NULL
  `);

  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "idx_appalert_createdAt" ON "AppAlert" ("createdAt" DESC)'
  );

  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "idx_appalert_unitCode" ON "AppAlert" ("unitCode")'
  );

  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "idx_appalert_createdByUserId" ON "AppAlert" ("createdByUserId")'
  );
}

export async function createStoredAlert(input: {
  id: string;
  title: string;
  message: string;
  level: StoredAlertLevel;
  targetGroup: StoredAlertTargetGroup;
  unitCode: string;
  unitName?: string | null;
  actionHref?: string | null;
  actionLabel?: string | null;
  createdByUserId: string;
  createdByName?: string | null;
}) {
  await ensureAlertsTable();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "AppAlert" (
        "id",
        "title",
        "message",
        "level",
        "type",
        "audienceRole",
        "targetGroup",
        "targetUserId",
        "unitCode",
        "unitName",
        "actionHref",
        "actionLabel",
        "createdByUserId",
        "createdByName",
        "source"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `,
    input.id,
    input.title,
    input.message,
    input.level,
    'Lecturer Message', // old schema required this
    'STUDENT', // old schema required this
    input.targetGroup,
    null,
    input.unitCode,
    input.unitName ?? null,
    input.actionHref ?? null,
    input.actionLabel ?? null,
    input.createdByUserId,
    input.createdByName ?? null,
    'lecturer'
  );

  const rows = await prisma.$queryRawUnsafe<AlertRow[]>(
    `
      SELECT
        "id",
        "title",
        "message",
        "level",
        "targetGroup",
        "unitCode",
        "unitName",
        "actionHref",
        "actionLabel",
        "createdByUserId",
        "createdByName",
        "createdAt"
      FROM "AppAlert"
      WHERE "id" = $1
      LIMIT 1
    `,
    input.id
  );

  return rows[0] ? mapAlertRow(rows[0]) : null;
}

export async function listStoredAlertsForLecturer(userId: string) {
  await ensureAlertsTable();

  const rows = await prisma.$queryRawUnsafe<AlertRow[]>(
    `
      SELECT
        "id",
        "title",
        "message",
        "level",
        "targetGroup",
        "unitCode",
        "unitName",
        "actionHref",
        "actionLabel",
        "createdByUserId",
        "createdByName",
        "createdAt"
      FROM "AppAlert"
      WHERE "createdByUserId" = $1
      ORDER BY "createdAt" DESC
    `,
    userId
  );

  return rows.map(mapAlertRow);
}

export async function listStoredAlertsForUnitCodes(unitCodes: string[]) {
  await ensureAlertsTable();

  const safeCodes = unitCodes
    .filter((value) => value.trim().length > 0)
    .map((value) => `'${escapeSqlLiteral(value.trim())}'`);

  if (safeCodes.length === 0) {
    return [] as StoredAlert[];
  }

  const rows = await prisma.$queryRawUnsafe<AlertRow[]>(
    `
      SELECT
        "id",
        "title",
        "message",
        "level",
        "targetGroup",
        "unitCode",
        "unitName",
        "actionHref",
        "actionLabel",
        "createdByUserId",
        "createdByName",
        "createdAt"
      FROM "AppAlert"
      WHERE "unitCode" IN (${safeCodes.join(', ')})
      ORDER BY "createdAt" DESC
    `
  );

  return rows.map(mapAlertRow);
}

export async function deleteStoredAlertsForLecturer(userId: string) {
  await ensureAlertsTable();

  const deleted = await prisma.$executeRawUnsafe(
    `
      DELETE FROM "AppAlert"
      WHERE "createdByUserId" = $1
    `,
    userId
  );

  return Number(deleted ?? 0);
}