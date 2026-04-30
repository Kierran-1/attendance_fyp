'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  Layers3,
  MapPin,
  Search,
} from 'lucide-react';

type SessionSummary = {
  id: string;
  sessionName: string;
  sessionTime: string;
  day: string;
  time: string;
  location: string | null;
  venue: string | null;
  weekNumber: number | null;
  groupNo: string | null;
  subcomponent: string | null;
  lecturer: string | null;
  sessionDuration: number;
  sessionStatus: 'Active' | 'Upcoming' | 'Completed';
  attendanceStatus: string;
  verifiedAt: string | null;
};

type StudentClass = {
  id: string;
  code: string;
  name: string;
  lecturer: string | null;
  sessionTypes: string[];
  attendanceRate: number | null;
  sessions: SessionSummary[];
};

type ClassesApiResponse = {
  classes?: StudentClass[];
};

type StudentSessionViewItem = {
  id: string;
  unitCode: string;
  unitName: string;
  lecturer: string;
  sessionType: string;
  subcomponent: string;
  groupNo: string | null;
  day: string;
  time: string;
  venue: string;
  duration: number | null;
  weekNumber: number | null;
  status: 'Active' | 'Upcoming' | 'Completed';
  attendanceStatus: string;
};

function getStatusClasses(status: StudentSessionViewItem['status']) {
  if (status === 'Active') return 'border-green-100 bg-green-50 text-green-700';
  if (status === 'Upcoming') return 'border-blue-100 bg-blue-50 text-blue-700';
  return 'border-gray-200 bg-gray-50 text-gray-600';
}

function getAttendanceTone(status: string) {
  const upper = status.toUpperCase();

  if (upper === 'PRESENT' || upper === 'LATE') {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  if (upper === 'PENDING') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  return 'border-red-100 bg-red-50 text-red-600';
}

export default function StudentSessionsPage() {
  const [sessions, setSessions] = useState<StudentSessionViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active' | 'Upcoming' | 'Completed'
  >('All');
  const [typeFilter, setTypeFilter] = useState<
    'All' | 'Lecture' | 'Tutorial' | 'Lab'
  >('All');

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/student/classes', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load sessions.');
      }

      const data: ClassesApiResponse = await res.json();
      const classItems = Array.isArray(data.classes) ? data.classes : [];

      const mappedSessions: StudentSessionViewItem[] = classItems.flatMap((item) =>
        (item.sessions ?? []).map((session) => ({
          id: session.id,
          unitCode: item.code,
          unitName: item.name,
          lecturer: session.lecturer ?? item.lecturer ?? 'Not assigned',
          sessionType: session.sessionName,
          subcomponent: session.subcomponent ?? session.sessionName,
          groupNo: session.groupNo ?? null,
          day: session.day,
          time: session.time,
          venue: session.location ?? 'Venue not set',
          duration: session.sessionDuration ?? null,
          weekNumber: session.weekNumber ?? null,
          status: session.sessionStatus,
          attendanceStatus: session.attendanceStatus,
        }))
      );

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

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="cursor-default hover:text-gray-600">Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Sessions</span>
      </nav>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
            My Sessions
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            View actual class-session rows from the backend instead of inferred session types.
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

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Sessions</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{loading ? '—' : totalSessions}</p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Active</p>
          <p className="mt-3 text-3xl font-black text-green-600">{loading ? '—' : activeCount}</p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Upcoming</p>
          <p className="mt-3 text-3xl font-black text-blue-600">{loading ? '—' : upcomingCount}</p>
        </div>
      </section>

      <section className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search unit, session, lecturer, venue..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-50"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'All' | 'Active' | 'Upcoming' | 'Completed'
                )
              }
              className="bg-transparent py-3 text-sm font-medium text-gray-700 outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4">
            <Layers3 size={16} className="text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'All' | 'Lecture' | 'Tutorial' | 'Lab')
              }
              className="bg-transparent py-3 text-sm font-medium text-gray-700 outline-none"
            >
              <option value="All">All Types</option>
              <option value="Lecture">Lecture</option>
              <option value="Tutorial">Tutorial</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
            No sessions found.
          </div>
        ) : (
          filteredSessions.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-600">
                    {item.unitCode}
                  </div>

                  <h3 className="mt-3 text-xl font-black text-gray-900">
                    {item.unitName}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                      {item.sessionType}
                    </span>

                    {item.groupNo ? (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                        Group {item.groupNo}
                      </span>
                    ) : null}

                    {item.weekNumber ? (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                        Week {item.weekNumber}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getAttendanceTone(
                      item.attendanceStatus
                    )}`}
                  >
                    {item.attendanceStatus}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-gray-400">
                    <CalendarDays size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Day</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.day}</p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-gray-400">
                    <Clock3 size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Time</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.time}</p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-gray-400">
                    <MapPin size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Venue</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.venue}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">Lecturer:</span> {item.lecturer}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">Detail:</span>{' '}
                  {item.subcomponent}
                  {item.duration ? ` · ${item.duration} mins` : ''}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}