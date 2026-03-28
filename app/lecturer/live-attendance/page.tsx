'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  RadioTower,
  StopCircle,
  Users,
  XCircle,
} from 'lucide-react';

/*
 * Later integration:
 * - Replace INITIAL_CLASSES and mock check-ins with real-time data from backend
 * - Open/close attendance window via API
 * - Stream live check-ins via WebSocket or polling
 */

type SessionType = 'Lecture' | 'Tutorial' | 'Lab';

type LecturerClass = {
  id: string;
  unitCode: string;
  unitName: string;
  day: string;
  time: string;
  location: string;
  sessionType: SessionType;
  totalStudents: number;
};

type CheckIn = {
  id: string;
  studentNumber: string;
  name: string;
  checkedInAt: string;
};

const INITIAL_CLASSES: LecturerClass[] = [
  {
    id: 'cls-1',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    day: 'Monday',
    time: '09:00 - 11:00',
    location: 'A304',
    sessionType: 'Tutorial',
    totalStudents: 28,
  },
  {
    id: 'cls-2',
    unitCode: 'SWE30003',
    unitName: 'Software Architecture and Design',
    day: 'Monday',
    time: '14:00 - 16:00',
    location: 'C102',
    sessionType: 'Lecture',
    totalStudents: 53,
  },
  {
    id: 'cls-3',
    unitCode: 'COS30049',
    unitName: 'Computing Technology Innovation Project',
    day: 'Wednesday',
    time: '10:00 - 12:00',
    location: 'B201',
    sessionType: 'Lab',
    totalStudents: 20,
  },
];

const MOCK_CHECK_INS: CheckIn[] = [
  { id: 'ci-1', studentNumber: '102788856', name: 'John Doe', checkedInAt: '09:02 AM' },
  { id: 'ci-2', studentNumber: '102788857', name: 'Nur Aisyah Binti Ahmad', checkedInAt: '09:04 AM' },
  { id: 'ci-3', studentNumber: '102788858', name: 'Lee Wen Hao', checkedInAt: '09:05 AM' },
  { id: 'ci-4', studentNumber: '102788859', name: 'Priya Nair', checkedInAt: '09:07 AM' },
  { id: 'ci-5', studentNumber: '102788860', name: 'Ahmad Faris bin Razak', checkedInAt: '09:09 AM' },
];

const SESSION_TYPE_COLOURS: Record<SessionType, string> = {
  Lecture: 'bg-blue-100 text-blue-700',
  Tutorial: 'bg-purple-100 text-purple-700',
  Lab: 'bg-green-100 text-green-700',
};

export default function LiveAttendancePage() {
  const [selectedClassId, setSelectedClassId] = useState<string>(INITIAL_CLASSES[0].id);
  const [sessionActive, setSessionActive] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const selectedClass = useMemo(
    () => INITIAL_CLASSES.find((c) => c.id === selectedClassId) ?? INITIAL_CLASSES[0],
    [selectedClassId],
  );

  const absentCount = useMemo(
    () => Math.max(0, selectedClass.totalStudents - checkIns.length),
    [selectedClass.totalStudents, checkIns.length],
  );

  function handleStartSession() {
    setCheckIns([]);
    setSessionActive(true);
    // Simulate a few check-ins arriving after session opens
    setTimeout(() => setCheckIns(MOCK_CHECK_INS.slice(0, 3)), 800);
    setTimeout(() => setCheckIns(MOCK_CHECK_INS.slice(0, 5)), 2000);
  }

  function handleStopSession() {
    setSessionActive(false);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#E4002B]">
          Live Attendance
        </p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">Session Manager</h1>
        <p className="mt-1 text-sm text-gray-500">
          Open an attendance window and monitor student check-ins in real time.
        </p>
      </div>

      {/* Class Selector + Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Select Class</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INITIAL_CLASSES.map((cls) => {
            const isSelected = cls.id === selectedClassId;
            return (
              <button
                key={cls.id}
                type="button"
                disabled={sessionActive}
                onClick={() => setSelectedClassId(cls.id)}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-[#E4002B] bg-[#E4002B]/5'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[#E4002B]">{cls.unitCode}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800 leading-tight">
                      {cls.unitName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${SESSION_TYPE_COLOURS[cls.sessionType]}`}
                  >
                    {cls.sessionType}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock3 size={12} />
                    {cls.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {cls.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {cls.totalStudents} students
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {sessionActive ? (
            <button
              type="button"
              onClick={handleStopSession}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <StopCircle size={16} />
              Stop Session
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSession}
              className="flex items-center gap-2 rounded-xl bg-[#E4002B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <RadioTower size={16} />
              Start Session
            </button>
          )}

          {sessionActive && (
            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Session open — {selectedClass.unitCode} · {selectedClass.location}
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Checked In</p>
          <p className="mt-2 text-3xl font-black text-[#E4002B]">{checkIns.length}</p>
          <p className="mt-0.5 text-xs text-gray-500">of {selectedClass.totalStudents} students</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Absent</p>
          <p className="mt-2 text-3xl font-black text-gray-700">{absentCount}</p>
          <p className="mt-0.5 text-xs text-gray-500">not yet checked in</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Rate</p>
          <p className="mt-2 text-3xl font-black text-gray-700">
            {selectedClass.totalStudents > 0
              ? Math.round((checkIns.length / selectedClass.totalStudents) * 100)
              : 0}
            %
          </p>
          <p className="mt-0.5 text-xs text-gray-500">attendance so far</p>
        </div>
      </div>

      {/* Check-in List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Check-in Log</h2>
          <span className="text-xs text-gray-400">
            {sessionActive ? 'Live' : checkIns.length > 0 ? 'Session ended' : 'No active session'}
          </span>
        </div>

        {checkIns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {sessionActive ? (
              <>
                <span className="mb-3 inline-block h-3 w-3 animate-pulse rounded-full bg-green-500" />
                <p className="text-sm font-medium text-gray-500">Waiting for students to check in…</p>
              </>
            ) : (
              <>
                <RadioTower size={32} className="mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-400">
                  Start a session to begin recording attendance.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {checkIns.map((ci) => (
              <li key={ci.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{ci.name}</p>
                    <p className="text-xs text-gray-400">{ci.studentNumber}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{ci.checkedInAt}</span>
              </li>
            ))}
          </ul>
        )}

        {checkIns.length > 0 && absentCount > 0 && (
          <div className="border-t border-gray-100 px-6 py-3">
            <p className="flex items-center gap-2 text-xs text-gray-400">
              <XCircle size={14} className="text-gray-300" />
              {absentCount} student{absentCount !== 1 ? 's' : ''} not yet checked in
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
