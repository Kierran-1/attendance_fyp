'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  GraduationCap,
  MapPin,
  Search,
  UserRound,
} from 'lucide-react';

type ClassSchedule = {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  faculty: string;
  day: string;
  time: string;
  venue: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Lab';
  attendanceRate: number;
};

const enrolledClasses: ClassSchedule[] = [
  {
    id: 'cls-1',
    code: 'COS40005',
    name: 'Computing Technology Project A',
    lecturer: 'Jason Thomas Chew',
    faculty: 'Faculty of Engineering, Computing and Science',
    day: 'Monday',
    time: '9:00 AM - 11:00 AM',
    venue: 'A304',
    sessionType: 'Tutorial',
    attendanceRate: 92,
  },
  {
    id: 'cls-2',
    code: 'COS30049',
    name: 'Computing Technology Innovation Project',
    lecturer: 'Elaine Yeu Yee Lee',
    faculty: 'Faculty of Engineering, Computing and Science',
    day: 'Tuesday',
    time: '2:00 PM - 4:00 PM',
    venue: 'B203',
    sessionType: 'Lecture',
    attendanceRate: 88,
  },
  {
    id: 'cls-3',
    code: 'SWE30003',
    name: 'Software Architecture and Design',
    lecturer: 'Siti Khatijah Bolhassan',
    faculty: 'Faculty of Engineering, Computing and Science',
    day: 'Thursday',
    time: '10:00 AM - 12:00 PM',
    venue: 'C102',
    sessionType: 'Lecture',
    attendanceRate: 80,
  },
  {
    id: 'cls-4',
    code: 'COS30015',
    name: 'IT Security',
    lecturer: 'Ahmad Rahman',
    faculty: 'Faculty of Engineering, Computing and Science',
    day: 'Friday',
    time: '4:00 PM - 6:00 PM',
    venue: 'D204',
    sessionType: 'Lab',
    attendanceRate: 95,
  },
];

function getSessionTypeClasses(type: ClassSchedule['sessionType']) {
  switch (type) {
    case 'Lecture':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'Tutorial':
      return 'bg-rose-50 text-[#E4002B] border-rose-100';
    case 'Lab':
      return 'bg-purple-50 text-purple-700 border-purple-100';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-100';
  }
}

function getAttendanceClasses(rate: number) {
  if (rate >= 90) return 'text-green-600';
  if (rate >= 75) return 'text-amber-600';
  return 'text-red-600';
}

export default function StudentClassesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<
    'All' | 'Lecture' | 'Tutorial' | 'Lab'
  >('All');

  const filteredClasses = useMemo(() => {
    return enrolledClasses.filter((item) => {
      const matchesSearch =
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lecturer.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        selectedType === 'All' ? true : item.sessionType === selectedType;

      return matchesSearch && matchesType;
    });
  }, [searchTerm, selectedType]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            My Classes
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View your enrolled units, class schedules, lecturer information, and
            quick links to related student features.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          Back to Dashboard
        </Link>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Classes
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {enrolledClasses.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">Current enrolled units</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Lectures
            </p>
            <GraduationCap size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {enrolledClasses.filter((item) => item.sessionType === 'Lecture').length}
          </p>
          <p className="mt-2 text-xs text-gray-500">Lecture sessions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Tutorials / Labs
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {
              enrolledClasses.filter(
                (item) => item.sessionType === 'Tutorial' || item.sessionType === 'Lab'
              ).length
            }
          </p>
          <p className="mt-2 text-xs text-gray-500">Interactive sessions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Average Attendance
            </p>
            <Clock3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {Math.round(
              enrolledClasses.reduce((sum, item) => sum + item.attendanceRate, 0) /
                enrolledClasses.length
            )}
            %
          </p>
          <p className="mt-2 text-xs text-gray-500">Based on sample records</p>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_220px]">
          <div>
            <label
              htmlFor="search-classes"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Search classes
            </label>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="search-classes"
                type="text"
                placeholder="Search by unit code, class name, or lecturer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="filter-type"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Filter by session type
            </label>

            <div className="relative">
              <Filter
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                id="filter-type"
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(
                    e.target.value as 'All' | 'Lecture' | 'Tutorial' | 'Lab'
                  )
                }
                className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              >
                <option value="All">All</option>
                <option value="Lecture">Lecture</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Lab">Lab</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Classes list */}
      <section className="space-y-4">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                      {item.code}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionTypeClasses(
                        item.sessionType
                      )}`}
                    >
                      {item.sessionType}
                    </span>
                  </div>

                  <h2 className="text-xl font-black tracking-tight text-gray-900">
                    {item.name}
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    {item.faculty}
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        <UserRound size={14} />
                        Lecturer
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.lecturer}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        <CalendarDays size={14} />
                        Day
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.day}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        <Clock3 size={14} />
                        Time
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.time}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        <MapPin size={14} />
                        Venue
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.venue}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right info panel */}
                <div className="w-full xl:w-[250px]">
                  <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E4002B]">
                      Attendance Rate
                    </p>

                    <p
                      className={`mt-3 text-4xl font-black tracking-tight ${getAttendanceClasses(
                        item.attendanceRate
                      )}`}
                    >
                      {item.attendanceRate}%
                    </p>

                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#E4002B]"
                        style={{ width: `${item.attendanceRate}%` }}
                      />
                    </div>

                    <p className="mt-3 text-xs leading-6 text-gray-500">
                      Sample UI percentage. Connect this to real attendance data later.
                    </p>

                    <div className="mt-5 space-y-3">
                      <Link
                        href="/student/attendance"
                        className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        <span>Open Attendance</span>
                        <ChevronRight size={16} />
                      </Link>

                      <Link
                        href="/student/qrcode"
                        className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        <span>Open My QR</span>
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">No classes found</h2>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Try changing the search term or session type filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}