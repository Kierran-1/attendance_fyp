type SessionUserLike = {
  id?: string | null;
  email?: string | null;
};

export type FallbackStudentProfile = {
  studentId: string;
  major: string | null;
  enrollmentYear: number | null;
};

export function deriveStudentId(user: SessionUserLike): string {
  const email = user.email?.trim().toLowerCase() ?? '';
  const [localPart = ''] = email.split('@');

  if (localPart) {
    return localPart.replace(/[^a-z0-9._-]/g, '') || `student-${(user.id ?? '').slice(0, 8)}`;
  }

  return `student-${(user.id ?? 'unknown').slice(0, 8)}`;
}

export function getFallbackStudentProfile(user: SessionUserLike): FallbackStudentProfile {
  return {
    studentId: deriveStudentId(user),
    major: null,
    enrollmentYear: null,
  };
}

export function isMissingTableError(error: unknown, tableName: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`table \`public.${tableName}\` does not exist`);
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Can't reach database server") ||
    message.includes('PrismaClientInitializationError') ||
    message.includes('P1001')
  );
}

let studentDbUnavailableUntil = 0;

export function markStudentDbUnavailable(cooldownMs = 30_000) {
  studentDbUnavailableUntil = Date.now() + cooldownMs;
}

export function isStudentDbInCooldown() {
  return Date.now() < studentDbUnavailableUntil;
}