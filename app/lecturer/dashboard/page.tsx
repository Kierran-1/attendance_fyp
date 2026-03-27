'use client';

import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  PlayCircle,
  ScanLine,
  Upload,
  Users,
} from 'lucide-react';

/**
 * Later integration:
 * - replace sample data with real Supabase / server-side data
 * - connect quick actions to actual session and roster workflows
 * - connect charts and analytics to attendance records
 */

type LecturerClass = {
  id: string;
  code: string;
  name: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Lab';
  date: string;
  time: string;
  venue: string;
  studentCount: number;
};

type LiveSession = {
  active: boolean;
  code: string;
  name: string;
  sessionType: string;
  venue: string;
  attendanceWindow: string;
  checkedInCount: number;
  totalStudents: number;
};

const lecturerSummary = {
  totalClasses: 4,
  todayClasses: 2,
  checkedInToday: 47,
  averageAttendanceRate: 89,
};

const todaysClasses: LecturerClass[] = [
  {
    id: 'today-1',
    code: 'COS40005',
    name: 'Computing Technology Project A',
    sessionType: 'Tutorial',
    date: '26 Mar 2026',
    time: '9:00 AM - 11:00 AM',
    venue: 'A304',
    studentCount: 28,
  },
  {
    id: 'today-2',
    code: 'SWE30003',
    name: 'Software Architecture and Design',
    sessionType: 'Lecture',
    date: '26 Mar 2026',
    time: '2:00 PM - 4:00 PM',
    venue: 'C102',
    studentCount: 53,
  },
];

const upcomingClasses: LecturerClass[] = [
  {
    id: 'upcoming-1',
    code: 'COS30049',
    name: 'Computing Technology Innovation Project',
    sessionType: 'Lecture',
    date: '27 Mar 2026',
    time: '10:00 AM - 12:00 PM',
    venue: 'B203',
    studentCount: 41,
  },
  {
    id: 'upcoming-2',
    code: 'COS30015',
    name: 'IT Security',
    sessionType: 'Lab',
    date: '28 Mar 2026',
    time: '4:00 PM - 6:00 PM',
    venue: 'D204',
    studentCount: 35,
  },
];

const liveSession: LiveSession = {
  active: true,
  code: 'COS40005',
  name: 'Computing Technology Project A',
  sessionType: 'Tutorial',
  venue: 'A304',
  attendanceWindow: 'Open until 10:10 AM',
  checkedInCount: 19,
  totalStudents: 28,
};

function getSessionBadgeClasses(type: LecturerClass['sessionType']) {
  switch (type) {
    case 'Lecture':
      return 'border-blue-100 bg-blue-50 text-blue-700';
    case 'Tutorial':
      return 'border-rose-100 bg-rose-50 text-[#E4002B]';
    case 'Lab':
      return 'border-purple-100 bg-purple-50 text-purple-700';
    default:
      return 'border-gray-100 bg-gray-50 text-gray-700';
  }
}

