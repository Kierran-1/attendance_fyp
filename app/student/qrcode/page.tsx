'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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

/*
 * later need to replace the QRPreview component with a real QR generator using actual signed session/user data from backend
 * Later replacement:
 * - qrcode library
 * - server-generated signed QR payload
 * - real validation via backend
*/

const studentProfile = {
  name: 'John Doe',
  studentId: '102788856',
  email: '102788856@students.swinburne.edu.my',
  program: 'Bachelor of Computer Science',
};

const activeAttendanceSession = {
  available: true,
  unitCode: 'COS40005',
  unitName: 'Computing Technology Project A',
  sessionType: 'Tutorial Session',
  validUntil: '10:10 AM',
  venue: 'A304',
};

/**
 * Creates a repeatable numeric hash from a string.
 * Used to generate a consistent QR-style pattern preview.
 */
function createSeed(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function QRPreview({ value }: { value: string }) {
  const cells = useMemo(() => {
    const size = 25;
    const seed = createSeed(value);
    const matrix: boolean[][] = [];

    for (let row = 0; row < size; row += 1) {
      const currentRow: boolean[] = [];

      for (let col = 0; col < size; col += 1) {
        const inTopLeftFinder = row < 7 && col < 7;
        const inTopRightFinder = row < 7 && col >= size - 7;
        const inBottomLeftFinder = row >= size - 7 && col < 7;

        if (inTopLeftFinder || inTopRightFinder || inBottomLeftFinder) {
          const localRow = row % 7;
          const localCol = col % 7;

          const isOuter =
            localRow === 0 ||
            localRow === 6 ||
            localCol === 0 ||
            localCol === 6;

          const isInner =
            localRow >= 2 &&
            localRow <= 4 &&
            localCol >= 2 &&
            localCol <= 4;

          currentRow.push(isOuter || isInner);
        } else {
          const bit =
            ((seed + row * 37 + col * 19 + row * col * 7) ^
              (row * 97 + col * 57)) %
            2;

          currentRow.push(bit === 0);
        }
      }

      matrix.push(currentRow);
    }

    return matrix;
  }, [value]);

  return (
    <svg
      viewBox="0 0 250 250"
      className="h-[260px] w-[260px] rounded-3xl bg-white p-4 shadow-inner sm:h-[300px] sm:w-[300px]"
      aria-label="Student QR code preview"
      role="img"
    >
      <rect x="0" y="0" width="250" height="250" fill="white" />
      {cells.map((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * 10}
              y={rowIndex * 10}
              width="10"
              height="10"
              rx="1"
              fill="#111111"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function StudentQRCodePage() {
  const [qrVersion, setQrVersion] = useState(1);
  const [copied, setCopied] = useState(false);

  const qrPayload = useMemo(() => {
    return JSON.stringify({
      studentId: studentProfile.studentId,
      unitCode: activeAttendanceSession.unitCode,
      sessionType: activeAttendanceSession.sessionType,
      version: qrVersion,
    });
  }, [qrVersion]);

  const handleRefresh = () => {
    setQrVersion((prev) => prev + 1);
  };

  const handleCopyStudentId = async () => {
    try {
      await navigator.clipboard.writeText(studentProfile.studentId);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

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
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <RefreshCw size={16} />
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
          <p className="text-2xl font-black tracking-tight text-green-600">
            {activeAttendanceSession.available ? 'Active' : 'Unavailable'}
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
            {activeAttendanceSession.unitCode}
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
            Tutorial
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
            {activeAttendanceSession.validUntil}
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

          {activeAttendanceSession.available ? (
            <div className="flex flex-col items-center rounded-[28px] bg-gradient-to-br from-rose-50 via-white to-red-50 px-4 py-8">
              <QRPreview value={qrPayload} />

              <div className="mt-6 text-center">
                <p className="text-lg font-black tracking-tight text-gray-900">
                  {studentProfile.name}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {studentProfile.studentId}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                  {activeAttendanceSession.unitCode} ·{' '}
                  {activeAttendanceSession.sessionType}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
                >
                  <RefreshCw size={16} />
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
                  {activeAttendanceSession.unitCode}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {activeAttendanceSession.unitName}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Session
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {activeAttendanceSession.sessionType}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Venue
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {activeAttendanceSession.venue}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Valid Until
                </p>
                <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                  {activeAttendanceSession.validUntil}
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
                  {studentProfile.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Student ID
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {studentProfile.studentId}
                  </p>

                  <button
                    type="button"
                    onClick={handleCopyStudentId}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                  >
                    <Copy size={12} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Email
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {studentProfile.email}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Program
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {studentProfile.program}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}