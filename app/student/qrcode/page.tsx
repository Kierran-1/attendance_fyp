'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';

interface ActiveSession {
  id: string;
  courseId: string;
  course: { code: string; name: string };
  startTime: string;
  endTime: string;
}

export default function StudentQRCodePage() {
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [refreshesIn, setRefreshesIn] = useState<number>(45);
  const [error, setError] = useState<string | null>(null);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateToken = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch('/api/attendance/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setRefreshesIn(45);
      }
    } catch {
      // silently ignore token refresh errors
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    async function fetchActiveSession() {
      setLoading(true);
      try {
        const res = await fetch('/api/attendance/active-session');
        if (!res.ok) {
          setError('Failed to fetch session');
          return;
        }
        const data = await res.json();
        if (data.session) {
          setActiveSession(data.session);
          await generateToken(data.session.id);
        } else {
          setActiveSession(null);
          setToken(null);
        }
      } catch {
        setError('Failed to fetch session');
      } finally {
        setLoading(false);
      }
    }

    fetchActiveSession();
  }, [status, generateToken]);

  // Countdown timer for time remaining
  useEffect(() => {
    if (!activeSession) return;

    function updateCountdown() {
      const end = new Date(activeSession!.endTime).getTime();
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTimeRemaining(remaining);
    }

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [activeSession]);

  // Auto-refresh token every 45 seconds
  useEffect(() => {
    if (!activeSession) return;

    refreshIntervalRef.current = setInterval(() => {
      generateToken(activeSession.id);
    }, 45_000);

    // Refresh countdown display
    refreshCountdownRef.current = setInterval(() => {
      setRefreshesIn((prev) => (prev <= 1 ? 45 : prev - 1));
    }, 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (refreshCountdownRef.current) clearInterval(refreshCountdownRef.current);
    };
  }, [activeSession, generateToken]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-64 h-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!activeSession || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">No active session for your courses right now.</p>
          <p className="text-gray-400 text-sm mt-2">
            Check back when your lecturer starts an attendance session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800">{activeSession.course.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{activeSession.course.code}</p>
        </div>

        <div className="border-4 border-gray-800 rounded-xl p-2">
          <QRCode value={token} size={256} />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-gray-600">
            Session ends in{' '}
            <span className="font-semibold text-gray-800">{formatTime(timeRemaining)}</span>
          </p>
          <p className="text-xs text-gray-400">
            Refreshes in <span className="font-medium">{refreshesIn}s</span>
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Show this QR code to your lecturer to mark attendance
        </p>
      </div>
    </div>
  );
}
