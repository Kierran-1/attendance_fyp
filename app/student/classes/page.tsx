'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  GraduationCap,
  LayoutGrid,
  Loader2,
  MapPin,
  Search,
  UserCircle2,
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
  day: string | null;
  time: string | null;
  venue: string | null;
  location: string | null;
  sessionType: string | null;
  sessionTypes: string[];
  attendanceRate: number | null;
  sessions: SessionSummary[];
};

type ClassesApiResponse = {
  classes?: StudentClass[];
};

function getAttendanceTone(rate: number) {
  if (rate >= 80) return 'bg-green-50 text-green-700 border-green-100';
  if (rate >= 60) return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-red-50 text-red-600 border-red-100';
}

function getAttendanceText(rate: number) {
  if (rate >= 80) return 'Strong';
  if (rate >= 60) return 'Moderate';
  return 'Needs attention';
}

function getSessionChipClasses(sessionName: string) {
  const upper = sessionName.toUpperCase();

  if (upper === 'LECTURE') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (upper === 'TUTORIAL') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (upper === 'LAB') return 'bg-emerald-50 text-emerald-700 border-emerald-100';

  return 'bg-gray-50 text-gray-700 border-gray-100';
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/student/classes', {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to load classes.');
        }

        const data: ClassesApiResponse = await res.json();
        setClasses(Array.isArray(data.classes) ? data.classes : []);
      } catch (err) {
        console.error('Failed to load student classes:', err);
        setError('Unable to load your classes right now.');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }

    loadClasses();
  }, []);

  const filteredClasses = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return classes;

    return classes.filter((item) => {
      const lecturer = item.lecturer ?? '';
      const venue = item.venue ?? '';
      const location = item.location ?? '';
      const sessionTypes = item.sessionTypes.join(' ');

      return (
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        lecturer.toLowerCase().includes(keyword) ||
        venue.toLowerCase().includes(keyword) ||
        location.toLowerCase().includes(keyword) ||
        sessionTypes.toLowerCase().includes(keyword)
      );
    });
  }, [classes, searchTerm]);

  const totalClasses = classes.length;

  const averageAttendance = useMemo(() => {
    if (!classes.length) return 0;

    const total = classes.reduce((sum, item) => sum + (item.attendanceRate ?? 0), 0);
    return Math.round(total / classes.length);
  }, [classes]);

  const strongAttendanceCount = classes.filter(
    (item) => (item.attendanceRate ?? 0) >= 80
  ).length;

  const supportNeededCount = classes.filter(
    (item) => (item.attendanceRate ?? 0) < 60
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Classes</span>
      </nav>

      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            My <span className="text-red-600">Classes</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            Review your enrolled units and their real session rows created on the lecturer side.
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
            href="/student/attendance"
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700"
          >
            <CalendarDays size={16} />
            View Attendance
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-bold">Unable to load classes</p>
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Total Units
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : totalClasses}
          </p>
          <p className="mt-2 text-xs text-gray-500">Units linked to your student account</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Avg Attendance
            </p>
            <GraduationCap size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : `${averageAttendance}%`}
          </p>
          <p className="mt-2 text-xs text-gray-500">Based on completed sessions only</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Strong Progress
            </p>
            <LayoutGrid size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : strongAttendanceCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Units with 80% attendance or above</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Need Attention
            </p>
            <UserCircle2 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : supportNeededCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Units below 60% attendance</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-black text-gray-900">Search Classes</p>
            <p className="text-sm text-gray-500">
              Search by unit code, unit name, lecturer, venue, or session type.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search your classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-50"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center rounded-[28px] border border-gray-100 bg-white px-6 py-16 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 size={18} className="animate-spin text-red-600" />
              <span className="text-sm font-semibold">Loading classes...</span>
            </div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-lg font-black text-gray-900">No classes found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try another search or wait until your lecturer-uploaded units appear.
            </p>
          </div>
        ) : (
          filteredClasses.map((item) => {
            const attendanceRate = item.attendanceRate ?? 0;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="border-b border-gray-100 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-600">
                        {item.code}
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-gray-900">
                        {item.name}
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        {item.lecturer || 'Lecturer not assigned yet'}
                      </p>
                    </div>

                    <div
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold ${getAttendanceTone(
                        attendanceRate
                      )}`}
                    >
                      {attendanceRate}% · {getAttendanceText(attendanceRate)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Session Types
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.sessionTypes.length > 0 ? (
                          item.sessionTypes.map((sessionType) => (
                            <span
                              key={`${item.id}-${sessionType}`}
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${getSessionChipClasses(
                                sessionType
                              )}`}
                            >
                              {sessionType}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
                            No sessions yet
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-gray-400">
                          <CalendarDays size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Day
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.day ?? 'Not scheduled'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-gray-400">
                          <Clock3 size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Time
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.time ?? 'Not scheduled'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-gray-400">
                          <MapPin size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Venue
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.venue ?? 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100 bg-gray-50/60 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Session Preview
                    </p>

                    <div className="mt-4 space-y-3">
                      {item.sessions.length > 0 ? (
                        item.sessions.slice(0, 4).map((session) => (
                          <div
                            key={session.id}
                            className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {session.sessionName}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {session.day} · {session.time}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {session.location ?? 'Venue not set'}
                                </p>
                              </div>

                              <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                {session.sessionStatus}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                          No lecturer-created sessions available yet for this unit.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}