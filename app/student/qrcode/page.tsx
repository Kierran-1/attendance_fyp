'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type ActiveSession = {
  id: string;
  courseId: string;
  course: { code: string; name: string; venue: string };
  sessionType: string;
  startTime: string;
  endTime: string;
};

type StudentProfile = {
  studentId: string;
  major: string | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSessionType(raw: string) {
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export default function StudentQRCodePage() {
  const { data: authSession } = useSession();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrVersion, setQrVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchQrToken = useCallback(async (sessionId: string) => {
    setQrLoading(true);
    try {
      const res = await fetch('/api/attendance/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      setQrToken(data.token ?? null);
      setQrVersion((v) => v + 1);
    } catch {
      setQrToken(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  const fetchActiveSession = useCallback(async () => {
    const res = await fetch('/api/attendance/active-session');
    const data = await res.json();
    const session: ActiveSession | null = data.session ?? null;
    setActiveSession(session);
    return session;
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [dashRes, session] = await Promise.all([
          fetch('/api/student/dashboard').then((r) => r.json()),
          fetchActiveSession(),
        ]);
        if (dashRes.profile) {
          setProfile({ studentId: dashRes.profile.studentId, major: dashRes.profile.major });
        }
        if (session) {
          await fetchQrToken(session.id);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchActiveSession, fetchQrToken]);

  async function handleRefresh() {
    const session = await fetchActiveSession();
    if (session) {
      await fetchQrToken(session.id);
    }
  }

  async function handleCopyStudentId() {
    if (!profile?.studentId) return;
    try {
      await navigator.clipboard.writeText(profile.studentId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const sessionAvailable = activeSession !== null && qrToken !== null;

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
            Display your attendance QR code for lecturer scanning during an active
            session.
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

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              QR Status
            </p>
            <QrCode size={18} className="text-gray-300" />
          </div>
          <p className={`text-2xl font-black tracking-tight ${loading ? 'text-gray-400' : sessionAvailable ? 'text-green-600' : 'text-gray-400'}`}>
            {loading ? 'Loading…' : sessionAvailable ? 'Active' : 'No Session'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Based on current session availability
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Unit Code
            </p>
            <CheckCircle2 size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {activeSession?.course.code ?? '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Current displayed session</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Session Type
            </p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {activeSession ? formatSessionType(activeSession.sessionType) : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Student-facing session label
          </p>
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
          <p className="mt-2 text-xs text-gray-500">Refresh when needed</p>
        </div>
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* QR display panel */}
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                Attendance QR
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                Show this code to your lecturer
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-500">
                Keep the code visible during scanning and refresh it if instructed.
              </p>
            </div>

            <div className="rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-[#E4002B]">
              Version {qrVersion}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-gray-50 py-20">
              <RefreshCw size={32} className="animate-spin text-gray-300" />
              <p className="mt-4 text-sm text-gray-400">Loading session…</p>
            </div>
          ) : sessionAvailable ? (
            <div className="flex flex-col items-center rounded-[28px] bg-gradient-to-br from-rose-50 via-white to-red-50 px-4 py-8">
              <div className="h-[260px] w-[260px] rounded-3xl bg-white p-4 shadow-inner sm:h-[300px] sm:w-[300px] flex items-center justify-center">
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
                  {authSession?.user?.name ?? '—'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {profile?.studentId ?? '—'}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                  {activeSession.course.code} ·{' '}
                  {formatSessionType(activeSession.sessionType)} Session
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={qrLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026] disabled:opacity-60"
                >
                  <RefreshCw size={16} className={qrLoading ? 'animate-spin' : ''} />
                  Refresh QR
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                >
                  <Download size={16} />
                  Print Page
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
              <h3 className="text-xl font-black tracking-tight text-gray-900">
                No active attendance session
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-500">
                Your lecturer has not opened an attendance window yet. Return later
                or check your dashboard for updates.
              </p>
            </div>
          )}
        </div>

        {/* Right info column */}
        <div className="space-y-6">
          {/* Session info */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">
              Current Session Information
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Basic details for the attendance session currently shown.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Unit
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {activeSession?.course.code ?? '—'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {activeSession?.course.name ?? 'No session active'}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Session
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {activeSession ? `${formatSessionType(activeSession.sessionType)} Session` : '—'}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Venue
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {activeSession?.course.venue ?? '—'}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Valid Until
                </p>
                <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                  {activeSession ? formatTime(activeSession.endTime) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Student info */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">
              Student Information
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Visible account details related to this page.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Student Name
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {authSession?.user?.name ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Student ID
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {profile?.studentId ?? '—'}
                  </p>

                  {profile?.studentId && (
                    <button
                      type="button"
                      onClick={handleCopyStudentId}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                    >
                      <Copy size={12} />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Email
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {authSession?.user?.email ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Program
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {profile?.major ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
