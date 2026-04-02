'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Search,
  XCircle,
} from 'lucide-react';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

type AttendanceRecord = {
  id: string;
  date: string;
  unitCode: string;
  unitName: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Lab' | 'Practical';
  time: string;
  venue: string;
  status: AttendanceStatus;
  recordedAt: string | null;
};

type ApiAttendanceRecord = {
  sessionId: string;
  date: string;
  courseCode: string;
  courseName: string;
  sessionType: 'LECTURE' | 'TUTORIAL' | 'LAB' | 'PRACTICAL';
  checkInTime: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  venue?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

function getStatusClasses(status: AttendanceStatus) {
  if (status === 'Present') {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  if (status === 'Late') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  if (status === 'Excused') {
    return 'border-blue-100 bg-blue-50 text-blue-700';
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

  if (sessionType === 'Practical') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  return 'border-purple-100 bg-purple-50 text-purple-700';
}

export default function StudentAttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Present' | 'Absent' | 'Late' | 'Excused'
  >('All');

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/student/attendance', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch attendance');
        const data = await res.json();

        const mapped: AttendanceRecord[] = (data.records ?? []).map((record: ApiAttendanceRecord) => {
          const start = record.startTime ? new Date(record.startTime) : null;
          const end = record.endTime ? new Date(record.endTime) : null;
          const checkIn = record.checkInTime ? new Date(record.checkInTime) : null;

          const sessionType =
            record.sessionType === 'LECTURE'
              ? 'Lecture'
              : record.sessionType === 'TUTORIAL'
                ? 'Tutorial'
                : record.sessionType === 'LAB'
                  ? 'Lab'
                  : 'Practical';

          const status =
            record.status === 'PRESENT'
              ? 'Present'
              : record.status === 'LATE'
                ? 'Late'
                : record.status === 'EXCUSED'
                  ? 'Excused'
                  : 'Absent';

          return {
            id: record.sessionId,
            date: new Date(record.date).toLocaleDateString(),
            unitCode: record.courseCode,
            unitName: record.courseName,
            sessionType,
            time:
              start && end
                ? `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'TBD',
            venue: record.venue || 'TBD',
            status,
            recordedAt: checkIn
              ? checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null,
          };
        });

        setAttendanceRecords(mapped);
      } catch (err) {
        console.error('Failed to load attendance:', err);
        setError('Unable to load attendance records at the moment.');
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

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
  }, [attendanceRecords, searchTerm, statusFilter]);

  const presentCount = attendanceRecords.filter(
    (item) => item.status === 'Present'
  ).length;

  const absentCount = attendanceRecords.filter((item) => item.status === 'Absent').length;

  const attendedCount = attendanceRecords.filter((item) => item.status !== 'Absent').length;

  const attendanceRate = Math.round(
    attendanceRecords.length > 0 ? (attendedCount / attendanceRecords.length) * 100 : 0
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

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

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
          <p className="mt-2 text-xs text-gray-500">Based on your account records</p>
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
                setStatusFilter(
                  e.target.value as 'All' | 'Present' | 'Absent' | 'Late' | 'Excused'
                )
              }
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              <option value="All">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Excused">Excused</option>
            </select>
          </div>
        </div>
      </section>

      {/* Attendance list */}
      <section className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Loading attendance records...</h2>
          </div>
        ) : filteredRecords.length > 0 ? (
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
                      {item.status === 'Present' || item.status === 'Late' || item.status === 'Excused'
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