export default function LecturerDashboardPage() {
  const liveAttendanceRate = Math.round(
    (liveSession.checkedInCount / liveSession.totalStudents) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Monitor classes, attendance progress, and quick actions from
            one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/live-attendance"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <PlayCircle size={16} />
            Start Attendance
          </Link>

          <Link
            href="/lecturer/upload-roster"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <Upload size={16} />
            Upload Roster
          </Link>
        </div>
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
            {lecturerSummary.totalClasses}
          </p>
          <p className="mt-2 text-xs text-gray-500">Units under this lecturer</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Today&apos;s Classes
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {lecturerSummary.todayClasses}
          </p>
          <p className="mt-2 text-xs text-gray-500">Scheduled for today</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Checked In Today
            </p>
            <Users size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {lecturerSummary.checkedInToday}
          </p>
          <p className="mt-2 text-xs text-gray-500">Students recorded today</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Avg. Attendance Rate
            </p>
            <BarChart3 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {lecturerSummary.averageAttendanceRate}%
          </p>
          <p className="mt-2 text-xs text-gray-500">Sample dashboard analytics</p>
        </div>
      </section>

      {/* Main content grid */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Today's classes */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Today&apos;s Classes
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Quick overview of the classes scheduled today
                </p>
              </div>

              <Link
                href="/lecturer/classes"
                className="text-sm font-semibold text-[#E4002B] transition hover:text-[#C70026]"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {todaysClasses.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 px-6 py-5 transition hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                        {item.code}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionBadgeClasses(
                          item.sessionType
                        )}`}
                      >
                        {item.sessionType}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold uppercase leading-6 text-gray-900">
                      {item.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.date} · {item.time}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.venue} · {item.studentCount} students
                    </p>
                  </div>

                  <Link
                    href="/lecturer/classes"
                    className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                  >
                    View Class
                    <ChevronRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance overview */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Attendance Overview
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Simple analytics block for lecturer dashboard
                </p>
              </div>
              <Clock3 size={18} className="text-gray-300" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Weekly Trend
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">
                  Stable
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Sample placeholder until real chart data is connected
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Best Performing Unit
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">
                  COS30015
                </p>
                <p className="mt-2 text-xs text-gray-500">Highest sample rate</p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Action Needed
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-[#E4002B]">
                  1 Class
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  One session may still require roster upload
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100">
              <div className="bg-gray-50 px-5 py-4">
                <p className="text-sm font-bold text-gray-900">
                  Sample Attendance Rate Bars
                </p>
              </div>

              <div className="space-y-4 px-5 py-5">
                {[
                  { label: 'COS40005', rate: 91 },
                  { label: 'SWE30003', rate: 87 },
                  { label: 'COS30049', rate: 84 },
                  { label: 'COS30015', rate: 94 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-800">{item.label}</span>
                      <span className="font-bold text-[#E4002B]">{item.rate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#E4002B]"
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Live session */}
          <div className="rounded-3xl bg-[#E4002B] p-6 text-white shadow-lg shadow-rose-100">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                Live Session
              </p>
              <ScanLine size={18} className="text-white/80" />
            </div>

            {liveSession.active ? (
              <>
                <p className="text-lg font-black tracking-tight">
                  {liveSession.code}
                </p>
                <p className="mt-1 text-sm text-white/85">{liveSession.name}</p>

                <div className="mt-5 space-y-2 text-sm text-white/85">
                  <p>{liveSession.sessionType}</p>
                  <p>{liveSession.venue}</p>
                  <p>{liveSession.attendanceWindow}</p>
                </div>

                <div className="mt-5 rounded-2xl bg-white/10 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Checked In</span>
                    <span className="font-bold">
                      {liveSession.checkedInCount}/{liveSession.totalStudents}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${liveAttendanceRate}%` }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-white/75">
                    Live attendance progress: {liveAttendanceRate}%
                  </p>
                </div>

                <Link
                  href="/lecturer/live-attendance"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#E4002B] transition hover:bg-rose-50"
                >
                  <PlayCircle size={16} />
                  Open Live Attendance
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-black tracking-tight">
                  No active session
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Start a new session to begin attendance scanning.
                </p>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Common lecturer tasks for the attendance workflow
            </p>

            <div className="mt-4 space-y-3">
              <Link
                href="/lecturer/live-attendance"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>Start Attendance</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/lecturer/upload-roster"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>Upload Student Roster</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/lecturer/classes"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>Manage Classes</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/lecturer/reports"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>Open Reports</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {/* Upcoming classes */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">
              Upcoming Classes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Next scheduled lecturer sessions
            </p>

            <div className="mt-4 space-y-3">
              {upcomingClasses.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                      {item.code}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionBadgeClasses(
                        item.sessionType
                      )}`}
                    >
                      {item.sessionType}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-gray-900">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.date} · {item.time}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.venue} · {item.studentCount} students
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}