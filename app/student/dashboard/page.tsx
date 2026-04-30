'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  Loader2,
  MapPin,
  MoreHorizontal,
  QrCode,
  ScanLine,
  TrendingUp,
  UserCircle2,
  XCircle,
} from 'lucide-react';

type DashboardCourse = {
  id: string;
  code: string;
  name: string;
  semester?: number | null;
  year?: number | null;
  totalSessions: number;
  attendedSessions: number;
};

type RecentAttendance = {
  sessionId: string;
  date: string;
  courseCode: string;
  courseName: string;
  sessionName: string;
  checkInTime: string | null;
  status: string;
};

type DashboardResponse = {
  profile: {
    studentId: string;
    programName: string | null;
  };
  courses: DashboardCourse[];
  recentAttendance: RecentAttendance[];
  stats: {
    overallPct: number | null;
    enrolledCourses: number;
    totalAbsent: number;
  };
};

type TodayAttendanceItem = {
  id: string;
  code: string;
  session: string;
  status: 'Present' | 'Absent';
  recordedAt: string | null;
};

type ActiveStudentSession = {
  id: string;
  unitId: string;
  unit: {
    id?: string;
    code: string;
    name: string;
  };
  sessionName: string;
  sessionTime: string;
  sessionDuration: number;
} | null;

const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  color: string;
  trend?: string;
}) => (
  <div className="group relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-red-100 hover:shadow-md">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          {label}
        </p>
        <h3 className={`mt-2 text-3xl font-black tracking-tight ${color}`}>
          {value}
        </h3>
      </div>

      <div className="rounded-2xl bg-gray-50 p-3 text-gray-400 transition-colors group-hover:bg-red-50 group-hover:text-red-500">
        <Icon size={20} />
      </div>
    </div>

    <div className="mt-4 flex items-center gap-2">
      {trend ? (
        <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
          <TrendingUp size={10} /> {trend}
        </span>
      ) : null}
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  </div>
);

function formatSessionType(sessionName: string) {
  const upper = sessionName.toUpperCase();

  if (upper.includes('LE')) return 'Lecture';
  if (upper.includes('LA')) return 'Lab';
  if (upper.includes('TU')) return 'Tutorial';
  if (upper.includes('PR')) return 'Practical';

  return sessionName;
}

