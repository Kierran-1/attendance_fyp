import crypto from 'crypto';

const SECRET = process.env.QR_SECRET ?? 'dev-secret-change-in-prod';

export interface QRPayload {
  studentId: string;
  userId: string;
  sessionId: string;
  exp: number;
}

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

export function signQRToken(payload: {
  studentId: string;
  userId: string;
  sessionId: string;
}): string {
  const exp = Math.floor(Date.now() / 1000) + 60; // expires in 60 seconds
  const fullPayload: QRPayload = { ...payload, exp };
  const encoded = toBase64Url(JSON.stringify(fullPayload));
  const sig = computeHmac(encoded);
  return `${encoded}.${sig}`;
}

export function verifyQRToken(token: string): QRPayload {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) {
    throw new Error('Invalid signature');
  }

  const encoded = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);
  const expectedSig = computeHmac(encoded);

  if (providedSig !== expectedSig) {
    throw new Error('Invalid signature');
  }

  let payload: QRPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new Error('Invalid signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}
