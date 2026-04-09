import crypto from 'crypto';

const SECRET = process.env.QR_SECRET ?? 'dev-secret-change-in-prod';

// ── Shared helpers ────────────────────────────────────────────────────────────

function toBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function computeHmac(data: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(payload: object): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = computeHmac(encoded);
  return `${encoded}.${sig}`;
}

function verify(token: string): Record<string, unknown> {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) throw new Error('Invalid signature');

  const encoded = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);
  const expectedSig = computeHmac(encoded);

  if (providedSig !== expectedSig) throw new Error('Invalid signature');

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new Error('Invalid signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

// ── Stage 1 — Attendance token (student → lecturer) ───────────────────────────

export interface QRPayload {
  type: 'attendance';
  studentId: string;
  userId: string;
  sessionId: string;
  exp: number;
}

export function signQRToken(payload: {
  studentId: string;
  userId: string;
  sessionId: string;
}): string {
  const full: QRPayload = {
    type: 'attendance',
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60,
  };
  return sign(full);
}

export function verifyQRToken(token: string): QRPayload {
  const raw = verify(token);
  // Accept legacy tokens that predate the type field
  if (raw.type !== undefined && raw.type !== 'attendance') {
    throw new Error('Wrong token type');
  }
  return raw as unknown as QRPayload;
}

// ── Stage 2 — Challenge token (generated server-side after Stage 1 scan) ──────

export interface ChallengePayload {
  type: 'challenge';
  studentId: string;
  sessionId: string;
  dataId: string; // ClassAttendanceData.id of the Stage 1 record
  exp: number;
}

export function signChallengeToken(payload: {
  studentId: string;
  sessionId: string;
  dataId: string;
}): string {
  const full: ChallengePayload = {
    type: 'challenge',
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes for challenge window
  };
  return sign(full);
}

export function verifyChallengeToken(token: string): ChallengePayload {
  const raw = verify(token);
  if (raw.type !== 'challenge') throw new Error('Wrong token type');
  return raw as unknown as ChallengePayload;
}

// ── Token type detection ──────────────────────────────────────────────────────

export function detectTokenType(token: string): 'attendance' | 'challenge' | 'invalid' {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return 'invalid';
    const encoded = token.slice(0, dotIndex);
    const raw = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (raw.type === 'challenge') return 'challenge';
    return 'attendance';
  } catch {
    return 'invalid';
  }
}
