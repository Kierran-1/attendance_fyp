'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  WifiOff,
} from 'lucide-react';

const TOKEN_TTL     = 60;  // seconds — Stage 1 token lifetime
const CHALLENGE_TTL = 120; // seconds — Stage 2 challenge lifetime
const CHALLENGE_POLL_MS = 2000; // how often to poll for a challenge

type ActiveSession = {
  id: string;
  unitId: string;
  unit: {
    code: string;
    name: string;
    venue?: string;
  };
  sessionName: string;
  sessionTime: string;
  sessionDuration: number;
};

type BasicProfile = {
  studentId: string;
  program: string;
};

type VerificationStage = 'STAGE_1' | 'STAGE_2' | 'VERIFIED';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSessionType(raw: string) {
  const map: Record<string, string> = {
    LECTURE: 'Lecture', TUTORIAL: 'Tutorial', LAB: 'Lab', PRACTICAL: 'Practical',
  };
  return map[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function getEndTime(session: ActiveSession): string {
  const start = new Date(session.sessionTime).getTime();
  const end = new Date(start + session.sessionDuration * 60_000);
  return end.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

function CountdownRing({ seconds, total, color }: { seconds: number; total: number; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - seconds / total);

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="-rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black tabular-nums" style={{ color }}>{seconds}</span>
        <span className="text-[10px] font-semibold text-gray-400">sec</span>
      </div>
    </div>
  );
}

export default function StudentQRCodePage() {
  const { data: authSession } = useSession();

  const [profile, setProfile]             = useState<BasicProfile | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Tokens
  const [stage1Token, setStage1Token]     = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [verificationStage, setVerificationStage] = useState<VerificationStage>('STAGE_1');

  // UI
  const [qrVersion, setQrVersion]         = useState(1);
  const [countdown, setCountdown]         = useState(TOKEN_TTL);
  const [loading, setLoading]             = useState(true);
  const [qrLoading, setQrLoading]         = useState(false);
  const [copied, setCopied]               = useState(false);
  const [error, setError]                 = useState('');

  // Refs
  const activeSessionRef       = useRef<ActiveSession | null>(null);
  const countdownIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengePollRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayToken = challengeToken ?? stage1Token;
  const sessionAvailable = activeSession !== null && displayToken !== null;

  // ── Stage 1 token generation ─────────────────────────────────────────────────

  const fetchQrToken = useCallback(async (sessionId: string) => {
    try {
      setQrLoading(true);
      const res = await fetch('/api/attendance/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) { setStage1Token(null); return; }
      const data = await res.json();
      setStage1Token(data.token ?? null);
      setChallengeToken(null); // reset challenge on new Stage 1 token
      setVerificationStage('STAGE_1');
      setQrVersion((v) => v + 1);
      setCountdown(TOKEN_TTL);
    } catch {
      setStage1Token(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  // ── Challenge polling (Stage 2) ───────────────────────────────────────────────

  const stopChallengePoll = useCallback(() => {
    if (challengePollRef.current) {
      clearInterval(challengePollRef.current);
      challengePollRef.current = null;
    }
  }, []);

  const startChallengePoll = useCallback((sessionId: string) => {
    stopChallengePoll();
    challengePollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/attendance/challenge?sessionId=${sessionId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        if (data.verified) {
          // Stage 2 complete
          setVerificationStage('VERIFIED');
          setChallengeToken(null);
          stopChallengePoll();
          return;
        }

        if (data.challengeToken && data.challengeToken !== challengeToken) {
          setChallengeToken(data.challengeToken);
          setVerificationStage('STAGE_2');
          setQrVersion((v) => v + 1);
          setCountdown(CHALLENGE_TTL);
        }
      } catch { /* silent */ }
    }, CHALLENGE_POLL_MS);
  }, [challengeToken, stopChallengePoll]);

  // ── Auto-refresh Stage 1 token every TOKEN_TTL seconds ───────────────────────

  const scheduleAutoRefresh = useCallback((sessionId: string) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    refreshTimeoutRef.current = setTimeout(async () => {
      const session = activeSessionRef.current;
      if (session && verificationStage === 'STAGE_1') {
        await fetchQrToken(session.id);
        scheduleAutoRefresh(session.id);
      }
    }, TOKEN_TTL * 1000);
  }, [fetchQrToken, verificationStage]);

  // ── Active session polling ────────────────────────────────────────────────────

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/active-session', { cache: 'no-store' });
      if (!res.ok) {
        setActiveSession(null);
        activeSessionRef.current = null;
        return null;
      }
      const data = await res.json();
      const session = (data.session ?? null) as ActiveSession | null;
      setActiveSession(session);
      activeSessionRef.current = session;
      return session;
    } catch {
      setActiveSession(null);
      activeSessionRef.current = null;
      return null;
    }
  }, []);

  // ── Initialise page ───────────────────────────────────────────────────────────

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
        setProfile({ studentId: profileJson.studentId || '', program: profileJson.program || '' });
      }

      if (sessionData) {
        await fetchQrToken(sessionData.id);
        scheduleAutoRefresh(sessionData.id);
        startChallengePoll(sessionData.id);
      } else {
        setStage1Token(null);
      }
    } catch {
      setError('Unable to load QR page right now.');
      setStage1Token(null);
    } finally {
      setLoading(false);
    }
  }, [fetchActiveSession, fetchQrToken, scheduleAutoRefresh, startChallengePoll]);

  useEffect(() => {
    initialisePage();
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      stopChallengePoll();
    };
  }, [initialisePage, stopChallengePoll]);

  // Poll for session every 10 seconds when none active
  useEffect(() => {
    if (sessionAvailable) return;
    const pollInterval = setInterval(async () => {
      const session = await fetchActiveSession();
      if (session) {
        await fetchQrToken(session.id);
        scheduleAutoRefresh(session.id);
        startChallengePoll(session.id);
      }
    }, 10_000);
    return () => clearInterval(pollInterval);
  }, [sessionAvailable, fetchActiveSession, fetchQrToken, scheduleAutoRefresh, startChallengePoll]);

  // ── Manual refresh ────────────────────────────────────────────────────────────

  async function handleRefresh() {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    stopChallengePoll();

    const session = await fetchActiveSession();
    if (session) {
      await fetchQrToken(session.id);
      scheduleAutoRefresh(session.id);
      startChallengePoll(session.id);
    } else {
      setStage1Token(null);
      setChallengeToken(null);
    }
  }

  async function handleCopyStudentId() {
    if (!profile?.studentId) return;
    try {
      await navigator.clipboard.writeText(profile.studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silent */ }
  }

  // ── Stage colours ─────────────────────────────────────────────────────────────

  const stageColor = verificationStage === 'STAGE_2' ? '#7c3aed' : '#E4002B';
  const countdownColor =
    countdown > (verificationStage === 'STAGE_2' ? CHALLENGE_TTL : TOKEN_TTL) * 0.4
      ? stageColor
      : countdown > (verificationStage === 'STAGE_2' ? CHALLENGE_TTL : TOKEN_TTL) * 0.2
      ? '#f59e0b'
      : '#ef4444';

  const stageLabel =
    verificationStage === 'VERIFIED'
      ? 'Verified'
      : verificationStage === 'STAGE_2'
      ? 'Stage 2 — Scan Again'
      : 'Stage 1';

  const stageBadgeClass =
    verificationStage === 'VERIFIED'
      ? 'bg-green-50 text-green-700 border-green-200'
      : verificationStage === 'STAGE_2'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : 'bg-rose-50 text-[#E4002B] border-rose-200';

  // ── Render ────────────────────────────────────────────────────────────────────

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
            Show this to your lecturer. A second scan is required to confirm attendance.
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
        <section className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <WifiOff size={16} />
          {error}
        </section>
      )}

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">QR Status</p>
            <QrCode size={18} className="text-gray-300" />
          </div>
          <p className={`text-2xl font-black tracking-tight ${
            verificationStage === 'VERIFIED' ? 'text-green-600'
            : sessionAvailable ? 'text-green-600' : 'text-gray-400'
          }`}>
            {loading ? 'Loading...' : verificationStage === 'VERIFIED' ? 'Verified' : sessionAvailable ? 'Active' : 'No Session'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {sessionAvailable ? `Version ${qrVersion}` : 'Waiting for lecturer'}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Stage</p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p className={`text-2xl font-black tracking-tight ${
            verificationStage === 'VERIFIED' ? 'text-green-600'
            : verificationStage === 'STAGE_2' ? 'text-violet-600'
            : 'text-gray-900'
          }`}>
            {loading ? '—' : stageLabel}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {verificationStage === 'STAGE_2' ? 'Show this to your lecturer again' : 'Verification step'}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Unit</p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {activeSession?.unit.code ?? '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500 truncate">
            {activeSession?.unit.name ?? 'No active unit'}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Token Expires</p>
            <Timer size={18} className="text-gray-300" />
          </div>
          {sessionAvailable && verificationStage !== 'VERIFIED' ? (
            <p className="text-2xl font-black tabular-nums tracking-tight" style={{ color: countdownColor }}>
              {countdown}s
            </p>
          ) : (
            <p className="text-2xl font-black tracking-tight text-gray-400">—</p>
          )}
          <p className="mt-2 text-xs text-gray-500">Auto-refreshes when expired</p>
        </div>
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

        {/* QR card */}
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: stageColor }}>
                {verificationStage === 'STAGE_2' ? 'Stage 2 QR' : 'Attendance QR'}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
                {verificationStage === 'STAGE_2'
                  ? 'Show this to your lecturer again'
                  : verificationStage === 'VERIFIED'
                  ? 'Attendance confirmed'
                  : 'Show this to your lecturer'}
              </h2>
            </div>
            {sessionAvailable && verificationStage !== 'VERIFIED' && (
              <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-bold ${stageBadgeClass}`}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: stageColor }} />
                {stageLabel}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-gray-50 py-24">
              <RefreshCw size={32} className="animate-spin text-gray-300" />
              <p className="mt-4 text-sm text-gray-400">Loading session...</p>
            </div>

          ) : verificationStage === 'VERIFIED' ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-green-50 py-20 text-center">
              <CheckCircle2 size={56} className="text-green-500" />
              <h3 className="mt-4 text-xl font-black text-green-700">Attendance Confirmed</h3>
              <p className="mt-2 text-sm text-green-600">
                Both stages verified — you are marked <strong>PRESENT</strong>.
              </p>
            </div>

          ) : sessionAvailable ? (
            <div
              className="flex flex-col items-center rounded-[28px] px-4 py-8"
              style={{
                background: verificationStage === 'STAGE_2'
                  ? 'linear-gradient(135deg, #f5f3ff, #ffffff, #ede9fe)'
                  : 'linear-gradient(135deg, #fff1f2, #ffffff, #fee2e2)',
              }}
            >
              <div className="relative flex h-[280px] w-[280px] items-center justify-center rounded-3xl bg-white p-4 shadow-inner sm:h-[300px] sm:w-[300px]">
                <QRCodeSVG
                  value={displayToken!}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                />
                {qrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/80 backdrop-blur-sm">
                    <RefreshCw size={28} className="animate-spin" style={{ color: stageColor }} />
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col items-center gap-3">
                <CountdownRing
                  seconds={countdown}
                  total={verificationStage === 'STAGE_2' ? CHALLENGE_TTL : TOKEN_TTL}
                  color={countdownColor}
                />
                <p className="text-xs text-gray-400">
                  {verificationStage === 'STAGE_2'
                    ? 'Challenge token — show to lecturer now'
                    : 'Token refreshes automatically'}
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="text-lg font-black tracking-tight text-gray-900">
                  {authSession?.user?.name ?? 'Student'}
                </p>
                <p className="mt-0.5 text-sm text-gray-400">{profile?.studentId ?? '—'}</p>
                <p className="mt-1.5 text-sm font-bold" style={{ color: stageColor }}>
                  {activeSession?.unit.code} · {activeSession ? formatSessionType(activeSession.sessionName) : '—'}
                </p>
              </div>
            </div>

          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-gray-50 px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <QrCode size={28} className="text-gray-300" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">No active session</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-gray-400">
                Your QR code will appear here once your lecturer starts an attendance session.
              </p>
              <p className="mt-4 text-xs text-gray-400">Checking every 10 seconds…</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Session details */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
              Session Details
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-gray-900">
              {activeSession?.unit.name ?? 'Waiting for session'}
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                <MapPin size={15} className="flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Venue</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activeSession?.unit.venue ?? '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Start</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {activeSession ? formatTime(activeSession.sessionTime) : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">End</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {activeSession ? getEndTime(activeSession) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Student ID</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {profile?.studentId ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyStudentId}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
            <p className="text-sm font-bold text-[#E4002B]">How it works</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-7 text-gray-700">
              <li className={`flex items-start gap-2 ${verificationStage !== 'STAGE_1' ? 'opacity-50 line-through' : ''}`}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#E4002B]" />
                <span><strong>Stage 1:</strong> Show your QR — lecturer scans it</span>
              </li>
              <li className={`flex items-start gap-2 ${verificationStage === 'STAGE_1' ? 'opacity-40' : verificationStage === 'VERIFIED' ? 'opacity-50 line-through' : ''}`}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />
                <span><strong>Stage 2:</strong> QR refreshes — show it again for final confirmation</span>
              </li>
              <li className={`flex items-start gap-2 ${verificationStage !== 'VERIFIED' ? 'opacity-40' : ''}`}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                <span><strong>Confirmed:</strong> Attendance marked PRESENT</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
