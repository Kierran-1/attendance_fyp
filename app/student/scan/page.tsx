'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  ScanLine,
  StopCircle,
  Volume2,
  XCircle,
} from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'submitting' | 'success' | 'error';

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
  location?: string | null;
  weekNumber?: number | null;
  groupNo?: string | null;
  lecturer?: string | null;
};

function formatSessionType(raw: string) {
  const upper = raw.toUpperCase();

  if (upper.includes('LECTURE') || upper === 'LE') return 'Lecture';
  if (upper.includes('TUTORIAL') || upper === 'TU') return 'Tutorial';
  if (upper.includes('LAB') || upper === 'LA') return 'Lab';

  return raw;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEndTime(iso: string, durationMinutes: number) {
  const start = new Date(iso).getTime();
  const end = new Date(start + durationMinutes * 60_000);

  return end.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function playSuccessFeedback() {
  // Small feedback so the student knows it worked without needing to read the message. Vibrate if supported, and play a short sound.
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(120);
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {
    // Best-effort only. If audio is blocked, just ignore it.
  }
}

export default function StudentScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [message, setMessage] = useState('');
  const [unitInfo, setUnitInfo] = useState<{ code: string; name: string } | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const submittingRef = useRef(false);

  function stopScanner() {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    readerRef.current = null;
  }

  async function loadActiveSession() {
    try {
      setSessionLoading(true);

      const res = await fetch('/api/attendance/active-session', {
        cache: 'no-store',
      });

      if (!res.ok) {
        setActiveSession(null);
        return;
      }

      const data = await res.json();
      setActiveSession((data.session ?? null) as ActiveSession | null);
    } catch (err) {
      console.error('Failed to load active session on student scan page:', err);
      setActiveSession(null);
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => {
    loadActiveSession();

    return () => {
      stopScanner();
    };
  }, []);

  // Auto-submit when arriving via QR link (e.g. scanned from lecturer's screen)
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token && !submittingRef.current) {
      submittingRef.current = true;
      submitToken(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    setScanState('scanning');
    setMessage('');
    setUnitInfo(null);
    submittingRef.current = false;

    readerRef.current = new BrowserQRCodeReader();

    try {
      controlsRef.current = await readerRef.current.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        'student-qr-video',
        async (result) => {
          if (result && !submittingRef.current) {
            submittingRef.current = true;
            stopScanner();
            await submitToken(result.getText());
          }
        }
      );
    } catch {
      setScanState('error');
      setMessage('Camera not available or permission denied.');
    }
  }

  function handleStop() {
    stopScanner();
    setScanState('idle');
    setMessage('');
  }

  async function submitToken(token: string) {
    setScanState('submitting');

    try {
      const res = await fetch('/api/attendance/session-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setScanState('success');
        setMessage(data.message ?? 'Attendance marked!');
        setUnitInfo(
          data.unitCode ? { code: data.unitCode, name: data.unitName ?? '' } : null
        );
        playSuccessFeedback();

        // Refresh active session after a successful scan, in case the lecturer updated the session info or ended it
        await loadActiveSession();
      } else {
        setScanState('error');
        setMessage(data.error ?? 'Failed to mark attendance.');
      }
    } catch {
      setScanState('error');
      setMessage('Network error — please try again.');
    }
  }

  function handleReset() {
    setScanState('idle');
    setMessage('');
    setUnitInfo(null);
    submittingRef.current = false;
  }

  const activeVenue = useMemo(() => {
    return activeSession?.location?.trim() || activeSession?.unit.venue?.trim() || 'Venue not available';
  }, [activeSession]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Scan Attendance QR
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Use this page when your lecturer displays the session QR for students to scan.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={loadActiveSession}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <RefreshCw size={16} />
            Refresh Session
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">Scanner</h2>
            <ScanLine size={18} className="text-gray-300" />
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl bg-black ${
              scanState === 'scanning' ? 'block' : 'hidden'
            }`}
            style={{ aspectRatio: '1 / 1' }}
          >
            <video id="student-qr-video" className="h-full w-full object-cover" />

            {/* Simple guide box so scanning is easier during testing */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-52 w-52 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>

            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80">
                Align QR code inside the frame
              </span>
            </div>
          </div>

          {scanState === 'success' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <p className="mt-4 text-lg font-black text-gray-900">Attendance Marked</p>
              {unitInfo && (
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {unitInfo.code} — {unitInfo.name}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-400">{message}</p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                <Volume2 size={14} />
                Feedback sent
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="mt-5 rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                Scan Another QR
              </button>
            </div>
          )}

          {scanState === 'error' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle size={36} className="text-red-400" />
              </div>
              <p className="mt-4 text-base font-bold text-gray-900">Scan Failed</p>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-5 rounded-2xl bg-[#E4002B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#C70026]"
              >
                Try Again
              </button>
            </div>
          )}

          {scanState === 'submitting' && (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 size={36} className="animate-spin text-[#E4002B]" />
              <p className="mt-4 text-sm font-semibold text-gray-500">Verifying attendance…</p>
            </div>
          )}

          {(scanState === 'idle' || scanState === 'scanning') && (
            <div className="mt-4 space-y-3">
              {scanState === 'idle' ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E4002B] py-3.5 text-sm font-bold text-white transition hover:bg-[#C70026]"
                >
                  <Camera size={16} />
                  Open Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-800 py-3.5 text-sm font-bold text-white transition hover:bg-gray-900"
                >
                  <StopCircle size={16} />
                  Stop Camera
                </button>
              )}

              <p className="text-center text-xs text-gray-400">
                {scanState === 'idle'
                  ? 'Camera access is required before scanning.'
                  : 'Scanning now — keep the QR steady and well lit.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Current Active Session</h2>
              <Clock3 size={18} className="text-gray-300" />
            </div>

            {sessionLoading ? (
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin text-[#E4002B]" />
                Loading active session...
              </div>
            ) : activeSession ? (
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Session
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
                      {formatTime(activeSession.sessionTime)} –{' '}
                      {getEndTime(activeSession.sessionTime, activeSession.sessionDuration)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Venue
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                      <MapPin size={14} className="text-gray-400" />
                      {activeVenue}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Lecturer
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {activeSession.lecturer || 'Not assigned'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  This page is the backup flow. It is useful when the lecturer shows the session QR for students to scan directly.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No active lecturer session is available for your enrolled classes right now.
              </div>
            )}
          </div>

          {scanState === 'idle' && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <ScanLine size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
              <p className="text-xs text-blue-700">
                Ask the lecturer to keep the QR bright and steady on screen. That usually makes first-time scanning much faster.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}