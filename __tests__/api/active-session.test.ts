/**
 * @jest-environment node
 */
import { GET } from '@/app/api/attendance/active-session/route';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options (just needs to exist as an export)
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    studentProfile: {
      findUnique: jest.fn(),
    },
    lecturerProfile: {
      findUnique: jest.fn(),
    },
    attendanceSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockStudentFindUnique = prisma.studentProfile.findUnique as jest.Mock;
const mockAttendanceFindFirst = prisma.attendanceSession.findFirst as jest.Mock;
const mockLecturerFindUnique = prisma.lecturerProfile.findUnique as jest.Mock;
const mockAttendanceFindMany = prisma.attendanceSession.findMany as jest.Mock;

function makeRequest() {
  return new Request('http://localhost/api/attendance/active-session');
}

describe('GET /api/attendance/active-session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns { session: null } when student has no active sessions', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    mockStudentFindUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      studentId: 'S001',
      courseEnrollments: [{ courseId: 'course-1' }],
    });

    mockAttendanceFindFirst.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  it('returns session data when an active session exists for the student', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    mockStudentFindUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      studentId: 'S001',
      courseEnrollments: [{ courseId: 'course-1' }],
    });

    const fakeSession = {
      id: 'session-1',
      courseId: 'course-1',
      course: { code: 'CS101', name: 'Intro to CS' },
      startTime: new Date('2026-03-18T08:00:00Z'),
      endTime: new Date('2026-03-18T10:00:00Z'),
      isActive: true,
    };
    mockAttendanceFindFirst.mockResolvedValue(fakeSession);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session).toBeDefined();
    expect(body.session.id).toBe('session-1');
    expect(body.session.course.code).toBe('CS101');
    expect(body.session.course.name).toBe('Intro to CS');
  });

  it('returns { session: null } when student profile does not exist', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT' },
    } as never);

    mockStudentFindUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  it('returns 403 for an unknown/unexpected role', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN' },
    } as never);

    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns sessions array for LECTURER role', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'lecturer-1', role: 'LECTURER' },
    } as never);

    mockLecturerFindUnique.mockResolvedValue({ id: 'lprof-1', userId: 'lecturer-1' });
    mockAttendanceFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sessions)).toBe(true);
  });
});
