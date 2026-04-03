'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Clock3,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type ActiveSession = {
  id: string;
  courseId: string;
  course: {
    code: string;
    name: string;
    venue: string;
  };
  sessionType: string;
  startTime: string;
  endTime: string;
};

type BasicProfile = {
  studentId: string;
  program: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSessionType(raw: string) {
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

export default function StudentQRCodePage() {
  const { data: authSession } = useSession();

  const [profile, setProfile] = useState<BasicProfile | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrVersion, setQrVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const sessionAvailable = useMemo(() => {
    return activeSession !== null && qrToken !== null;
  }, [activeSession, qrToken]);

  const fetchQrToken = useCallback(async (sessionId: string) => {
    try {
      setQrLoading(true);

      const res = await fetch('/api/attendance/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        console.warn('Generate QR API failed:', res.status);
        setQrToken(null);
        return;
      }

      const data = await res.json();
      setQrToken(data.token ?? null);
      setQrVersion((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to generate QR token:', err);
      setQrToken(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/active-session', {
        cache: 'no-store',
      });

      if (!res.ok) {
        console.warn('Active session API failed:', res.status);
        setActiveSession(null);
        return null;
      }

      const data = await res.json();
      const session = (data.session ?? null) as ActiveSession | null;
      setActiveSession(session);
      return session;
    } catch (err) {
      console.error('Failed to fetch active session:', err);
      setActiveSession(null);
      return null;
    }
  }, []);

  const initialisePage = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [profileRes, sessionData] = await Promise.all([
        fetch('/api/student/profile?basic=1', { cache: 'no-store' }),
        fetchActiveSession(),
      ]);

      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        setProfile({
          studentId: profileJson.studentId || '',
          program: profileJson.program || '',
        });
      } else {
        console.warn('Profile API failed:', profileRes.status);
      }

      if (sessionData) {
        await fetchQrToken(sessionData.id);
      } else {
        setQrToken(null);
      }
    } catch (err) {
      console.error('Failed to initialise QR page:', err);
      setError('Unable to load QR page right now.');
      setQrToken(null);
    } finally {
      setLoading(false);
    }
  }, [fetchActiveSession, fetchQrToken]);

  useEffect(() => {
    initialisePage();
  }, [initialisePage]);

  async function handleRefresh() {
    const sessionData = await fetchActiveSession();

    if (sessionData) {
      await fetchQrToken(sessionData.id);
    } else {
      setQrToken(null);
    }
  }

  async function handleCopyStudentId() {
    if (!profile?.studentId) return;

    try {
      await navigator.clipboard.writeText(profile.studentId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy student ID:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            My QR Code
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Display your QR code during a live attendance session.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={qrLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026] disabled:opacity-60"
          >
            <RefreshCw size={16} className={qrLoading ? 'animate-spin' : ''} />
            Refresh QR
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              QR Status
            </p>
            <QrCode size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {loading ? 'Loading...' : sessionAvailable ? 'Active' : 'No Session'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Live session driven</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Unit Code
            </p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {activeSession?.course.code ?? '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Current active unit</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Session Type
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {activeSession ? formatSessionType(activeSession.sessionType) : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Attendance mode</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Valid Until
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-[#E4002B]">
            {activeSession ? formatTime(activeSession.endTime) : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Refresh if needed</p>
        </div>
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                Attendance QR
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                Show this to your lecturer
              </h2>
            </div>

            <div className="rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-[#E4002B]">
              Version {qrVersion}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-gray-50 py-20">
              <RefreshCw size={32} className="animate-spin text-gray-300" />
              <p className="mt-4 text-sm text-gray-400">Loading session...</p>
            </div>
          ) : sessionAvailable ? (
            <div className="flex flex-col items-center rounded-[28px] bg-gradient-to-br from-rose-50 via-white to-red-50 px-4 py-8">
              <div className="flex h-[260px] w-[260px] items-center justify-center rounded-3xl bg-white p-4 shadow-inner sm:h-[300px] sm:w-[300px]">
                <QRCodeSVG
                  value={qrToken!}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                />
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg font-black tracking-tight text-gray-900">
                  {authSession?.user?.name ?? 'Student'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {profile?.studentId ?? '—'}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                  {activeSession?.course.code} ·{' '}
                  {activeSession ? formatSessionType(activeSession.sessionType) : '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                <QrCode size={28} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                No active session
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-gray-500">
                Your QR code will appear here after a lecturer starts an attendance
                session for one of your classes.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
              Session Details
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
              {activeSession?.course.name ?? 'Waiting for session'}
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Venue
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {activeSession?.course.venue ?? '—'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Start
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {activeSession ? formatTime(activeSession.startTime) : '—'}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    End
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {activeSession ? formatTime(activeSession.endTime) : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Student ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {profile?.studentId ?? '—'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyStudentId}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy ID'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm">
            <p className="text-sm font-bold text-[#E4002B]">Attendance note</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Your QR is generated only when a lecturer has started an active
              attendance session.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}