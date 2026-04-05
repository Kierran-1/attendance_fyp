'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { QRCodeSVG } from 'qrcode.react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RadioTower,
  RefreshCw,
  ScanLine,
  StopCircle,
  XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveSession = {
  id: string;
  unitId: string;
  unit: { code: string; name: string };
  sessionName: string;
  sessionTime: string;
  sessionDuration: number;
};

type CheckInRecord = {
  id: string;
  studentName: string;
  studentId: string;
  checkInTime: string | null;
  status: string;
};

const TOKEN_TTL = 60;

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DevAttendanceTestPage() {
  // ── Session state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // ── Student QR panel ───────────────────────────────────────────────────────
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [countdown, setCountdown] = useState(TOKEN_TTL);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lecturer scan panel ────────────────────────────────────────────────────
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Check-in log ───────────────────────────────────────────────────────────
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [checkInsLoading, setCheckInsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;

  // ── Load active sessions ───────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch('/api/attendance/active-session');
      if (!res.ok) return;
      const data = await res.json();
      const list: ActiveSession[] = data.sessions ?? (data.session ? [data.session] : []);
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    } catch {
      // silent
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── QR token generation ────────────────────────────────────────────────────

  const generateToken = useCallback(async (sessionId: string) => {
    try {
      setQrLoading(true);
      const res = await fetch('/api/dev/qr-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) { setQrToken(null); return; }
      const data = await res.json();
      setQrToken(data.token ?? null);
      setCountdown(TOKEN_TTL);
    } catch {
      setQrToken(null);
    } finally {
      setQrLoading(false);
    }
  }, []);

  const scheduleTokenRefresh = useCallback((sessionId: string) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (refreshRef.current) clearTimeout(refreshRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    refreshRef.current = setTimeout(async () => {
      await generateToken(sessionId);
      scheduleTokenRefresh(sessionId);
    }, TOKEN_TTL * 1000);
  }, [generateToken]);

  useEffect(() => {
    if (!selectedSessionId) return;
    generateToken(selectedSessionId);
    scheduleTokenRefresh(selectedSessionId);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (refreshRef.current) clearTimeout(refreshRef.current);
    };
  }, [selectedSessionId, generateToken, scheduleTokenRefresh]);

  // ── Check-in polling ───────────────────────────────────────────────────────

  const fetchCheckIns = useCallback(async (sessionId: string) => {
    try {
      setCheckInsLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}/records`);
      if (!res.ok) return;
      const data = await res.json();
      setCheckIns(data.records ?? []);
    } catch {
      // silent
    } finally {
      setCheckInsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    fetchCheckIns(selectedSessionId);
    pollRef.current = setInterval(() => fetchCheckIns(selectedSessionId), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedSessionId, fetchCheckIns]);

  // ── Scanner ────────────────────────────────────────────────────────────────

  async function startScanner() {
    setScanResult(null);
    readerRef.current = new BrowserQRCodeReader();
    setScanning(true);
    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        'dev-qr-video',
        async (result) => {
          if (result) await submitScan(result.getText());
        }
      );
    } catch {
      setScanResult({ ok: false, message: 'Camera not available or permission denied.' });
      setScanning(false);
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setScanning(false);
  }

  // ── Submit scan ────────────────────────────────────────────────────────────

  async function submitScan(token: string) {
    if (!token.trim()) return;
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setScanResult({ ok: true, message: `Attendance marked ✓ — ${data.record?.status ?? 'PRESENT'}` });
        if (selectedSessionId) fetchCheckIns(selectedSessionId);
      } else {
        setScanResult({ ok: false, message: data.error ?? 'Scan failed' });
      }
    } catch {
      setScanResult({ ok: false, message: 'Network error — please try again.' });
    }
    setTimeout(() => setScanResult(null), 4000);
  }

  async function handleManualSubmit() {
    if (!manualToken.trim()) return;
    setSubmitting(true);
    await submitScan(manualToken.trim());
    setManualToken('');
    setSubmitting(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          DEV ONLY
        </div>
        <h1 className="mt-3 text-2xl font-black text-gray-900">Attendance Flow Tester</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test the full QR attendance loop as a single user. Left = student QR · Right = lecturer scanner.
        </p>
      </div>

      {/* Session selector */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-60">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">
              Active Session
            </label>
            {sessionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-400">
                No active sessions found. Start one from{' '}
                <a href="/lecturer/live-attendance" className="text-[#E4002B] underline">
                  Live Attendance
                </a>
                .
              </p>
            ) : (
              <div className="relative">
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-8 text-sm font-semibold text-gray-900 outline-none focus:border-[#E4002B]"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.unit.code} — {s.sessionName} — started {formatTime(s.sessionTime)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={loadSessions}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-[#E4002B]/30 hover:text-[#E4002B]"
          >
            <RefreshCw size={14} className={sessionsLoading ? 'animate-spin' : ''} />
            Refresh Sessions
          </button>
        </div>

        {selectedSession && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-semibold">
              {selectedSession.unit.name}
            </span>
            <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-semibold">
              Duration: {selectedSession.sessionDuration} min
            </span>
            <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-mono">
              ID: {selectedSession.id.slice(0, 16)}…
            </span>
          </div>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── LEFT: Student QR ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#E4002B]">Student Side</p>
              <h2 className="mt-1 text-base font-black text-gray-900">QR Code</h2>
            </div>
            {qrToken && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                Live · {countdown}s
              </div>
            )}
          </div>

          {!selectedSession ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-16 text-center">
              <RadioTower size={28} className="text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">Select an active session above</p>
            </div>
          ) : qrLoading && !qrToken ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-16">
              <Loader2 size={28} className="animate-spin text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">Generating token…</p>
            </div>
          ) : qrToken ? (
            <div className="flex flex-col items-center">
              <div className="relative rounded-2xl bg-white p-4 shadow-inner ring-1 ring-gray-100">
                <QRCodeSVG
                  value={qrToken}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                />
                {qrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                    <RefreshCw size={24} className="animate-spin text-[#E4002B]" />
                  </div>
                )}
              </div>

              {/* Countdown bar */}
              <div className="mt-4 w-full">
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Token expires in</span>
                  <span className="font-bold tabular-nums">{countdown}s</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#E4002B] transition-all duration-1000"
                    style={{ width: `${(countdown / TOKEN_TTL) * 100}%` }}
                  />
                </div>
              </div>

              {/* Raw token for manual copy */}
              <div className="mt-4 w-full">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Raw Token (copy to scanner below)
                </p>
                <textarea
                  readOnly
                  value={qrToken}
                  rows={3}
                  onClick={(e) => {
                    (e.target as HTMLTextAreaElement).select();
                    navigator.clipboard.writeText(qrToken);
                  }}
                  className="w-full cursor-pointer select-all rounded-xl border border-gray-200 bg-gray-50 p-2.5 font-mono text-[10px] leading-relaxed text-gray-600 outline-none focus:border-[#E4002B]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Click to copy · paste into scanner on the right</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-16 text-center">
              <XCircle size={28} className="text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">Could not generate token</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Lecturer Scanner ── */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E4002B]">Lecturer Side</p>
              <h2 className="mt-1 text-base font-black text-gray-900 flex items-center gap-2">
                <ScanLine size={16} />
                QR Scanner
              </h2>
            </div>

            {/* Camera */}
            <div className="space-y-3">
              <div
                className={`relative overflow-hidden rounded-xl bg-black ${scanning ? 'block' : 'hidden'}`}
                style={{ aspectRatio: '4/3' }}
              >
                <video id="dev-qr-video" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              </div>

              {!scanning ? (
                <button
                  type="button"
                  onClick={startScanner}
                  disabled={!selectedSession}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B] disabled:opacity-40"
                >
                  <Camera size={15} /> Open Camera Scanner
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
                >
                  <StopCircle size={15} /> Stop Camera
                </button>
              )}

              {/* Scan result */}
              {scanResult && (
                <div
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                    scanResult.ok
                      ? 'border border-green-100 bg-green-50 text-green-700'
                      : 'border border-red-100 bg-red-50 text-red-700'
                  }`}
                >
                  {scanResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  {scanResult.message}
                </div>
              )}

              {/* Manual paste */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Paste Token Manually
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Paste QR token here…"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs outline-none transition focus:border-[#E4002B] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={!manualToken.trim() || submitting || !selectedSession}
                    className="rounded-xl bg-[#E4002B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C70026] disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Check-in log */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Check-in Log</h3>
                <p className="text-xs text-gray-400">
                  {selectedSession
                    ? `${checkIns.length} recorded · polls every 3s`
                    : 'No session selected'}
                </p>
              </div>
              {selectedSession && (
                <button
                  type="button"
                  onClick={() => fetchCheckIns(selectedSessionId)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:text-[#E4002B]"
                >
                  <RefreshCw size={13} className={checkInsLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            {checkIns.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                {selectedSession ? 'No check-ins yet' : 'Select a session'}
              </div>
            ) : (
              <ul className="max-h-64 divide-y divide-gray-50 overflow-y-auto">
                {checkIns.map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-[10px] font-black text-green-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{r.studentName}</p>
                      <p className="text-xs text-gray-400">{r.studentId}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'border-green-100 bg-green-50 text-green-700'
                            : r.status === 'LATE'
                            ? 'border-amber-100 bg-amber-50 text-amber-700'
                            : 'border-red-100 bg-red-50 text-red-600'
                        }`}
                      >
                        {r.status === 'PRESENT' && <CheckCircle2 size={9} />}
                        {r.status}
                      </span>
                      <p className="mt-0.5 text-[10px] text-gray-400">{formatTime(r.checkInTime)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
