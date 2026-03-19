'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';

interface TestSession {
  id: string;
  course: { code: string; name: string };
  startTime: string;
  endTime: string;
}

type ScanStatus = { ok: true } | { ok: false; error: string } | null;

export default function QRTestPage() {
  const [session, setSession] = useState<TestSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function createSession() {
    setLoading('session');
    setToken(null);
    setScanStatus(null);
    const res = await fetch('/api/dev/create-test-session', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setSession(data.session);
    } else {
      alert(data.error ?? 'Failed to create session');
    }
    setLoading(null);
  }

  async function generateToken() {
    if (!session) return;
    setLoading('token');
    setScanStatus(null);
    const res = await fetch('/api/attendance/generate-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
    } else {
      alert(data.error ?? 'Failed to generate token');
    }
    setLoading(null);
  }

  async function simulateScan() {
    if (!token) return;
    setLoading('scan');
    const res = await fetch('/api/dev/simulate-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setScanStatus(res.ok ? { ok: true } : { ok: false, error: data.error ?? 'Scan failed' });
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-widest bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            Dev Only
          </span>
          <h1 className="text-2xl font-black text-gray-900 mt-2">QR Attendance Test</h1>
          <p className="text-sm text-gray-500 mt-1">
            Simulate the full QR attendance flow without a lecturer account.
          </p>
        </div>

        {/* Step 1: Create session */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Step 1 — Create Test Session
          </p>
          <button
            onClick={createSession}
            disabled={loading === 'session'}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {loading === 'session' ? 'Creating…' : 'Create Test Session'}
          </button>
          {session && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-green-800">{session.course.code} — {session.course.name}</p>
              <p className="text-green-600 text-xs mt-0.5">
                Session ID: <span className="font-mono">{session.id}</span>
              </p>
              <p className="text-green-600 text-xs">
                Ends: {new Date(session.endTime).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Generate QR token */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Step 2 — Generate Your QR Token
          </p>
          <button
            onClick={generateToken}
            disabled={!session || loading === 'token'}
            className="w-full py-2.5 bg-[#E4002B] text-white text-sm font-semibold rounded-lg hover:bg-[#c2001f] disabled:opacity-40 transition"
          >
            {loading === 'token' ? 'Generating…' : 'Generate QR Token'}
          </button>
          {token && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                <QRCode value={token} size={200} />
              </div>
              <p className="text-xs text-gray-400 break-all text-center font-mono px-2">{token}</p>
            </div>
          )}
        </div>

        {/* Step 3: Simulate scan */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Step 3 — Simulate Lecturer Scan
          </p>
          <button
            onClick={simulateScan}
            disabled={!token || loading === 'scan'}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
          >
            {loading === 'scan' ? 'Scanning…' : 'Simulate Scan'}
          </button>
          {scanStatus !== null && (
            <div className={`mt-3 rounded-lg p-3 text-sm font-semibold ${
              scanStatus.ok
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {scanStatus.ok ? '✓ Attendance marked as PRESENT' : `✗ ${'error' in scanStatus ? scanStatus.error : ''}`}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-gray-300 mt-4">
          This page is only available in development mode.
        </p>
      </div>
    </div>
  );
}
