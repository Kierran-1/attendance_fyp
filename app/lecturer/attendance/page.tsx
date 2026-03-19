'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

interface CheckedInStudent {
  id: string;
  studentName: string;
  studentId: string;
  checkInTime: string;
}

interface ScanResult {
  success: boolean;
  message: string;
}

export default function LecturerAttendancePage() {
  const { data: session } = useSession();

  const [scanning, setScanning] = useState(false);
  const [checkedIn, setCheckedIn] = useState<CheckedInStudent[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  async function handleScan(tokenText: string) {
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenText }),
      });

      if (res.status === 201) {
        const data = await res.json();
        const record = data.record;
        setCheckedIn((prev) => [
          ...prev,
          {
            id: record.id,
            studentName: record.userId,
            studentId: record.userId,
            checkInTime: record.checkInTime,
          },
        ]);
        setScanResult({ success: true, message: 'Attendance marked successfully' });
      } else if (res.status === 409) {
        setScanResult({ success: false, message: 'Already checked in' });
      } else if (res.status === 400) {
        setScanResult({ success: false, message: 'Invalid or expired QR code' });
      } else {
        const data = await res.json();
        setScanResult({ success: false, message: data.error ?? 'Scan failed' });
      }
    } catch {
      setScanResult({ success: false, message: 'Network error' });
    }

    // Clear result after 3 seconds
    setTimeout(() => setScanResult(null), 3000);
  }

  async function startScanning() {
    readerRef.current = new BrowserQRCodeReader();
    setScanning(true);
    setScanResult(null);

    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        'qr-video',
        (result) => {
          if (result) {
            handleScan(result.getText());
          }
        }
      );
    } catch {
      setScanResult({ success: false, message: 'Camera not available' });
      setScanning(false);
    }
  }

  function stopScanning() {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    readerRef.current = null;
    setScanning(false);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">QR Code Attendance Scanner</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {session?.user?.name ?? 'Lecturer'}
          </p>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            {!scanning ? (
              <button
                onClick={startScanning}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Scanning
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                Stop
              </button>
            )}
            {scanning && (
              <span className="text-sm text-green-600 font-medium">Camera active</span>
            )}
          </div>

          <div className={scanning ? 'block' : 'hidden'}>
            <video
              id="qr-video"
              className="w-full max-w-sm rounded-lg bg-black"
              style={{ aspectRatio: '4/3' }}
            />
          </div>

          {/* Scan Result Toast */}
          {scanResult && (
            <div
              className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
                scanResult.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {scanResult.message}
            </div>
          )}
        </div>

        {/* Checked-In Students Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-700">
              Checked-In Students ({checkedIn.length})
            </h2>
          </div>

          {checkedIn.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-400">No students have checked in yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Check-in Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checkedIn.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {student.studentName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{student.studentId}</td>
                      <td className="px-6 py-4 text-gray-600">{formatTime(student.checkInTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
