'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Search,
  XCircle,
} from 'lucide-react';

/**
 * Later integration:
 * - replace hardcoded data with backend attendance records
 * - filter by logged-in student only
 * - connect export button to real CSV / Excel generation
 */

type AttendanceStatus = 'Present' | 'Absent';

type AttendanceRecord = {
  id: string;
  date: string;
  unitCode: string;
  unitName: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Lab';
  time: string;
  venue: string;
  status: AttendanceStatus;
  recordedAt: string | null;
};

const attendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: '18 Mar 2026',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    sessionType: 'Tutorial',
    time: '9:00 AM - 11:00 AM',
    venue: 'A304',
    status: 'Present',
    recordedAt: '9:03 AM',
  },
  {
    id: 'att-2',
    date: '17 Mar 2026',
    unitCode: 'SWE30003',
    unitName: 'Software Architecture and Design',
    sessionType: 'Lecture',
    time: '10:00 AM - 12:00 PM',
    venue: 'C102',
    status: 'Present',
    recordedAt: '10:01 AM',
  },
  {
    id: 'att-3',
    date: '16 Mar 2026',
    unitCode: 'COS30049',
    unitName: 'Computing Technology Innovation Project',
    sessionType: 'Lecture',
    time: '2:00 PM - 4:00 PM',
    venue: 'B203',
    status: 'Absent',
    recordedAt: null,
  },
  {
    id: 'att-4',
    date: '13 Mar 2026',
    unitCode: 'COS30015',
    unitName: 'IT Security',
    sessionType: 'Lab',
    time: '4:00 PM - 6:00 PM',
    venue: 'D204',
    status: 'Present',
    recordedAt: '4:05 PM',
  },
  {
    id: 'att-5',
    date: '12 Mar 2026',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    sessionType: 'Tutorial',
    time: '9:00 AM - 11:00 AM',
    venue: 'A304',
    status: 'Absent',
    recordedAt: null,
  },
  {
    id: 'att-6',
    date: '11 Mar 2026',
    unitCode: 'SWE30003',
    unitName: 'Software Architecture and Design',
    sessionType: 'Lecture',
    time: '10:00 AM - 12:00 PM',
    venue: 'C102',
    status: 'Present',
    recordedAt: '10:00 AM',
  },
];

function getStatusClasses(status: AttendanceStatus) {
  if (status === 'Present') {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  return 'border-red-100 bg-red-50 text-red-600';
}

function getSessionClasses(sessionType: AttendanceRecord['sessionType']) {
  if (sessionType === 'Lecture') {
    return 'border-blue-100 bg-blue-50 text-blue-700';
  }

  if (sessionType === 'Tutorial') {
    return 'border-rose-100 bg-rose-50 text-[#E4002B]';
  }

  return 'border-purple-100 bg-purple-50 text-purple-700';
}

export default function StudentAttendancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Absent'>(
    'All'
  );

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((item) => {
      const matchesSearch =
        item.unitCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const presentCount = attendanceRecords.filter(
    (item) => item.status === 'Present'
  ).length;

  const absentCount = attendanceRecords.filter(
    (item) => item.status === 'Absent'
  ).length;

  const attendanceRate = Math.round(
    (presentCount / attendanceRecords.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Attendance History
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Review your attendance records by unit, date, and session.
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
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <Download size={16} />
            Print Page
          </button>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Records
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {attendanceRecords.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">Attendance entries shown</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Present
            </p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {presentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Recorded successfully</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Absent
            </p>
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {absentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">No attendance recorded</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Attendance Rate
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {attendanceRate}%
          </p>
          <p className="mt-2 text-xs text-gray-500">Sample student overview</p>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_220px]">
          <div>
            <label
              htmlFor="attendance-search"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Search attendance
            </label>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="attendance-search"
                type="text"
                placeholder="Search by unit code, unit name, or date"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Filter by status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'All' | 'Present' | 'Absent')
              }
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              <option value="All">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>
      </section>

      {/* Attendance list */}
      <section className="space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                      {item.unitCode}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionClasses(
                        item.sessionType
                      )}`}
                    >
                      {item.sessionType}
                    </span>

                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>

                  <h2 className="text-xl font-black tracking-tight text-gray-900">
                    {item.unitName}
                  </h2>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {item.time}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Venue
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {item.venue}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Recorded Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {item.recordedAt ?? 'Not recorded'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full xl:w-[220px]">
                  <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      Attendance Status
                    </p>

                    <div className="mt-4">
                      <span
                        className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getStatusClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-4 text-xs leading-6 text-gray-500">
                      {item.status === 'Present'
                        ? 'Attendance successfully captured for this session.'
                        : 'No attendance record was captured for this session.'}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              No attendance records found
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Try changing the search term or status filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}