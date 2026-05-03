import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole, UserStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createStoredAlert,
  deleteStoredAlertsForLecturer,
  listStoredAlertsForLecturer,
  listStoredAlertsForUnitCodes,
  type StoredAlert,
  type StoredAlertLevel,
  type StoredAlertTargetGroup,
} from '@/lib/alerts';

type LecturerUnitOption = {
  unitId: string;
  unitCode: string;
  unitName: string;
};

type StudentUnitOption = {
  unitId: string;
  unitCode: string;
  unitName: string;
};

type CreateAlertBody = {
  title?: string;
  message?: string;
  level?: StoredAlertLevel;
  unitCode?: string;
  targetGroup?: StoredAlertTargetGroup;
};

type AttendanceSummaryRow = {
  status: string | null;
  count: number | bigint;
};

type UnitRow = {
  unitId: string;
  unitCode: string;
  unitName: string;
};

function normalizeCount(value: number | bigint) {
  return typeof value === 'bigint' ? Number(value) : value;
}

function uniqueUnits(rows: UnitRow[]): LecturerUnitOption[] {
  const map = new Map<string, LecturerUnitOption>();

  for (const row of rows) {
    if (!row.unitId || !row.unitCode) continue;

    if (!map.has(row.unitCode)) {
      map.set(row.unitCode, {
        unitId: row.unitId,
        unitCode: row.unitCode,
        unitName: row.unitName,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.unitCode.localeCompare(b.unitCode)
  );
}

// Get lecturer units from more than one source.
// This helps when the lecturer account is not fully linked through UnitRegistration yet.
async function getLecturerUnits(userId: string): Promise<LecturerUnitOption[]> {
  const fromRegistrations = await prisma.$queryRawUnsafe<UnitRow[]>(
    `
      SELECT DISTINCT
        u."id" AS "unitId",
        u."code" AS "unitCode",
        u."name" AS "unitName"
      FROM "UnitRegistration" ur
      INNER JOIN "Unit" u
        ON ur."unitId" = u."id"
      WHERE ur."userId" = $1
        AND ur."userStatus" IN ('LECTURER', 'TUTOR')
      ORDER BY u."code" ASC
    `,
    userId
  );

  const fromSessions = await prisma.$queryRawUnsafe<UnitRow[]>(
    `
      SELECT DISTINCT
        u."id" AS "unitId",
        u."code" AS "unitCode",
        u."name" AS "unitName"
      FROM "ClassSession" cs
      INNER JOIN "UnitRegistration" ur
        ON cs."unitRegistrationId" = ur."id"
      INNER JOIN "Unit" u
        ON ur."unitId" = u."id"
      WHERE cs."lecturerId" = $1
      ORDER BY u."code" ASC
    `,
    userId
  );

  return uniqueUnits([...fromRegistrations, ...fromSessions]);
}

async function getStudentUnits(userId: string): Promise<StudentUnitOption[]> {
  const rows = await prisma.$queryRawUnsafe<UnitRow[]>(
    `
      SELECT DISTINCT
        u."id" AS "unitId",
        u."code" AS "unitCode",
        u."name" AS "unitName"
      FROM "UnitRegistration" ur
      INNER JOIN "Unit" u
        ON ur."unitId" = u."id"
      WHERE ur."userId" = $1
        AND ur."userStatus" = 'STUDENT'
      ORDER BY u."code" ASC
    `,
    userId
  );

  return uniqueUnits(rows);
}

// If lecturer has no linked unit rows yet, still allow exact existing unit code as fallback.
// This keeps the alert feature usable during development/testing.
async function resolveUnitForLecturer(params: {
  userId: string;
  unitCode: string;
}) {
  const lecturerUnits = await getLecturerUnits(params.userId);
  const matchedLecturerUnit = lecturerUnits.find(
    (item) => item.unitCode === params.unitCode
  );

  if (matchedLecturerUnit) {
    return matchedLecturerUnit;
  }

  const fallbackUnit = await prisma.unit.findFirst({
    where: {
      code: params.unitCode,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!fallbackUnit) {
    return null;
  }

  return {
    unitId: fallbackUnit.id,
    unitCode: fallbackUnit.code,
    unitName: fallbackUnit.name,
  };
}

async function getStudentAttendanceSummaryByUnit(params: {
  studentId: string;
  unitId: string;
}) {
  const rows = await prisma.$queryRawUnsafe<AttendanceSummaryRow[]>(
    `
      SELECT "car"."status" AS "status", COUNT(*) AS "count"
      FROM "ClassAttendanceRecord" "car"
      INNER JOIN "ClassSession" "cs"
        ON "car"."classSessionId" = "cs"."id"
      INNER JOIN "UnitRegistration" "ur"
        ON "cs"."unitRegistrationId" = "ur"."id"
      WHERE "car"."studentId" = $1
        AND "ur"."unitId" = $2
      GROUP BY "car"."status"
    `,
    params.studentId,
    params.unitId
  );

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let total = 0;

  for (const row of rows) {
    const count = normalizeCount(row.count);
    const status = row.status ?? '';

    total += count;

    if (status === 'PRESENT') presentCount += count;
    if (status === 'ABSENT') absentCount += count;
    if (status === 'LATE') lateCount += count;
  }

  const attendedCount = presentCount + lateCount;
  const attendanceRate = total > 0 ? (attendedCount / total) * 100 : 100;

  return {
    total,
    presentCount,
    absentCount,
    lateCount,
    attendanceRate,
  };
}

async function filterAlertsForStudent(params: {
  userId: string;
  studentUnits: StudentUnitOption[];
  alerts: StoredAlert[];
}) {
  const unitMap = new Map(
    params.studentUnits.map((item) => [item.unitCode, item] as const)
  );

  const filtered = await Promise.all(
    params.alerts.map(async (alert) => {
      const matchedUnit = unitMap.get(alert.unitCode);
      if (!matchedUnit) return null;

      if (alert.targetGroup === 'ALL_STUDENTS') {
        return alert;
      }

      const summary = await getStudentAttendanceSummaryByUnit({
        studentId: params.userId,
        unitId: matchedUnit.unitId,
      });

      if (
        alert.targetGroup === 'ABSENT_STUDENTS' &&
        summary.absentCount > 0
      ) {
        return alert;
      }

      if (
        alert.targetGroup === 'LATE_STUDENTS' &&
        summary.lateCount > 0
      ) {
        return alert;
      }

      if (
        alert.targetGroup === 'AT_RISK_STUDENTS' &&
        (summary.absentCount >= 3 || summary.attendanceRate < 80)
      ) {
        return alert;
      }

      return null;
    })
  );

  return filtered.filter((item): item is StoredAlert => Boolean(item));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === UserRole.LECTURER) {
      const [units, alerts] = await Promise.all([
        getLecturerUnits(session.user.id),
        listStoredAlertsForLecturer(session.user.id),
      ]);

      return NextResponse.json({
        units,
        alerts,
      });
    }

    if (session.user.role === UserRole.STUDENT) {
      const studentUnits = await getStudentUnits(session.user.id);
      const unitCodes = studentUnits.map((item) => item.unitCode);

      const rawAlerts = await listStoredAlertsForUnitCodes(unitCodes);
      const filteredAlerts = await filterAlertsForStudent({
        userId: session.user.id,
        studentUnits,
        alerts: rawAlerts,
      });

      console.log('[ALERTS_GET] Student alerts:', { unitCodes, rawAlerts: rawAlerts.length, filteredAlerts: filteredAlerts.length });

      return NextResponse.json({
        alerts: filteredAlerts,
      });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('[ALERTS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to load alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as CreateAlertBody;

    const title = body.title?.trim() ?? '';
    const message = body.message?.trim() ?? '';
    const unitCode = body.unitCode?.trim().toUpperCase() ?? '';
    const level = body.level ?? 'Warning';
    const targetGroup = body.targetGroup ?? 'ALL_STUDENTS';

    if (!title || !message || !unitCode) {
      return NextResponse.json(
        { error: 'Title, message, and unit are required.' },
        { status: 400 }
      );
    }

    const resolvedUnit = await resolveUnitForLecturer({
      userId: session.user.id,
      unitCode,
    });

    if (!resolvedUnit) {
      return NextResponse.json(
        { error: 'Selected unit code was not found in the system.' },
        { status: 400 }
      );
    }

    const created = await createStoredAlert({
      id: randomUUID(),
      title,
      message,
      level,
      targetGroup,
      unitCode: resolvedUnit.unitCode,
      unitName: resolvedUnit.unitName,
      actionHref: '/student/alerts',
      actionLabel: 'Open Alerts',
      createdByUserId: session.user.id,
      createdByName: session.user.name ?? session.user.email ?? 'Lecturer',
    });

    if (!created) {
      return NextResponse.json(
        { error: 'Alert could not be saved.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alert: created }, { status: 201 });
  } catch (error) {
    console.error('[ALERTS_POST]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create alert',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== UserRole.LECTURER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await deleteStoredAlertsForLecturer(session.user.id);

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('[ALERTS_DELETE]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to clear alerts',
      },
      { status: 500 }
    );
  }
}