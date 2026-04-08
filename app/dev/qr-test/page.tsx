'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';

type Step = 'idle' | 'session-created' | 'token-generated' | 'scanned';

export default function QRTestPage() {
  const [step, setStep]           = useState<Step>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const { data: authSession, status } = useSession();

  function err(msg: string) {
    setError(msg);
    setLoading(false);
  }

  // ── Step 1: Create a dev session ──────────────────────────────────────────
  async function handleCreateSession() {
    setLoading(true);
    setError(null);
    setToken(null);
    setScanResult(null);

    const res  = await fetch('/api/dev/create-test-session', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) return err(data.error ?? 'Failed to create session');

    // API returns { sessionId, session } — grab whichever is present
    const id = data.sessionId ?? data.session?.id;
    if (!id) return err('No session ID returned from API');

    setSessionId(id);
    setStep('session-created');
    setLoading(false);
  }

  // ── Step 2: Generate QR token (calls simulate-scan backend directly) ──────
  // generate-qr requires STUDENT role, so for dev we call a simpler token endpoint
  // or fall back to simulate-scan which bypasses the QR entirely.
  async function handleGenerateToken() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    // Try the real generate-qr first (works if logged in as student)
    const res  = await fetch('/api/attendance/generate-qr', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId }),
    });
    const data = await res.json();

    if (res.ok && data.token) {
      setToken(data.token);
      setStep('token-generated');
      setLoading(false);
      return;
    }

    // If 403 (lecturer account), skip token and go straight to simulate
    if (res.status === 403) {
      setError('You are logged in as a lecturer — QR generation is student-only. Use "Simulate Scan" directly instead (it bypasses the QR).');
      setLoading(false);
      return;
    }

    err(data.error ?? 'Failed to generate token');
  }

  // ── Step 3a: Simulate scan with token (student flow) ─────────────────────
  async function handleScanWithToken() {
    if (!token) return;
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/attendance/scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
    const data = await res.json();

    if (!res.ok) return err(data.error ?? 'Scan failed');

    setScanResult('Attendance marked as PRESENT via QR token ✓');
    setStep('scanned');
    setLoading(false);
  }

  // ── Step 3b: Bypass QR — directly mark present (any role) ────────────────
  async function handleDirectSimulate() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/dev/simulate-scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId }),
    });
    const data = await res.json();

    if (!res.ok) return err(data.error ?? 'Simulate failed');

    setScanResult('Attendance marked as PRESENT via dev simulate ✓');
    setStep('scanned');
    setLoading(false);
  }

  // ── Step 3c: Bulk simulate — create 8 fake students and mark 6 present ───
  async function handleBulkSimulate() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/dev/simulate-scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, bulkStudents: true }),
    });
    const data = await res.json();

    if (!res.ok) return err(data.error ?? 'Bulk simulate failed');

    const errList = data.errors?.length ? `\nErrors: ${data.errors.join(', ')}` : '';
    setScanResult(`Bulk done — ${data.present} present, ${data.absent} absent out of ${data.created} students ✓${errList}`);
    setStep('scanned');
    setLoading(false);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    setStep('idle');
    setSessionId(null);
    setToken(null);
    setError(null);
    setScanResult(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-lg space-y-4">

        {/* Not logged in gate */}
        {status === 'loading' && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Checking session…
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-semibold text-amber-800 mb-3">You are not logged in</p>
            <p className="text-sm text-amber-600 mb-5">You need to be signed in to use the dev test page.</p>
            <button
              onClick={() => signIn()}
              className="rounded-lg bg-[#E4002B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c2001f] transition"
            >
              Sign In
            </button>
          </div>
        )}

        {status === 'authenticated' && (<>
        <div className="mb-2">
          <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-bold uppercase tracking-widest text-yellow-700">
            Dev Only
          </span>
          <h1 className="mt-2 text-2xl font-black text-gray-900">QR Attendance Test</h1>
          <p className="mt-1 text-sm text-gray-500">
            Simulate the full QR attendance flow. Works with both student and lecturer accounts.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Step 1 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Step 1 — Create Test Session
          </p>
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            {loading && step === 'idle' ? 'Creating…' : 'Create Test Session'}
          </button>
          {sessionId && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <p className="font-semibold text-green-800">Session created ✓</p>
              <p className="mt-1 font-mono text-xs text-green-600 break-all">{sessionId}</p>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className={`rounded-xl border bg-white p-5 ${step === 'idle' ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
            Step 2 — Generate QR Token
          </p>
          <p className="mb-3 text-xs text-gray-400">
            Only works if you're logged in as a <strong>student</strong>. If you're a lecturer, skip to Step 3b.
          </p>
          <button
            onClick={handleGenerateToken}
            disabled={!sessionId || loading}
            className="w-full rounded-lg bg-[#E4002B] py-2.5 text-sm font-semibold text-white transition hover:bg-[#c2001f] disabled:opacity-40"
          >
            {loading && step === 'session-created' ? 'Generating…' : 'Generate QR Token'}
          </button>
          {token && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <QRCodeSVG value={token} size={180} />
              </div>
              <p className="break-all text-center font-mono text-xs text-gray-400 px-2">{token}</p>
            </div>
          )}
        </div>

        {/* Step 3a — scan with token */}
        <div className={`rounded-xl border bg-white p-5 ${!token ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
            Step 3a — Scan Token (Student Flow)
          </p>
          <p className="mb-3 text-xs text-gray-400">
            Submits the QR token to the real scan API — same as a lecturer scanning a student QR.
          </p>
          <button
            onClick={handleScanWithToken}
            disabled={!token || loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            {loading && step === 'token-generated' ? 'Scanning…' : 'Scan Token → Mark Present'}
          </button>
        </div>

        {/* Step 3b — bypass QR entirely */}
        <div className={`rounded-xl border bg-white p-5 ${!sessionId ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
            Step 3b — Direct Simulate (Any Role)
          </p>
          <p className="mb-3 text-xs text-gray-400">
            Bypasses QR entirely. Marks the current logged-in user as PRESENT directly in the database. Use this if you're logged in as a lecturer.
          </p>
          <button
            onClick={handleDirectSimulate}
            disabled={!sessionId || loading}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            {loading ? 'Simulating…' : 'Simulate Attendance → Mark Present'}
          </button>
        </div>

        {/* Step 3c — bulk simulate */}
        <div className={`rounded-xl border bg-white p-5 ${!sessionId ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
            Step 3c — Bulk Simulate (Recommended for Reports)
          </p>
          <p className="mb-3 text-xs text-gray-400">
            Creates <strong>8 fake students</strong>, enrolls them in the dev unit, and marks <strong>6 as present</strong> and 2 as absent. Gives you realistic data to view in Reports without needing any other account.
          </p>
          <button
            onClick={handleBulkSimulate}
            disabled={!sessionId || loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {loading ? 'Simulating…' : 'Bulk Simulate → 8 Students, 6 Present'}
          </button>
        </div>

        {/* Result */}
        {scanResult && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            {scanResult}
            <p className="mt-1 text-xs font-normal text-green-600">
              Check <a href="/lecturer/reports" className="underline">Reports</a> or <a href="/student/attendance" className="underline">Attendance</a> to confirm it appears.
            </p>
          </div>
        )}

        {/* Reset */}
        {step !== 'idle' && (
          <button onClick={reset} className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
            Reset / Start Over
          </button>
        )}

        <p className="text-center text-xs text-gray-300">Dev mode only — not visible in production</p>
        </>)}
      </div>
    </div>
  );
}
