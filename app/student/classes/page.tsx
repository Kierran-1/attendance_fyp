'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  GraduationCap,
  MapPin,
  Search,
} from 'lucide-react';

type StudentClass = {
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
};

function getAttendanceTone(rate: number) {
  /*Return styling classes based on attendance percentage*/
  if (rate >= 80) {
    return 'bg-green-50 text-green-700 border-green-100';
  }

  if (rate >= 60) {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }

  return 'bg-red-50 text-red-600 border-red-100';
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      setLoading(true);
      setError('');

      /*Load classes from the existing student classes API*/
      const res = await fetch('/api/student/classes', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load classes.');
      }

      const data = await res.json();
      setClasses(data.classes || []);
    } catch (err) {
      console.error('Failed to load student classes:', err);
      setError('Unable to load your classes right now.');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredClasses = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return classes;

    /* Search against code, name, lecturer, and location */
    return classes.filter((item) => {
      return (
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.lecturer.toLowerCase().includes(keyword) ||
        item.location.toLowerCase().includes(keyword)
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

  const lectureCount = classes.filter(
    (item) => item.sessionType?.toLowerCase() === 'lecture'
  ).length;

  const tutorialLabCount = classes.filter(
    (item) =>
      item.sessionType?.toLowerCase() === 'tutorial' ||
      item.sessionType?.toLowerCase() === 'lab'
  ).length;

  return (
    <div className="space-y-6">
      {/*Header*/}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            My Classes
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Review all enrolled units, timetable details, and attendance progress.
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

      {/*Summary Cards*/}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Units
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : totalClasses}
          </p>
          <p className="mt-2 text-xs text-gray-500">Enrolled student classes</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Avg Attendance
            </p>
            <GraduationCap size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {loading ? '—' : `${averageAttendance}%`}
          </p>
          <p className="mt-2 text-xs text-gray-500">Across all current units</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Lecture Units
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : lectureCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Classes with lecture sessions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Tutorial / Lab
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : tutorialLabCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Supporting session types</p>
        </div>
      </section>

      {/*Search Bar*/}
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by unit code, name, lecturer, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#E4002B]/30 focus:bg-white"
          />
        </div>
      </section>

      {/*Classes List*/}
      <section className="rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Enrolled Class List</h2>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            {filteredClasses.length} item{filteredClasses.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-sm text-gray-500">Loading classes...</div>
          ) : filteredClasses.length > 0 ? (
            filteredClasses.map((item) => {
              const rate = item.attendanceRate ?? 0;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 px-6 py-5 transition hover:bg-rose-50/40"
                >
                  {/* Top row */}
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                          {item.code}
                        </span>

                        {item.sessionType && (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                            {item.sessionType}
                          </span>
                        )}

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getAttendanceTone(
                            rate
                          )}`}
                        >
                          {rate}% attendance
                        </span>
                      </div>

                      <h3 className="text-lg font-black tracking-tight text-gray-900">
                        {item.name}
                      </h3>

                      <p className="mt-2 text-sm text-gray-500">
                        Lecturer: <span className="font-semibold text-gray-700">{item.lecturer}</span>
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
                      <p className="text-sm font-semibold text-gray-900">
                        {item.venue || item.location || 'Not set'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        <BookOpen size={14} />
                        Faculty
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.faculty || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-8 text-sm text-gray-500">
              No matching classes found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}