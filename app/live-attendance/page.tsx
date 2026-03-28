'use client';

import Link from 'next/link';
import { QrCode, Wifi } from 'lucide-react';

/*
 * Later integration:
 * - Accept a session token via query param (e.g. ?session=abc123)
 * - Validate the token against the backend
 * - Mark the authenticated student as present for that session
 */

export default function LiveAttendancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#E4002B]/10">
          <Wifi size={28} className="text-[#E4002B]" />
        </div>

        <h1 className="text-xl font-black text-gray-900">Live Attendance</h1>
        <p className="mt-2 text-sm text-gray-500">
          No active session link detected. If your lecturer has started a session, use the QR
          code check-in from your student dashboard instead.
        </p>

        <Link
          href="/student/qrcode"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#E4002B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          <QrCode size={16} />
          Go to My QR Code
        </Link>

        <Link
          href="/student/dashboard"
          className="mt-3 block text-sm text-gray-400 hover:text-gray-600"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