function formatDateLabel(value: string | Date) {
  return new Date(value).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(value: string | Date) {
  return new Date(value).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeClasses(status: string) {
  const upper = status.toUpperCase();

  if (upper === 'PRESENT' || upper === 'LATE' || upper === 'VERIFIED') {
    return 'bg-green-50 text-green-700 border-green-100';
  }

  if (upper === 'PENDING') {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }

  return 'bg-red-50 text-red-600 border-red-100';
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendanceItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveStudentSession>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');

        const [dashboardRes, todayRes, activeRes] = await Promise.all([
          fetch('/api/student/dashboard', { cache: 'no-store' }),
          fetch('/api/student/attendance?date=today', { cache: 'no-store' }),
          fetch('/api/attendance/active-session', { cache: 'no-store' }),
        ]);

        if (!dashboardRes.ok) {
          throw new Error('Failed to load student dashboard');
        }

        const dashboardData = (await dashboardRes.json()) as DashboardResponse;
        setDashboard(dashboardData);

        if (todayRes.ok) {
          const todayData = await todayRes.json();
          setTodayAttendance(todayData.attendance ?? []);
        } else {
          setTodayAttendance([]);
        }

        if (activeRes.ok) {
          const activeData = await activeRes.json();
          setActiveSession(activeData.session ?? null);
        } else {
          setActiveSession(null);
        }
      } catch (err) {
        console.error('Student dashboard load error:', err);
        setError('Unable to load your dashboard right now.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [session?.user?.id]);

  const firstName = useMemo(() => {
    return session?.user?.name?.split(' ')[0] ?? 'Student';
  }, [session?.user?.name]);

  const enrolledCourses = dashboard?.courses ?? [];
  const recentAttendance = dashboard?.recentAttendance ?? [];

  const presentToday = useMemo(
    () => todayAttendance.filter((item) => item.status === 'Present').length,
    [todayAttendance]
  );

  const absentToday = useMemo(
    () => todayAttendance.filter((item) => item.status === 'Absent').length,
    [todayAttendance]
  );

  const attendanceTrend = useMemo(() => {
    if (!dashboard?.stats?.overallPct) return undefined;
    if (dashboard.stats.overallPct >= 80) return 'On track';
    if (dashboard.stats.overallPct >= 60) return 'Stable';
    return undefined;
  }, [dashboard?.stats?.overallPct]);

  const topCourses = useMemo(() => {
    return enrolledCourses
      .map((course) => ({
        ...course,
        attendanceRate:
          course.totalSessions > 0
            ? Math.round((course.attendedSessions / course.totalSessions) * 100)
            : 0,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate);
  }, [enrolledCourses]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-100 border-t-red-600" />
          <LayoutDashboard
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300"
            size={24}
          />
        </div>
        <p className="animate-pulse text-sm font-medium text-gray-500">
          Preparing your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="cursor-default hover:text-gray-600">Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Dashboard</span>
      </nav>

      <header className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5 sm:space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 leading-tight">
            {greeting}, <span className="text-[#E4002B]">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            You are enrolled in{' '}
            <span className="font-bold text-gray-900">
              {dashboard?.stats.enrolledCourses ?? 0} unit
              {(dashboard?.stats.enrolledCourses ?? 0) === 1 ? '' : 's'}
            </span>
            . Review your attendance progress and open your QR when a class session is live.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E4002B] text-white">
              <UserCircle2 size={22} />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900">
                {session?.user?.name ?? 'Student'}
              </p>
              <p className="text-xs text-gray-500">
                {(dashboard?.profile.studentId ?? 'Not synced') +
                  (dashboard?.profile.programName
                    ? ` · ${dashboard.profile.programName}`
                    : '')}
              </p>
            </div>
          </div>

          <Link
            href="/student/attendance"
            className="group flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <CalendarDays size={16} />
            View Attendance
          </Link>
        </div>
      </header>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Dashboard unavailable</p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {/* Key Metrics */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enrolled Units"
          value={dashboard?.stats.enrolledCourses ?? 0}
          sub="Registered to your account"
          icon={BookOpen}
          color="text-gray-900"
        />

        <StatCard
          label="Overall Attendance"
          value={`${dashboard?.stats.overallPct ?? 0}%`}
          sub="Across all completed sessions"
          icon={BarChart3}
          color="text-red-600"
          trend={attendanceTrend}
        />

        <StatCard
          label="Present Today"
          value={presentToday}
          sub="Recorded for today's sessions"
          icon={CheckCircle2}
          color="text-emerald-600"
        />

        <StatCard
          label="Total Absences"
          value={dashboard?.stats.totalAbsent ?? 0}
          sub="From recorded past sessions"
          icon={XCircle}
          color="text-gray-900"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-2 text-red-600">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">My Units</h2>
              </div>

              <Link
                href="/student/classes"
                className="group flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700"
              >
                View All
                <ChevronRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {topCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-full bg-gray-50 p-4 text-gray-300">
                    <BookOpen size={32} />
                  </div>
                  <p className="text-sm font-medium text-gray-400">
                    No enrolled units found yet.
                  </p>
                </div>
              ) : (
                topCourses.map((course) => {
                  const attendanceRate = course.attendanceRate;

                  return (
                    <div
                      key={course.id}
                      className="group flex flex-col gap-6 p-6 transition-colors hover:bg-gray-50/50 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                            {course.code}
                          </span>

                          <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                            {course.totalSessions} Sessions
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-red-600">
                          {course.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {course.year ?? '—'} / Sem {course.semester ?? '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            {course.attendedSessions} attended
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 sm:justify-end">
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Attendance
                          </p>
                          <p
                            className={`mt-1 text-2xl font-black ${
                              attendanceRate >= 80
                                ? 'text-emerald-600'
                                : attendanceRate >= 60
                                ? 'text-amber-500'
                                : 'text-red-600'
                            }`}
                          >
                            {attendanceRate}%
                          </p>
                        </div>

                        <Link
                          href="/student/attendance"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                        >
                          Details <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <Calendar size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">
                  Recent Attendance
                </h2>
              </div>

              <button className="text-gray-400 transition-colors hover:text-gray-600">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {recentAttendance.length > 0 ? (
                recentAttendance.map((item) => (
                  <div
                    key={item.sessionId}
                    className="rounded-2xl border border-gray-50 p-5 transition-all hover:border-gray-100"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                            {item.courseCode}
                          </span>
                          <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                            {item.sessionName}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-gray-900">
                          {item.courseName}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {formatDateLabel(item.date)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock3 size={14} />
                            {item.checkInTime
                              ? formatTimeLabel(item.checkInTime)
                              : 'No check-in time'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ${getStatusBadgeClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">
                    No attendance history available yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Live Session */}
          <div
            className={`relative overflow-hidden rounded-2xl sm:rounded-[2rem] p-6 text-white shadow-xl transition-all ${
              activeSession
                ? 'bg-red-600 shadow-red-100'
                : 'bg-gray-900 shadow-gray-100'
            }`}
          >
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      activeSession ? 'animate-pulse bg-white' : 'bg-gray-500'
                    }`}
                  />
                  {activeSession ? 'Live Session' : 'No Active Session'}
                </span>
                <QrCode size={20} className="text-white/50" />
              </div>

              {activeSession ? (
                <>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tight">
                      {activeSession.unit.code}
                    </h3>
                    <p className="line-clamp-2 text-sm font-medium text-white/80">
                      {activeSession.unit.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white/60">
                        Session
                      </p>
                      <p className="text-xs font-bold">
                        {formatSessionType(activeSession.sessionName)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white/60">
                        Opens At
                      </p>
                      <p className="text-xs font-bold">
                        {formatTimeLabel(activeSession.sessionTime)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white/60">
                        Duration
                      </p>
                      <p className="text-xs font-bold">
                        {activeSession.sessionDuration} minutes
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/student/qrcode"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-red-600 transition hover:bg-white/90"
                  >
                    <QrCode size={18} /> Show My QR
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-white/70">
                    When your lecturer starts attendance, this card will show the active class
                    and let you open your QR immediately.
                  </p>

                  <Link
                    href="/student/qrcode"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    <QrCode size={18} /> Open QR Page
                  </Link>
                </>
              )}
            </div>

            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
          </div>

          {/* Today Snapshot */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-2 text-red-600">
                <Clock3 size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900">Today Snapshot</h2>
            </div>

            {todayAttendance.length > 0 ? (
              <div className="space-y-4">
                {todayAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-50 p-4 transition-all hover:border-gray-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                            {item.code}
                          </span>
                          <span className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                            {item.session}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {item.recordedAt
                            ? `Recorded at ${item.recordedAt}`
                            : 'Not checked in'}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No attendance records were found for today.
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <ScanLine size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900">Quick Actions</h2>
            </div>

            <div className="grid gap-3">
              <Link
                href="/student/qrcode"
                className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-all hover:border-gray-100 hover:bg-gray-50"
              >
                <div className="rounded-xl p-2.5 transition-transform group-hover:scale-110 text-red-600 bg-red-50">
                  <QrCode size={18} />
                </div>
                <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Open QR Code</span>
                <ChevronRight size={14} className="ml-auto text-gray-300 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/student/classes"
                className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-all hover:border-gray-100 hover:bg-gray-50"
              >
                <div className="rounded-xl p-2.5 transition-transform group-hover:scale-110 text-blue-600 bg-blue-50">
                  <BookOpen size={18} />
                </div>
                <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">View My Classes</span>
                <ChevronRight size={14} className="ml-auto text-gray-300 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/student/attendance"
                className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-all hover:border-gray-100 hover:bg-gray-50"
              >
                <div className="rounded-xl p-2.5 transition-transform group-hover:scale-110 text-amber-600 bg-amber-50">
                  <CalendarDays size={18} />
                </div>
                <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Review Attendance</span>
                <ChevronRight size={14} className="ml-auto text-gray-300 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/student/profile"
                className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-all hover:border-gray-100 hover:bg-gray-50"
              >
                <div className="rounded-xl p-2.5 transition-transform group-hover:scale-110 text-purple-600 bg-purple-50">
                  <UserCircle2 size={18} />
                </div>
                <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">My Profile</span>
                <ChevronRight size={14} className="ml-auto text-gray-300 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}