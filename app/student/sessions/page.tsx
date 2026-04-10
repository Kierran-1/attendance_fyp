'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  Layers3,
  MapPin,
  Search,
} from 'lucide-react';

type StudentClassApiItem = {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  faculty?: string;
  day: string;
  time: string;
  venue?: string;
  location: string;
  sessionType?: string;
  attendanceRate?: number;

  weekNumber?: number;
  subcomponent?: string;
  groupNo?: number;
  sessionDuration?: number;
  sessionStatus?: 'Active' | 'Upcoming' | 'Completed';
};

type StudentSessionViewItem = {
  id: string;
  unitCode: string;
  unitName: string;
  lecturer: string;
  faculty: string;
  sessionType: string;
  subcomponent: string;
  groupNo: number | null;
  day: string;
  time: string;
  venue: string;
  duration: number | null;
  weekNumber: number | null;
  status: 'Active' | 'Upcoming' | 'Completed';
  attendanceRate: number;
};

function getStatusClasses(status: StudentSessionViewItem['status']) {
  /* Visual badge styles for session state*/
  if (status === 'Active') {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  if (status === 'Upcoming') {
    return 'border-blue-100 bg-blue-50 text-blue-700';
  }

  return 'border-gray-200 bg-gray-50 text-gray-600';
}

function getAttendanceTone(rate: number) {
  /* Visual badge styles for attendance rate */
  if (rate >= 80) {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  if (rate >= 60) {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  return 'border-red-100 bg-red-50 text-red-600';
}

function inferSessionStatus(day: string): 'Active' | 'Upcoming' | 'Completed' {
  /* Temporary frontend-only until backend provides actual session status*/
  const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const todayIndex = new Date().getDay();
  const sessionIndex = weekdays.findIndex(
    (item) => item.toLowerCase() === day.toLowerCase()
  );

  if (sessionIndex === -1) return 'Upcoming';
  if (sessionIndex === todayIndex) return 'Active';
  if (sessionIndex > todayIndex) return 'Upcoming';
  return 'Completed';
}

function normalizeSessionType(sessionType?: string) {
  /* -------------------------------------------------------
     Provide a clean fallback if sessionType is missing.
     ------------------------------------------------------- */
  if (!sessionType || !sessionType.trim()) return 'Lecture';

  const lower = sessionType.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function StudentSessionsPage() {
  const [sessions, setSessions] = useState<StudentSessionViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Upcoming' | 'Completed'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Lecture' | 'Tutorial' | 'Lab'>('All');

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      setError('');

      /* -----------------------------------------------------
         Current implementation uses the existing classes API.
         Later, this can be replaced with:
         /api/student/sessions
         once backend session rows are exposed directly.
         ----------------------------------------------------- */
      const res = await fetch('/api/student/classes', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load sessions.');
      }

      const data = await res.json();
      const classItems: StudentClassApiItem[] = data.classes || [];

      /* -----------------------------------------------------
         Transform class-level API items into session-oriented
         view models.
         ----------------------------------------------------- */
      const mappedSessions: StudentSessionViewItem[] = classItems.map((item) => {
        const normalizedType = normalizeSessionType(item.sessionType);

        return {
          id: item.id,
          unitCode: item.code,
          unitName: item.name,
          lecturer: item.lecturer,
          faculty: item.faculty || 'Not available',
          sessionType: normalizedType,
          subcomponent: item.subcomponent || normalizedType,
          groupNo: item.groupNo ?? null,
          day: item.day,
          time: item.time,
          venue: item.venue || item.location || 'Venue not set',
          duration: item.sessionDuration ?? null,
          weekNumber: item.weekNumber ?? null,
          status: item.sessionStatus || inferSessionStatus(item.day),
          attendanceRate: item.attendanceRate ?? 0,
        };
      });

      setSessions(mappedSessions);
    } catch (err) {
      console.error('Failed to load student sessions:', err);
      setError('Unable to load session data right now.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return sessions.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.unitCode.toLowerCase().includes(keyword) ||
        item.unitName.toLowerCase().includes(keyword) ||
        item.lecturer.toLowerCase().includes(keyword) ||
        item.venue.toLowerCase().includes(keyword) ||
        item.sessionType.toLowerCase().includes(keyword) ||
        item.subcomponent.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter;

      const matchesType =
        typeFilter === 'All' || item.sessionType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [sessions, searchTerm, statusFilter, typeFilter]);

  const totalSessions = sessions.length;
  const activeCount = sessions.filter((item) => item.status === 'Active').length;
  const upcomingCount = sessions.filter((item) => item.status === 'Upcoming').length;

  const averageAttendance = useMemo(() => {
    if (!sessions.length) return 0;

    const total = sessions.reduce((sum, item) => sum + item.attendanceRate, 0);
    return Math.round(total / sessions.length);
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* =====================================================
          Header
          ===================================================== */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            My Sessions
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View session-level attendance information aligned with the updated class
            session structure.
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
            href="/student/attendance"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <CalendarDays size={16} />
            View Attendance
          </Link>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

      {/* =====================================================
          Summary Cards
          ===================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Sessions
            </p>
            <Layers3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : totalSessions}
          </p>
          <p className="mt-2 text-xs text-gray-500">Session-level student schedule view</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Active Today
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {loading ? '—' : activeCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Currently inferred active sessions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Upcoming
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-blue-600">
            {loading ? '—' : upcomingCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Future session entries</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Avg Attendance
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {loading ? '—' : `${averageAttendance}%`}
          </p>
          <p className="mt-2 text-xs text-gray-500">Across displayed session rows</p>
        </div>
      </section>

      {/* =====================================================
          Search + Filters
          ===================================================== */}
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by unit, lecturer, venue, or session type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#E4002B]/30 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'All' | 'Active' | 'Upcoming' | 'Completed'
                )
              }
              className="bg-transparent text-sm font-medium text-gray-700 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Layers3 size={16} className="text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as 'All' | 'Lecture' | 'Tutorial' | 'Lab'
                )
              }
              className="bg-transparent text-sm font-medium text-gray-700 outline-none"
            >
              <option value="All">All Types</option>
              <option value="Lecture">Lecture</option>
              <option value="Tutorial">Tutorial</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
        </div>
      </section>

      {/* =====================================================
          Sessions List
          ===================================================== */}
      <section className="rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Session List</h2>
            <p className="mt-1 text-sm text-gray-500">
              Student-facing session view prepared for ClassSession-aligned data
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            {filteredSessions.length} item{filteredSessions.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-sm text-gray-500">Loading sessions...</div>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-5 px-6 py-5 transition hover:bg-rose-50/40"
              >
                {/* Top content */}
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                        {item.unitCode}
                      </span>

                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                        {item.sessionType}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getAttendanceTone(
                          item.attendanceRate
                        )}`}
                      >
                        {item.attendanceRate}% attendance
                      </span>
                    </div>

                    <h3 className="text-lg font-black tracking-tight text-gray-900">
                      {item.unitName}
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Lecturer:{' '}
                      <span className="font-semibold text-gray-700">{item.lecturer}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/student/attendance"
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                    >
                      Attendance Details
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>

                {/* Detail grid */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <CalendarDays size={14} />
                      Day
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.day}</p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <Clock3 size={14} />
                      Time
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.time}</p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <MapPin size={14} />
                      Venue
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.venue}</p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <Layers3 size={14} />
                      Session Detail
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.subcomponent}
                      {item.groupNo !== null ? ` · Group ${item.groupNo}` : ''}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <BookOpen size={14} />
                      Faculty
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.faculty}</p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <CalendarDays size={14} />
                      Week Number
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.weekNumber ?? 'Not available yet'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <Clock3 size={14} />
                      Duration
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.duration ? `${item.duration} minutes` : 'Not available yet'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      <Layers3 size={14} />
                      Type
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.sessionType}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-sm text-gray-500">
              No sessions matched your current search or filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}