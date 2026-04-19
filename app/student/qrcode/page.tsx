'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  WifiOff,
  ChevronRight,
} from 'lucide-react';

const TOKEN_TTL = 60;
const CHALLENGE_TTL = 120;
const CHALLENGE_POLL_MS = 2000;

type ActiveSession = {
  id: string;
  unitId: string;
  unit: {
    code: string;
    name: string;
    venue?: string | null;
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
  const upper = raw.toUpperCase();

  if (upper.includes('LECTURE') || upper === 'LE') return 'Lecture';
  if (upper.includes('TUTORIAL') || upper === 'TU') return 'Tutorial';
  if (upper.includes('LAB') || upper === 'LA') return 'Lab';
  if (upper.includes('PRACTICAL') || upper === 'PR') return 'Practical';

  return raw;
}

function getEndTime(session: ActiveSession) {
  const start = new Date(session.sessionTime).getTime();
  const end = new Date(start + session.sessionDuration * 60_000);

  return end.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CountdownRing({
  seconds,
  total,
  color,
}: {
  seconds: number;
  total: number;
  color: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? seconds / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="-rotate-90" width="96" height="96">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="6"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black tabular-nums" style={{ color }}>
          {seconds}
        </span>
        <span className="text-[10px] font-semibold text-gray-400">sec</span>
      </div>
    </div>
  );
}

export default function StudentQRCodePage() {
  const [profile, setProfile] = useState<BasicProfile | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const [stage1Token, setStage1Token] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [verificationStage, setVerificationStage] =
    useState<VerificationStage>('STAGE_1');

  const [qrVersion, setQrVersion] = useState(1);
  const [countdown, setCountdown] = useState(TOKEN_TTL);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const activeSessionRef = useRef<ActiveSession | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayToken = challengeToken ?? stage1Token;
  const sessionAvailable = activeSession !== null && displayToken !== null;

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const stopChallengePoll = useCallback(() => {
    if (challengePollRef.current) {
      clearInterval(challengePollRef.current);
      challengePollRef.current = null;
    }
  }, []);

  const fetchQrToken = useCallback(async (sessionId: string) => {
    try {
      setQrLoading(true);

      const res = await fetch('/api/attendance/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        setStage1Token(null);
        return;
      }

      const data = await res.json();

      setStage1Token(data.token ?? null);
      setChallengeToken(null);
      setVerificationStage('STAGE_1');
      setQrVersion((prev) => prev + 1);
      setCountdown(TOKEN_TTL);
    } catch (err) {
      console.error('Failed to generate QR token:', err);
      setStage1Token(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  const startChallengePoll = useCallback(
    (sessionId: string) => {
      stopChallengePoll();

      challengePollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/attendance/challenge?sessionId=${encodeURIComponent(sessionId)}`,
            {
              cache: 'no-store',
            }
          );

          if (!res.ok) return;

          const data = await res.json();

          if (data.verified) {
            setVerificationStage('VERIFIED');
            setChallengeToken(null);
            clearTimers();
            stopChallengePoll();
            return;
          }

          // Update challenge token if a new one is received
          if (data.challengeToken) {
            setChallengeToken(data.challengeToken);
            setVerificationStage('STAGE_2');
            setQrVersion((prev) => prev + 1);
            setCountdown(CHALLENGE_TTL);
            clearTimers();

            countdownIntervalRef.current = setInterval(() => {
              setCountdown((prev) => Math.max(0, prev - 1));
            }, 1000);

            refreshTimeoutRef.current = setTimeout(() => {
              setChallengeToken(null);
              setVerificationStage('STAGE_1');
              setCountdown(TOKEN_TTL);
            }, CHALLENGE_TTL * 1000);
          }
        } catch (err) {
          console.error('Challenge poll failed:', err);
        }
      }, CHALLENGE_POLL_MS);
    },
    [clearTimers, stopChallengePoll]
  );

  const scheduleAutoRefresh = useCallback(
    (sessionId: string) => {
      clearTimers();

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      refreshTimeoutRef.current = setTimeout(async () => {
        const currentSession = activeSessionRef.current;

        if (currentSession && verificationStage === 'STAGE_1') {
          await fetchQrToken(currentSession.id);
          scheduleAutoRefresh(sessionId);
        }
      }, TOKEN_TTL * 1000);
    },
    [clearTimers, fetchQrToken, verificationStage]
  );

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/active-session', {
        cache: 'no-store',
      });

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
    } catch (err) {
      console.error('Failed to fetch active session:', err);
      setActiveSession(null);
      activeSessionRef.current = null;
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
          studentId: profileJson.studentId ?? '',
          program: profileJson.program ?? '',
        });
      }

      if (sessionData) {
        await fetchQrToken(sessionData.id);
        scheduleAutoRefresh(sessionData.id);
        startChallengePoll(sessionData.id);
      } else {
        setStage1Token(null);
        setChallengeToken(null);
      }
    } catch (err) {
      console.error('Failed to initialise QR page:', err);
      setError('Unable to load QR page right now.');
      setStage1Token(null);
      setChallengeToken(null);
    } finally {
      setLoading(false);
    }
  }, [fetchActiveSession, fetchQrToken, scheduleAutoRefresh, startChallengePoll]);

  useEffect(() => {
    initialisePage();

    return () => {
      clearTimers();
      stopChallengePoll();
    };
  }, [clearTimers, initialisePage, stopChallengePoll]);

  useEffect(() => {
    if (sessionAvailable || loading) return;

    const pollInterval = setInterval(async () => {
      const session = await fetchActiveSession();

      if (session) {
        await fetchQrToken(session.id);
        scheduleAutoRefresh(session.id);
        startChallengePoll(session.id);
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [
    fetchActiveSession,
    fetchQrToken,
    loading,
    scheduleAutoRefresh,
    sessionAvailable,
    startChallengePoll,
  ]);

  const handleRefresh = useCallback(async () => {
    clearTimers();
    stopChallengePoll();

    const session = await fetchActiveSession();

    if (session) {
      await fetchQrToken(session.id);
      scheduleAutoRefresh(session.id);
      startChallengePoll(session.id);
    } else {
      setStage1Token(null);
      setChallengeToken(null);
      setVerificationStage('STAGE_1');
      setCountdown(TOKEN_TTL);
    }
  }, [
    clearTimers,
    fetchActiveSession,
    fetchQrToken,
    scheduleAutoRefresh,
    startChallengePoll,
    stopChallengePoll,
  ]);

  const handleCopyStudentId = useCallback(async () => {
    if (!profile?.studentId) return;

    try {
      await navigator.clipboard.writeText(profile.studentId);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error('Copy student ID failed:', err);
    }
  }, [profile?.studentId]);

  const stageColor = useMemo(() => {
    if (verificationStage === 'VERIFIED') return '#16a34a';
    if (verificationStage === 'STAGE_2') return '#7c3aed';
    return '#E4002B';
  }, [verificationStage]);

  const activeTotalTtl = verificationStage === 'STAGE_2' ? CHALLENGE_TTL : TOKEN_TTL;

  const countdownColor = useMemo(() => {
    if (countdown > activeTotalTtl * 0.4) return stageColor;
    if (countdown > activeTotalTtl * 0.2) return '#f59e0b';
    return '#ef4444';
  }, [activeTotalTtl, countdown, stageColor]);

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">QR Code</span>
      </nav>

      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            My <span className="text-red-600">QR Code</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            Use this page during a live attendance session. Your QR updates in real time
            to support the lecturer verification flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-red-100 hover:text-red-600"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={qrLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:opacity-60"
          >
            <RefreshCw size={16} className={qrLoading ? 'animate-spin' : ''} />
            Refresh QR
          </button>
        </div>
      </section>

      {error ? (
        <section className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <WifiOff size={16} />
          {error}
        </section>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              QR Status
            </p>
            <QrCode size={18} className="text-gray-300" />
          </div>
          <p
            className={`text-3xl font-black tracking-tight ${
              verificationStage === 'VERIFIED'
                ? 'text-green-600'
                : sessionAvailable
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            {loading
              ? '...'
              : verificationStage === 'VERIFIED'
              ? 'Verified'
              : sessionAvailable
              ? 'Active'
              : 'No Session'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {sessionAvailable ? `Version ${qrVersion}` : 'Waiting for lecturer'}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Verification
            </p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p
            className={`text-3xl font-black tracking-tight ${
              verificationStage === 'VERIFIED'
                ? 'text-green-600'
                : verificationStage === 'STAGE_2'
                ? 'text-violet-600'
                : 'text-gray-900'
            }`}
          >
            {loading ? '—' : stageLabel}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {verificationStage === 'STAGE_2'
              ? 'Show the updated QR again'
              : 'Current verification stage'}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Active Unit
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-3xl font-black tracking-tight text-gray-900">
            {activeSession?.unit.code ?? '—'}
          </p>
          <p className="mt-2 truncate text-xs text-gray-500">
            {activeSession?.unit.name ?? 'No active unit'}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Token Expires
            </p>
            <Timer size={18} className="text-gray-300" />
          </div>
          <p
            className="text-3xl font-black tracking-tight"
            style={{
              color:
                sessionAvailable && verificationStage !== 'VERIFIED'
                  ? countdownColor
                  : '#9ca3af',
            }}
          >
            {sessionAvailable && verificationStage !== 'VERIFIED' ? `${countdown}s` : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Auto-refreshes while session is active</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: stageColor }}
              >
                {verificationStage === 'STAGE_2'
                  ? 'Stage 2 QR'
                  : verificationStage === 'VERIFIED'
                  ? 'Attendance Verified'
                  : 'Attendance QR'}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
                {verificationStage === 'STAGE_2'
                  ? 'Show this to your lecturer again'
                  : verificationStage === 'VERIFIED'
                  ? 'Attendance confirmed'
                  : 'Show this to your lecturer'}
              </h2>
            </div>

            {sessionAvailable && verificationStage !== 'VERIFIED' ? (
              <span
                className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-bold ${stageBadgeClass}`}
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: stageColor }}
                />
                {stageLabel}
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-gray-50 py-24">
              <Loader2 size={32} className="animate-spin text-gray-300" />
              <p className="mt-4 text-sm text-gray-400">Loading session...</p>
            </div>
          ) : verificationStage === 'VERIFIED' ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-green-50 py-20 text-center">
              <CheckCircle2 size={56} className="text-green-500" />
              <h3 className="mt-4 text-xl font-black text-green-700">
                Attendance Confirmed
              </h3>
              <p className="mt-2 text-sm text-green-600">
                Both stages completed successfully.
              </p>
            </div>
          ) : sessionAvailable && displayToken ? (
            <div
              className="flex flex-col items-center rounded-[28px] px-4 py-8"
              style={{
                background:
                  verificationStage === 'STAGE_2'
                    ? 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)'
                    : 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)',
              }}
            >
              <div className="mb-6 rounded-[2rem] bg-white p-4 shadow-sm sm:p-6">
                <QRCodeSVG
                  value={displayToken}
                  size={260}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#111827"
                />
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <CountdownRing
                  seconds={countdown}
                  total={activeTotalTtl}
                  color={countdownColor}
                />

                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900">
                    {verificationStage === 'STAGE_2'
                      ? 'Second verification required'
                      : 'Waiting for lecturer scan'}
                  </p>
                  <p className="max-w-md text-sm text-gray-500">
                    {verificationStage === 'STAGE_2'
                      ? 'Your lecturer has scanned stage 1. Present this refreshed QR immediately to complete attendance verification.'
                      : 'Keep this screen open until the lecturer scans your QR code.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-gray-50 py-20 text-center">
              <QrCode size={52} className="text-gray-300" />
              <h3 className="mt-4 text-xl font-black text-gray-700">
                No active session right now
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Once a lecturer starts attendance for one of your enrolled units, your QR
                will appear here automatically.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Session Details</h2>
              <Clock3 size={18} className="text-gray-300" />
            </div>

            {activeSession ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Unit
                  </p>
                  <p className="mt-1 text-base font-black text-gray-900">
                    {activeSession.unit.code}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{activeSession.unit.name}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Session Type
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatSessionType(activeSession.sessionName)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Time
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatTime(activeSession.sessionTime)} – {getEndTime(activeSession)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Duration
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {activeSession.sessionDuration} minutes
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Venue
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                      <MapPin size={14} className="text-gray-400" />
                      {activeSession.unit.venue?.trim() || 'Venue not available'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No active attendance session is available for your enrolled classes.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Student Details</h2>
              <ShieldCheck size={18} className="text-gray-300" />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Student ID
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-gray-900">
                    {profile?.studentId || 'Not available'}
                  </p>

                  <button
                    type="button"
                    onClick={handleCopyStudentId}
                    disabled={!profile?.studentId}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-red-100 hover:text-red-600 disabled:opacity-50"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Programme
                </p>
                <p className="mt-2 text-sm font-bold text-gray-900">
                  {profile?.program || 'Not available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}