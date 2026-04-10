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

type StudentClass = {
  id: string;
  code: string;
  name: string;
  lecturer: string | null;
  faculty?: string | null;
  day: string | null;
  time: string | null;
  venue?: string | null;
  location?: string | null;
  sessionType?: string | null;
  attendanceRate?: number | null;
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

function normaliseSessionType(raw?: string | null) {
  if (!raw) return 'Mixed';

  const upper = raw.toUpperCase();

  if (upper === 'LE' || upper === 'LECTURE') return 'Lecture';
  if (upper === 'LA' || upper === 'LAB') return 'Lab';
  if (upper === 'TU' || upper === 'TUTORIAL') return 'Tutorial';
  if (upper === 'PR' || upper === 'PRACTICAL') return 'Practical';

  return raw;
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
      const sessionType = item.sessionType ?? '';

      return (
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        lecturer.toLowerCase().includes(keyword) ||
        venue.toLowerCase().includes(keyword) ||
        location.toLowerCase().includes(keyword) ||
        sessionType.toLowerCase().includes(keyword)
      );
    });
  }, [classes, searchTerm]);

  const totalClasses = classes.length;

  const averageAttendance = useMemo(() => {
    if (!classes.length) return 0;

    const total = classes.reduce((sum, item) => {
      return sum + (item.attendanceRate ?? 0);
    }, 0);

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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Classes</span>
      </nav>

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            My <span className="text-red-600">Classes</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            Review your enrolled units, monitor attendance progress, and keep your
            student panel aligned with the active lecturer attendance workflow.
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
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 active:scale-95"
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

      {/* Summary Cards */}
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
          <p className="mt-2 text-xs text-gray-500">Units currently linked to your account</p>
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
          <p className="mt-2 text-xs text-gray-500">Average across all enrolled units</p>
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
          <p className="mt-2 text-xs text-gray-500">Units with attendance of 80% or higher</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Needs Attention
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : supportNeededCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Units currently below 60% attendance</p>
        </div>
      </section>

      {/* Search */}
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by unit code, unit name, lecturer, venue, or session type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-red-200 focus:bg-white"
          />
        </div>
      </section>

      {/* Classes List */}
      <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-gray-900">Enrolled Classes</h2>
            <p className="text-sm text-gray-500">
              {loading
                ? 'Loading your class information...'
                : `${filteredClasses.length} visible unit${filteredClasses.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            Student view
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin text-red-600" />
            Loading your classes...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-50 p-4 text-gray-300">
              <BookOpen size={32} />
            </div>
            <p className="text-base font-bold text-gray-700">No classes found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search keyword or wait until roster data is synced.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredClasses.map((item) => {
              const attendanceRate = item.attendanceRate ?? 0;
              const lecturerName = item.lecturer?.trim() || 'Not assigned yet';
              const displayDay = item.day?.trim() || 'To be scheduled';
              const displayTime = item.time?.trim() || 'Time not available';
              const displayVenue =
                item.venue?.trim() || item.location?.trim() || 'Venue not available';
              const displayType = normaliseSessionType(item.sessionType);

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-6 px-6 py-6 transition-colors hover:bg-gray-50/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        {item.code}
                      </span>

                      <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        {displayType}
                      </span>

                      <span
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getAttendanceTone(
                          attendanceRate
                        )}`}
                      >
                        {attendanceRate}% · {getAttendanceText(attendanceRate)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <UserCircle2 size={15} />
                        {lecturerName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {displayDay}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {displayTime}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        {displayVenue}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <Link
                      href="/student/attendance"
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-red-100 hover:text-red-600"
                    >
                      <CalendarDays size={16} />
                      Attendance
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