import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock @zxing/browser BrowserQRCodeReader
const mockDecodeFromVideoDevice = jest.fn();
const mockStop = jest.fn();

jest.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: mockDecodeFromVideoDevice,
  })),
}));

import { useSession } from 'next-auth/react';
import LecturerAttendancePage from '@/app/lecturer/attendance/page';

const mockUseSession = useSession as jest.Mock;

function setupMockControls(onDecodeCallback?: (result: { getText: () => string }) => void) {
  const controls = { stop: mockStop };
  mockDecodeFromVideoDevice.mockImplementation(
    async (
      _deviceId: string | undefined,
      _elementId: string,
      callback: (result: { getText: () => string } | null) => void
    ) => {
      if (onDecodeCallback) {
        // Simulate an async QR scan
        setTimeout(() => {
          onDecodeCallback({ getText: () => 'scanned-qr-token' });
          callback({ getText: () => 'scanned-qr-token' });
        }, 50);
      }
      return controls;
    }
  );
  return controls;
}

function mockFetchResponse(status: number, data: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('LecturerAttendancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'lecturer-1', role: 'LECTURER', name: 'Dr. Smith' } },
      status: 'authenticated',
    });
  });

  it('renders the "Start Scanning" button', () => {
    render(<LecturerAttendancePage />);
    expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
  });

  it('starts the scanner when "Start Scanning" button is clicked', async () => {
    setupMockControls();

    render(<LecturerAttendancePage />);

    const startButton = screen.getByRole('button', { name: /start scanning/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockDecodeFromVideoDevice).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('shows success message after a successful scan (201 response)', async () => {
    jest.useFakeTimers();

    setupMockControls();

    const fakeRecord = {
      id: 'record-1',
      userId: 'user-student-1',
      sessionId: 'session-1',
      checkInTime: new Date().toISOString(),
      recognitionMethod: 'QR_CODE',
      status: 'PRESENT',
    };
    mockFetchResponse(201, { success: true, record: fakeRecord });

    render(<LecturerAttendancePage />);

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }));

    await waitFor(() => {
      expect(mockDecodeFromVideoDevice).toHaveBeenCalled();
    });

    // Trigger the callback
    const callback = mockDecodeFromVideoDevice.mock.calls[0][2];
    await callback({ getText: () => 'scanned-qr-token' });

    await waitFor(() => {
      expect(screen.getByText('Attendance marked successfully')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('shows "Already checked in" message for 409 response', async () => {
    setupMockControls();
    mockFetchResponse(409, { error: 'Already checked in' });

    render(<LecturerAttendancePage />);

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }));

    await waitFor(() => {
      expect(mockDecodeFromVideoDevice).toHaveBeenCalled();
    });

    const callback = mockDecodeFromVideoDevice.mock.calls[0][2];
    await callback({ getText: () => 'duplicate-token' });

    await waitFor(() => {
      expect(screen.getByText('Already checked in')).toBeInTheDocument();
    });
  });

  it('shows "Invalid or expired QR code" message for 400 response', async () => {
    setupMockControls();
    mockFetchResponse(400, { error: 'Invalid or expired QR code' });

    render(<LecturerAttendancePage />);

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }));

    await waitFor(() => {
      expect(mockDecodeFromVideoDevice).toHaveBeenCalled();
    });

    const callback = mockDecodeFromVideoDevice.mock.calls[0][2];
    await callback({ getText: () => 'invalid-token' });

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired QR code')).toBeInTheDocument();
    });
  });

  it('renders the checked-in students table section', () => {
    render(<LecturerAttendancePage />);
    expect(screen.getByText(/Checked-In Students/)).toBeInTheDocument();
    expect(screen.getByText('No students have checked in yet.')).toBeInTheDocument();
  });

  it('renders the video element for QR scanning', () => {
    render(<LecturerAttendancePage />);
    const video = document.getElementById('qr-video');
    expect(video).toBeInTheDocument();
    expect(video?.tagName).toBe('VIDEO');
  });
});
