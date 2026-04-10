'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';

type AttendanceStatus = 'Present' | 'Absent';

type AttendanceItem = {
  id: string;
  code: string;
  session: string;
  status: AttendanceStatus;
  recordedAt: string | null;
};

type AttendanceRecord = {
  sessionId: string;
  date: string;
  unitId: string;
  courseCode: string;
  courseName: string;
  sessionName: string;
  sessionTime: string;
  checkInTime: string | null;
  status: string;
};

type AttendanceApiResponse = {
  records?: AttendanceRecord[];
  courses?: Array<{
    id: string;
    code: string;
    name: string;
    total: number;
    attended: number;
  }>;
  attendance?: AttendanceItem[];
};

function getStatusBadgeClasses(status: AttendanceStatus) {
  return status === 'Present'
    ? 'border-green-100 bg-green-50 text-green-700'
    : 'border-red-100 bg-red-50 text-red-600';
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(value: string) {
  return new Date(value).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normaliseStatus(status: string): AttendanceStatus {
  return status === 'ABSENT' ? 'Absent' : 'Present';
}

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Absent'>('All');

  useEffect(() => {
    async function loadAttendance() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/student/attendance', {
          cache: 'no-store',
        });

        if (res.status === 403) {
          setError('This page is only available for student accounts.');
          setRecords([]);
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load attendance.');
        }

        const data: AttendanceApiResponse = await res.json();
        setRecords(Array.isArray(data.records) ? data.records : []);
      } catch (err) {
        console.error('Failed to load student attendance:', err);
        setError('Unable to load attendance records right now.');
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return records.filter((item) => {
      const status = normaliseStatus(item.status);

      const matchesSearch =
        !keyword ||
        item.courseCode.toLowerCase().includes(keyword) ||
        item.courseName.toLowerCase().includes(keyword) ||
        item.sessionName.toLowerCase().includes(keyword) ||
        formatDateLabel(item.date).toLowerCase().includes(keyword);

      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const presentCount = useMemo(
    () => records.filter((item) => normaliseStatus(item.status) === 'Present').length,
    [records]
  );

  const absentCount = useMemo(
    () => records.filter((item) => normaliseStatus(item.status) === 'Absent').length,
    [records]
  );

  const attendanceRate = useMemo(() => {
    if (!records.length) return 0;
    return Math.round((presentCount / records.length) * 100);
  }, [records, presentCount]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Attendance</span>
      </nav>

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Attendance <span className="text-red-600">History</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            Review your attendance records across all past sessions and track your current
            progress by unit and session.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-red-100 hover:text-red-600"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back to Dashboard
          </Link>

          <Link
            href="/student/qrcode"
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 active:scale-95"
          >
            <CalendarDays size={16} />
            Open QR
          </Link>
        </div>
      </section>

      {error ? (
        <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Attendance unavailable</p>
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      {/* Summary Cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Total Records
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : records.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">All recorded past sessions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Present
            </p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {loading ? '—' : presentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Successful attendance records</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Absent
            </p>
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : absentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Sessions without a valid check-in</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Attendance Rate
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : `${attendanceRate}%`}
          </p>
          <p className="mt-2 text-xs text-gray-500">Current overall attendance</p>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by unit code, unit name, or session..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-red-200 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['All', 'Present', 'Absent'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  statusFilter === status
                    ? 'bg-red-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-red-100 hover:text-red-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Attendance Table / Cards */}
      <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-gray-900">Attendance Records</h2>
            <p className="text-sm text-gray-500">
              {loading
                ? 'Loading attendance records...'
                : `${filteredRecords.length} visible record${filteredRecords.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin text-red-600" />
            Loading attendance...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-bold text-gray-700">No attendance records found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search or wait until sessions are recorded.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredRecords.map((item) => {
              const status = normaliseStatus(item.status);

              return (
                <div
                  key={item.sessionId}
                  className="flex flex-col gap-5 px-6 py-6 transition-colors hover:bg-gray-50/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        {item.courseCode}
                      </span>

                      <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        {item.sessionName}
                      </span>

                      <span
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClasses(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{item.courseName}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {formatDateLabel(item.date)}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {formatTimeLabel(item.sessionTime)}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        {item.checkInTime ? formatTimeLabel(item.checkInTime) : 'No check-in recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <Link
                      href="/student/classes"
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-red-100 hover:text-red-600"
                    >
                      View Classes
                    </Link>

                    <Link
                      href="/student/qrcode"
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
                    >
                      Open QR
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}