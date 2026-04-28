'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { QRCodeSVG } from 'qrcode.react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  QrCode,
  RadioTower,
  RefreshCw,
  ScanLine,
  StopCircle,
  Users,
  XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionName = 'LECTURE' | 'TUTORIAL' | 'LAB';

type LecturerUnit = {
  id: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  semester: string;
  year: number;
  classType: string;
  group: string;
  subcomponent: string;
  students: { id: string; studentNumber: string; name: string }[];
  sessions: { id: string; status: string; presentCount: number; absentCount: number }[];
};

type CheckInRecord = {
  id: string;
  studentName: string;
  studentId: string;
  checkInTime: string | null;
  status: string;
};

type ActiveSession = {
  id: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  sessionName: SessionName;
  sessionTime: string;
  sessionDuration: number;
};

const SESSION_TYPES: { value: SessionName; label: string; colour: string }[] = [
  { value: 'LECTURE',  label: 'Lecture',  colour: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'TUTORIAL', label: 'Tutorial', colour: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'LAB',      label: 'Lab',      colour: 'bg-green-100 text-green-700 border-green-200' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatElapsed(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function sessionTypeBadge(name: string) {
  const found = SESSION_TYPES.find(t => t.value === name);
  return found?.colour ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveAttendancePage() {

  // Modal
  const [isQrModalOpen, setIsQrModalOpen]   = useState(false);

  // Units & selection
  const [units, setUnits]                   = useState<LecturerUnit[]>([]);
  const [unitsLoading, setUnitsLoading]     = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [duration, setDuration]             = useState(60);

  // Active session
  const [activeSession, setActiveSession]   = useState<ActiveSession | null>(null);
  const [starting, setStarting]             = useState(false);
  const [stopping, setStopping]             = useState(false);
  const [elapsed, setElapsed]               = useState(0);

  // Check-ins
  const [checkIns, setCheckIns]             = useState<CheckInRecord[]>([]);
  const [checkInsLoading, setCheckInsLoading] = useState(false);

  // Session QR (shown to students)
  const [sessionQRToken, setSessionQRToken]       = useState<string | null>(null);
  const [sessionQRCountdown, setSessionQRCountdown] = useState(30);
  const sessionQRIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionQRRotateRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // QR scanner
  const [scanning, setScanning]             = useState(false);
  const [scanResult, setScanResult]         = useState<{ ok: boolean; stage?: number; message: string } | null>(null);
  const [manualToken, setManualToken]       = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Errors
  const [error, setError]                   = useState('');

  // Refs
  const readerRef     = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef   = useRef<IScannerControls | null>(null);
  const elapsedRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef  = useRef<string | null>(null);

  // ── Load units ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadUnits() {
      try {
        const res = await fetch('/api/lecturer/unit');
        if (!res.ok) throw new Error('Failed to load units');
        const data: LecturerUnit[] = await res.json();
        setUnits(data);
        if (data.length > 0) setSelectedUnitId(data[0].id);
      } catch {
        setError('Unable to load your units. Please refresh.');
      } finally {
        setUnitsLoading(false);
      }
    }
    loadUnits();
  }, []);

  // Check if there's already an active session on mount
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch('/api/attendance/active-session');
        if (!res.ok) return;
        const data = await res.json();
        if (data.sessions?.length > 0) {
          const s = data.sessions[0];
          setActiveSession({
            id: s.id,
            unitId: s.unitId,
            unitCode: s.unit?.code ?? '—',
            unitName: s.unit?.name ?? '—',
            sessionName: s.sessionName ?? 'LECTURE',
            sessionTime: s.sessionTime,
            sessionDuration: s.sessionDuration,
          });
          sessionIdRef.current = s.id;
          startPolling(s.id);
          startTimer(new Date(s.sessionTime));
          startSessionQRRotation(s.id);
        }
      } catch { /* silent */ }
    }
    checkExistingSession();
    return () => {
      stopPolling();
      stopTimer();
      stopSessionQRRotation();
    };
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────

  function startTimer(sessionTime: Date) {
    stopTimer();
    elapsedRef.current = setInterval(() => {
      setElapsed(Date.now() - sessionTime.getTime());
    }, 1000);
  }

  function stopTimer() {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }

  // ── Check-in polling ───────────────────────────────────────────────────────

  const fetchCheckIns = useCallback(async (sessionId: string) => {
    try {
      setCheckInsLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}/records`);
      if (!res.ok) return;
      const data = await res.json();
      setCheckIns(data.records ?? []);
    } catch { /* silent */ } finally {
      setCheckInsLoading(false);
    }
  }, []);

  function startPolling(sessionId: string) {
    stopPolling();
    fetchCheckIns(sessionId);
    pollRef.current = setInterval(() => fetchCheckIns(sessionId), 3000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // ── Session QR rotation ────────────────────────────────────────────────────

  const fetchSessionQR = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/attendance/session-qr?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSessionQRToken(data.token ?? null);
      setSessionQRCountdown(data.expiresIn ?? 30);
    } catch { /* silent */ }
  }, []);

  const startSessionQRRotation = useCallback((sessionId: string) => {
    stopSessionQRRotation();
    fetchSessionQR(sessionId);

    sessionQRIntervalRef.current = setInterval(() => {
      setSessionQRCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    function scheduleRotate() {
      sessionQRRotateRef.current = setTimeout(async () => {
        await fetchSessionQR(sessionId);
        scheduleRotate();
      }, 30_000);
    }
    scheduleRotate();
  }, [fetchSessionQR]);

  function stopSessionQRRotation() {
    if (sessionQRIntervalRef.current) {
      clearInterval(sessionQRIntervalRef.current);
      sessionQRIntervalRef.current = null;
    }
    if (sessionQRRotateRef.current) {
      clearTimeout(sessionQRRotateRef.current);
      sessionQRRotateRef.current = null;
    }
    setSessionQRToken(null);
    setSessionQRCountdown(30);
  }

  // ── Start session ──────────────────────────────────────────────────────────

  async function handleStartSession() {
    if (!selectedUnitId) { setError('Please select a unit first.'); return; }
    setError('');
    setStarting(true);

    try {
      const selectedCard = units.find(u => u.id === selectedUnitId);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: selectedCard?.unitId,
          sessionName: selectedCard?.classType ?? SESSION_TYPES[0].value,
          durationMinutes: duration,
          groupNo: selectedCard?.group,
          subcomponent: selectedCard?.subcomponent,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to start session');
      }

      const data = await res.json();
      const s = data.session;
      const unit = selectedCard;

      const newSession: ActiveSession = {
        id: s.id,
        unitId: selectedUnitId,
        unitCode: unit?.unitCode ?? '—',
        unitName: unit?.unitName ?? '—',
        sessionName: s.sessionName,
        sessionTime: s.sessionTime,
        sessionDuration: s.sessionDuration,
      };

      setActiveSession(newSession);
      sessionIdRef.current = s.id;
      setCheckIns([]);
      setElapsed(0);
      startTimer(new Date(s.sessionTime));
      startPolling(s.id);
      startSessionQRRotation(s.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  }

  // ── End session ────────────────────────────────────────────────────────────

  async function handleEndSession() {
    if (!activeSession) return;
    setStopping(true);

    try {
      await fetch(`/api/sessions/${activeSession.id}/end`, { method: 'PATCH' });
    } catch { /* best effort */ } finally {
      stopTimer();
      stopPolling();
      stopScanner();
      stopSessionQRRotation();
      setActiveSession(null);
      sessionIdRef.current = null;
      setElapsed(0);
      setStopping(false);
    }
  }

  // ── QR Camera scanner ──────────────────────────────────────────────────────

  async function startScanner() {
    if (!activeSession) return;
    setScanResult(null);
    readerRef.current = new BrowserQRCodeReader();
    setScanning(true);

    try {
      controlsRef.current = await readerRef.current.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        'qr-video',
        async (result) => {
          if (result) {
            await submitScan(result.getText());
          }
        }
      );
    } catch {
      setScanResult({ ok: false, message: 'Camera not available or permission denied.' });
      setScanning(false);
    }
  }

  function stopScanner() {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    readerRef.current = null;
    setScanning(false);
  }

  // ── Submit scan (camera or manual) ─────────────────────────────────────────

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
        if (data.stage === 1) {
          setScanResult({
            ok: true,
            stage: 1,
            message: data.alreadyScanned
              ? `Stage 1 already done — ask ${data.studentName ?? 'student'} to show Stage 2 QR`
              : `Stage 1 ✓ — ${data.studentName ?? 'Student'} — ask them to refresh and show Stage 2 QR`,
          });
        } else {
          setScanResult({ ok: true, stage: 2, message: 'Stage 2 verified — marked PRESENT ✓' });
          if (sessionIdRef.current) fetchCheckIns(sessionIdRef.current);
        }
      } else {
        setScanResult({ ok: false, message: data.error ?? 'Scan failed' });
      }
    } catch {
      setScanResult({ ok: false, message: 'Network error — please try again.' });
    }

    setTimeout(() => setScanResult(null), 5000);
  }

  async function handleManualSubmit() {
    if (!manualToken.trim() || !activeSession) return;
    setSubmittingManual(true);
    await submitScan(manualToken.trim());
    setManualToken('');
    setSubmittingManual(false);
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const selectedUnit    = units.find(u => u.id === selectedUnitId);
  const totalStudents   = selectedUnit?.students.length ?? 0;
  const presentCount    = checkIns.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const absentCount     = Math.max(0, totalStudents - presentCount);
  const attendanceRate  = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const timeRemaining   = activeSession
    ? Math.max(0, activeSession.sessionDuration * 60_000 - elapsed)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">

      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="hover:text-gray-600 cursor-default">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Live Attendance</span>
      </nav>

      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
            Live Attendance
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Start a session, scan student QR codes, and monitor check-ins in real time.
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 self-start">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Session Active — {formatElapsed(elapsed)}
          </div>
        )}
      </section>

      {/* Error banner */}
      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

      {/* Main grid */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">

        {/* ── LEFT: Session setup OR active session info ── */}
        <div className="space-y-5">

          {!activeSession ? (
            /* Setup panel */
            <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-bold text-gray-900">Start a Session</h2>

              {unitsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={16} className="animate-spin" /> Loading your units…
                </div>
              ) : units.length === 0 ? (
                <p className="text-sm text-gray-400">No units found. Upload a roster first.</p>
              ) : (
                <div className="space-y-5">
                  {/* Unit selector */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">
                      Select Unit
                    </label>
                    <div className="relative">
                      <select
                        value={selectedUnitId}
                        onChange={e => setSelectedUnitId(e.target.value)}
                        // selectedUnitId now holds the actual unitId, not the registration id
                        className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                      >
                        {units.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.unitCode} — {u.unitName}{u.group ? ` (${u.classType} · ${u.group})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    {selectedUnit && (
                      <p className="mt-1.5 text-xs text-gray-400">
                        {selectedUnit.students.length} enrolled students · {selectedUnit.semester} {selectedUnit.year}
                      </p>
                    )}
                  </div>


                  {/* Duration */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">
                      Duration (minutes)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                            duration === d
                              ? 'border-[#E4002B] bg-[#E4002B] text-white'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={starting || !selectedUnitId}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E4002B] py-3.5 text-sm font-bold text-white transition hover:bg-[#C70026] disabled:opacity-60"
                  >
                    {starting
                      ? <><Loader2 size={16} className="animate-spin" /> Starting…</>
                      : <><RadioTower size={16} /> Start Session</>
                    }
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Active session info */
            <div className="rounded-2xl sm:rounded-[2rem] bg-[#E4002B] p-6 text-white shadow-lg shadow-rose-100">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white/70" />
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">Live Session</p>
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight">{activeSession.unitCode}</p>
              <p className="mt-0.5 text-sm text-white/80">{activeSession.unitName}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Type</p>
                  <p className="mt-1 text-sm font-bold">
                    {SESSION_TYPES.find(t => t.value === activeSession.sessionName)?.label ?? activeSession.sessionName}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Duration</p>
                  <p className="mt-1 text-sm font-bold">{activeSession.sessionDuration} min</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Elapsed</p>
                  <p className="mt-1 font-mono text-lg font-black">{formatElapsed(elapsed)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Remaining</p>
                  <p className="mt-1 font-mono text-lg font-black">{formatElapsed(timeRemaining)}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-white/60">
                  <span>Attendance progress</span>
                  <span>{presentCount} / {totalStudents}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleEndSession}
                disabled={stopping}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 py-3 text-sm font-bold text-white transition hover:bg-white/25 disabled:opacity-60"
              >
                {stopping
                  ? <><Loader2 size={16} className="animate-spin" /> Ending…</>
                  : <><StopCircle size={16} /> End Session</>
                }
              </button>
            </div>
          )}

          {/* Session QR — shown to students to scan */}
          {activeSession && (
            <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base font-bold text-gray-900 flex items-center gap-2">
                <QrCode size={18} className="text-[#E4002B]" />
                Session QR Code
              </h2>
              <p className="mb-4 text-xs text-gray-400">
                Display this on screen — students scan it to mark attendance instantly.
              </p>

              <div className="flex flex-col items-center">
                <div
                  onClick={() => sessionQRToken && setIsQrModalOpen(true)}
                  className="flex h-56 w-56 items-center justify-center rounded-2xl border border-gray-200 bg-white cursor-pointer hover:scale-[1.03] transition"
                >
                  {sessionQRToken ? (
                    <QRCodeSVG
                      value={`${window.location.origin}/student/scan?token=${sessionQRToken}`}
                      size={200}
                      bgColor="#f9fafb"
                      fgColor="#111111"
                      level="M"
                    />
                  ) : (
                    <Loader2 size={28} className="animate-spin text-gray-300" />
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Click to enlarge
                </p>

                {sessionQRToken && (
                  <div className="mt-4 w-56">
                    <div className="mb-1 flex justify-between text-xs text-gray-400">
                      <span>Rotates in</span>
                      <span className="font-bold tabular-nums">{sessionQRCountdown}s</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#E4002B] transition-all duration-1000"
                        style={{ width: `${(sessionQRCountdown / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => sessionIdRef.current && fetchSessionQR(sessionIdRef.current)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                >
                  <RefreshCw size={12} /> Refresh now
                </button>
              </div>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Present</p>
              <p className="mt-2 text-3xl font-black text-green-600">{presentCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Absent</p>
              <p className="mt-2 text-3xl font-black text-gray-700">{absentCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rate</p>
              <p className="mt-2 text-3xl font-black text-[#E4002B]">{attendanceRate}%</p>
            </div>
          </div>

          {/* QR scanner panel — only when session is active */}
          {activeSession && (
            <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-gray-900 flex items-center gap-2">
                <ScanLine size={18} className="text-[#E4002B]" />
                Scan Student QR
              </h2>

              {/* Camera */}
              <div className="space-y-3">
                <div className={`relative overflow-hidden rounded-2xl bg-black ${scanning ? 'block' : 'hidden'}`} style={{ aspectRatio: '4/3' }}>
                  <video id="qr-video" className="h-full w-full object-cover" />
                  {/* Targeting overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>
                </div>

                {!scanning ? (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
                  >
                    <Camera size={16} /> Open Camera Scanner
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-800 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
                  >
                    <StopCircle size={16} /> Stop Camera
                  </button>
                )}

                {/* Scan result */}
                {scanResult && (
                  <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                    !scanResult.ok
                      ? 'border border-red-100 bg-red-50 text-red-700'
                      : scanResult.stage === 2
                      ? 'border border-green-100 bg-green-50 text-green-700'
                      : 'border border-violet-100 bg-violet-50 text-violet-700'
                  }`}>
                    {scanResult.ok
                      ? <CheckCircle2 size={16} />
                      : <XCircle size={16} />
                    }
                    {scanResult.message}
                  </div>
                )}

                {/* Manual token entry */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Or enter QR token manually
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={e => setManualToken(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                      placeholder="Paste QR token here…"
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs outline-none transition focus:border-[#E4002B] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleManualSubmit}
                      disabled={!manualToken.trim() || submittingManual}
                      className="rounded-xl bg-[#E4002B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C70026] disabled:opacity-50"
                    >
                      {submittingManual ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Live check-in log ── */}
        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Check-in Log</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {activeSession
                  ? `Polling every 3 seconds · ${checkIns.length} recorded`
                  : 'Start a session to see check-ins'}
              </p>
            </div>
            {activeSession && (
              <button
                type="button"
                onClick={() => sessionIdRef.current && fetchCheckIns(sessionIdRef.current)}
                className="rounded-xl border border-gray-200 p-2 text-gray-400 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                title="Refresh"
              >
                <RefreshCw size={14} className={checkInsLoading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {/* No session state */}
          {!activeSession && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                <RadioTower size={28} className="text-gray-300" />
              </div>
              <p className="text-base font-bold text-gray-900">No active session</p>
              <p className="mt-2 text-sm text-gray-400 max-w-xs">
                Select a unit and start a session on the left to begin recording attendance.
              </p>
            </div>
          )}

          {/* Session active, no check-ins yet */}
          {activeSession && checkIns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <span className="mb-4 h-3 w-3 animate-pulse rounded-full bg-green-500" />
              <p className="text-sm font-semibold text-gray-600">Waiting for students to check in…</p>
              <p className="mt-1 text-xs text-gray-400">QR codes refresh every 60 seconds</p>
            </div>
          )}

          {/* Check-in list */}
          {checkIns.length > 0 && (
            <ul className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {checkIns.map((record, index) => (
                <li key={record.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-black text-green-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{record.studentName}</p>
                    <p className="text-xs text-gray-400">{record.studentId}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      record.status === 'PRESENT'
                        ? 'border-green-100 bg-green-50 text-green-700'
                        : record.status === 'LATE'
                          ? 'border-amber-100 bg-amber-50 text-amber-700'
                          : record.status === 'PENDING'
                            ? 'border-violet-100 bg-violet-50 text-violet-700'
                            : 'border-red-100 bg-red-50 text-red-600'
                    }`}>
                      {record.status === 'PRESENT' && <CheckCircle2 size={11} />}
                      {record.status === 'PENDING' ? 'Stage 1 ✓' : record.status}
                    </span>
                    <p className="mt-1 text-[10px] text-gray-400">{formatTime(record.checkInTime)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Footer showing remaining */}
          {activeSession && checkIns.length > 0 && absentCount > 0 && (
            <div className="border-t border-gray-100 px-6 py-3">
              <p className="flex items-center gap-2 text-xs text-gray-400">
                <XCircle size={13} className="text-gray-300" />
                {absentCount} student{absentCount !== 1 ? 's' : ''} haven&apos;t checked in yet
              </p>
            </div>
          )}
        </div>
      </section>

      {/* QR Modal — outside the grid */}
      {isQrModalOpen && sessionQRToken && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Session QR Code</h2>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="text-gray-500 hover:text-red-500"
              >
                ✕
              </button>
            </div>

            <QRCodeSVG
              value={`${window.location.origin}/student/scan?token=${sessionQRToken}`}
              size={380}
              bgColor="#ffffff"
              fgColor="#111111"
              level="M"
            />

            {sessionQRToken && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm text-gray-500">
                  <span>Rotates in</span>
                  <span className="font-bold tabular-nums">{sessionQRCountdown}s</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#E4002B] transition-all duration-1000"
                    style={{ width: `${(sessionQRCountdown / 30) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
