/**
 * @jest-environment node
 */
import { POST } from '@/app/api/attendance/scan/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    attendanceSession: {
      findFirst: jest.fn(),
    },
    attendanceRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/qr', () => ({
  verifyQRToken: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { verifyQRToken } from '@/lib/qr';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockVerifyQRToken = verifyQRToken as jest.Mock;
const mockSessionFindFirst = prisma.attendanceSession.findFirst as jest.Mock;
const mockRecordFindUnique = prisma.attendanceRecord.findUnique as jest.Mock;
const mockRecordCreate = prisma.attendanceRecord.create as jest.Mock;

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/attendance/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  studentId: 'S001',
  userId: 'user-1',
  sessionId: 'session-1',
  exp: Math.floor(Date.now() / 1000) + 60,
};

describe('POST /api/attendance/scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: 'some-token' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when role is STUDENT', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    const res = await POST(makeRequest({ token: 'some-token' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when token is invalid (verifyQRToken throws)', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'lecturer-1', role: 'LECTURER' },
    } as never);

    mockVerifyQRToken.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeRequest({ token: 'bad-token' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired QR code');
  });

  it('returns 400 when token is expired (verifyQRToken throws Token expired)', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'lecturer-1', role: 'LECTURER' },
    } as never);

    mockVerifyQRToken.mockImplementation(() => {
      throw new Error('Token expired');
    });

    const res = await POST(makeRequest({ token: 'expired-token' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired QR code');
  });

  it('returns 404 when session not found or inactive', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'lecturer-1', role: 'LECTURER' },
    } as never);

    mockVerifyQRToken.mockReturnValue(validPayload);
    mockSessionFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: 'valid-token' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Session not found or inactive');
  });

  it('returns 409 when student already checked in', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'lecturer-1', role: 'LECTURER' },
    } as never);

    mockVerifyQRToken.mockReturnValue(validPayload);
    mockSessionFindFirst.mockResolvedValue({ id: 'session-1', isActive: true });
    mockRecordFindUnique.mockResolvedValue({ id: 'record-existing' });

    const res = await POST(makeRequest({ token: 'valid-token' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Already checked in');
  });

  it('returns 201 with record on success', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'lecturer-1', role: 'LECTURER' },
    } as never);

    mockVerifyQRToken.mockReturnValue(validPayload);
    mockSessionFindFirst.mockResolvedValue({ id: 'session-1', isActive: true });
    mockRecordFindUnique.mockResolvedValue(null);

    const fakeRecord = {
      id: 'record-new',
      userId: 'user-1',
      sessionId: 'session-1',
      checkInTime: new Date(),
      recognitionMethod: 'QR_CODE',
      status: 'PRESENT',
    };
    mockRecordCreate.mockResolvedValue(fakeRecord);

    const res = await POST(makeRequest({ token: 'valid-token' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.record.id).toBe('record-new');
    expect(mockRecordCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        sessionId: 'session-1',
        recognitionMethod: 'QR_CODE',
        status: 'PRESENT',
      }),
    });
  });
});
