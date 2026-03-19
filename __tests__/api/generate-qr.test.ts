/**
 * @jest-environment node
 */
import { POST } from '@/app/api/attendance/generate-qr/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    studentProfile: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/qr', () => ({
  signQRToken: jest.fn(() => 'mock-signed-token'),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { signQRToken } from '@/lib/qr';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockStudentFindUnique = prisma.studentProfile.findUnique as jest.Mock;
const mockSignQRToken = signQRToken as jest.Mock;

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/attendance/generate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/attendance/generate-qr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignQRToken.mockReturnValue('mock-signed-token');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ sessionId: 'session-1' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when role is LECTURER', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'LECTURER' },
    } as never);

    const res = await POST(makeRequest({ sessionId: 'session-1' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when sessionId is missing from the body', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('sessionId is required');
  });

  it('returns 404 when student profile is not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    mockStudentFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ sessionId: 'session-1' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Student profile not found');
  });

  it('returns { token } on success', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    mockStudentFindUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      studentId: 'S001',
    });

    const res = await POST(makeRequest({ sessionId: 'session-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe('mock-signed-token');
    expect(mockSignQRToken).toHaveBeenCalledWith({
      studentId: 'S001',
      userId: 'user-1',
      sessionId: 'session-1',
    });
  });
});
