'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import {
  Camera,
  CheckCircle2,
  Loader2,
  ScanLine,
  StopCircle,
  XCircle,
} from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'submitting' | 'success' | 'error';

export default function StudentScanPage() {
  const [scanState, setScanState]   = useState<ScanState>('idle');
  const [message, setMessage]       = useState('');
  const [unitInfo, setUnitInfo]     = useState<{ code: string; name: string } | null>(null);

  const readerRef   = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const submittingRef = useRef(false);

  function stopScanner() {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    readerRef.current = null;
  }

  useEffect(() => {
    return () => stopScanner();
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
          Student
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
          Scan Attendance QR
        </h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          Point your camera at the QR code displayed by your lecturer to mark yourself present.
        </p>
      </section>

      {/* Scanner card */}
      <section className="mx-auto max-w-sm">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">

          {/* Camera viewport */}
          <div
            className={`relative overflow-hidden rounded-2xl bg-black ${
              scanState === 'scanning' ? 'block' : 'hidden'
            }`}
            style={{ aspectRatio: '1/1' }}
          >
            <video id="student-qr-video" className="h-full w-full object-cover" />
            {/* Targeting overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-52 w-52 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80">
                Align QR code within the frame
              </span>
            </div>
          </div>

          {/* Success state */}
          {scanState === 'success' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <p className="mt-4 text-lg font-black text-gray-900">Attendance Marked!</p>
              {unitInfo && (
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {unitInfo.code} — {unitInfo.name}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-400">{message}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-5 rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                Done
              </button>
            </div>
          )}

          {/* Error state */}
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

          {/* Submitting state */}
          {scanState === 'submitting' && (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 size={36} className="animate-spin text-[#E4002B]" />
              <p className="mt-4 text-sm font-semibold text-gray-500">Verifying…</p>
            </div>
          )}

          {/* Idle + scanning controls */}
          {(scanState === 'idle' || scanState === 'scanning') && (
            <div className="space-y-3 mt-4">
              {scanState === 'idle' ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E4002B] py-3.5 text-sm font-bold text-white transition hover:bg-[#C70026]"
                >
                  <Camera size={16} /> Open Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-800 py-3.5 text-sm font-bold text-white transition hover:bg-gray-900"
                >
                  <StopCircle size={16} /> Stop Camera
                </button>
              )}

              <p className="text-center text-xs text-gray-400">
                {scanState === 'idle'
                  ? 'Camera access is required to scan the QR code.'
                  : 'Scanning… hold steady.'}
              </p>
            </div>
          )}
        </div>

        {/* Tip */}
        {scanState === 'idle' && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <ScanLine size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
            <p className="text-xs text-blue-700">
              Your lecturer will display a QR code on screen. It rotates every 30 seconds —
              scan it while it&apos;s still valid.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
