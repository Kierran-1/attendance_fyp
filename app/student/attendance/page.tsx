'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
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

function getStatusBadgeClasses(status: AttendanceStatus) {
  if (status === 'Present') {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  return 'border-red-100 bg-red-50 text-red-600';
}

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Absent'>('All');

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    try {
      setLoading(true);
      setError('');

      /*Load attendance from the existing student attendance API*/
      const res = await fetch('/api/student/attendance', {
        cache: 'no-store',
      });

      if (res.status === 403) {
        setError('This page is only available for student accounts.');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load attendance.');
      }

      const data = await res.json();
      setAttendance(data.attendance || []);
    } catch (err) {
      console.error('Failed to load student attendance:', err);
      setError('Unable to load attendance records right now.');
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredAttendance = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return attendance.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.code.toLowerCase().includes(keyword) ||
        item.session.toLowerCase().includes(keyword) ||
        (item.recordedAt || '').toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendance, searchTerm, statusFilter]);

  const presentCount = attendance.filter((item) => item.status === 'Present').length;
  const absentCount = attendance.filter((item) => item.status === 'Absent').length;

  const attendanceRate = useMemo(() => {
    if (!attendance.length) return 0;
    return Math.round((presentCount / attendance.length) * 100);
  }, [attendance, presentCount]);

  return (
    <div className="space-y-6">
      {/*Header*/}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Attendance History
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Review your attendance records and monitor your current progress.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back to Dashboard
          </Link>

          <Link
            href="/student/classes"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <CalendarDays size={16} />
            View Classes
          </Link>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

      {/*Summary Cards*/}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Records
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : attendance.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">Captured attendance entries</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Present
            </p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {loading ? '—' : presentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Successful check-ins</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Absent
            </p>
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : absentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Missing attendance records</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Attendance Rate
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {loading ? '—' : `${attendanceRate}%`}
          </p>
          <p className="mt-2 text-xs text-gray-500">Overall current progress</p>
        </div>
      </section>

      {/*Search and Filter*/}
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by unit code, session, or recorded time..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#E4002B]/30 focus:bg-white"
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
                    ? 'bg-[#E4002B] text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-[#E4002B]/20 hover:text-[#E4002B]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/*Attendance List*/}
      <section className="rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Attendance Records</h2>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            {filteredAttendance.length} item{filteredAttendance.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-sm text-gray-500">
              Loading attendance records...
            </div>
          ) : filteredAttendance.length > 0 ? (
            filteredAttendance.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 px-6 py-5 transition hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                      {item.code}
                    </span>

                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                      {item.session}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500">
                    {item.recordedAt
                      ? `Recorded at ${item.recordedAt}`
                      : 'No recorded time available'}
                  </p>
                </div>

                <span
                  className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-bold sm:self-center ${getStatusBadgeClasses(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-sm text-gray-500">
              No attendance records matched your current filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}