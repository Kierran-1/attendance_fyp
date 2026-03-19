import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('react-qr-code', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code-svg" data-value={value} />
  ),
}));

import { useSession } from 'next-auth/react';
import StudentQRCodePage from '@/app/student/qrcode/page';

const mockUseSession = useSession as jest.Mock;

function mockFetch(responses: Array<{ ok: boolean; status?: number; data: unknown }>) {
  let callIndex = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const response = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: () => Promise.resolve(response.data),
    });
  });
}

describe('StudentQRCodePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a loading skeleton state initially', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', role: 'STUDENT', name: 'Alice' } },
      status: 'loading',
    });

    mockFetch([{ ok: true, data: { session: null } }]);

    render(<StudentQRCodePage />);

    // The loading skeleton has an animate-pulse element
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows "No active session" when API returns { session: null }', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', role: 'STUDENT', name: 'Alice' } },
      status: 'authenticated',
    });

    mockFetch([{ ok: true, data: { session: null } }]);

    render(<StudentQRCodePage />);

    await waitFor(() => {
      expect(
        screen.getByText('No active session for your courses right now.')
      ).toBeInTheDocument();
    });
  });

  it('shows QR code when active session exists and token is generated', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', role: 'STUDENT', name: 'Alice' } },
      status: 'authenticated',
    });

    const activeSession = {
      id: 'session-1',
      courseId: 'course-1',
      course: { code: 'CS101', name: 'Intro to CS' },
      startTime: new Date(Date.now() - 3600_000).toISOString(),
      endTime: new Date(Date.now() + 3600_000).toISOString(),
    };

    mockFetch([
      { ok: true, data: { session: activeSession } },
      { ok: true, data: { token: 'test-qr-token-value' } },
    ]);

    render(<StudentQRCodePage />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-code-svg')).toBeInTheDocument();
    });

    expect(screen.getByTestId('qr-code-svg')).toHaveAttribute(
      'data-value',
      'test-qr-token-value'
    );
  });

  it('shows the course name when QR code is displayed', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', role: 'STUDENT', name: 'Alice' } },
      status: 'authenticated',
    });

    const activeSession = {
      id: 'session-1',
      courseId: 'course-1',
      course: { code: 'CS101', name: 'Intro to Computer Science' },
      startTime: new Date(Date.now() - 3600_000).toISOString(),
      endTime: new Date(Date.now() + 3600_000).toISOString(),
    };

    mockFetch([
      { ok: true, data: { session: activeSession } },
      { ok: true, data: { token: 'test-qr-token-value' } },
    ]);

    render(<StudentQRCodePage />);

    await waitFor(() => {
      expect(screen.getByText('Intro to Computer Science')).toBeInTheDocument();
    });

    expect(screen.getByText('CS101')).toBeInTheDocument();
  });
});
