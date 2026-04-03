'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  QrCode,
  ScanLine,
  UserCircle2,
  XCircle,
} from 'lucide-react';

type AttendanceStatus = 'Present' | 'Absent';

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

type TodayAttendanceItem = {
  id: string;
  code: string;
  session: string;
  status: AttendanceStatus;
  recordedAt: string | null;
};

type ActiveSession = {
  id: string;
  courseId: string;
  course: {
    code: string;
    name: string;
    venue: string;
  };
  sessionType: string;
  startTime: string;
  endTime: string;
} | null;

function getStatusBadgeClasses(status: AttendanceStatus) {
  if (status === 'Present') {
    return 'border-green-100 bg-green-50 text-green-700';
  }

  return 'border-red-100 bg-red-50 text-red-600';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSessionType(raw: string) {
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();

  const [studentId, setStudentId] = useState('');
  const [studentProgram, setStudentProgram] = useState('');
  const [upcomingClasses, setUpcomingClasses] = useState<StudentClass[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendanceItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /*Load all dashboard data from existing API routes*/
  useEffect(() => {
    if (session?.user?.id) {
      loadAllData();
    }
  }, [session?.user?.id]);

  async function loadAllData() {
    try {
      setLoading(true);
      setError('');

      const [profileRes, classesRes, attendanceRes, activeSessionRes] =
        await Promise.all([
          fetch('/api/student/profile?basic=1', { cache: 'no-store' }),
          fetch('/api/student/classes', { cache: 'no-store' }),
          fetch('/api/student/attendance?date=today', { cache: 'no-store' }),
          fetch('/api/attendance/active-session', { cache: 'no-store' }),
        ]);

      /* ---------------- Profile ---------------- */
      if (profileRes.ok) {
        const profileData = await profileRes.json();

        setStudentId(profileData.studentId || '');
        setStudentProgram(profileData.program || '');
      } else {
        console.warn('Profile API failed:', profileRes.status);
      }

      /* ---------------- Classes ---------------- */
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setUpcomingClasses(classesData.classes || []);
      } else {
        console.warn('Classes API failed:', classesRes.status);
        setUpcomingClasses([]);
      }

      /* ---------------- Attendance ---------------- */
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        setTodayAttendance(attendanceData.attendance || []);
      } else {
        console.warn('Attendance API failed:', attendanceRes.status);
        setTodayAttendance([]);
      }

      /* ---------------- Active Session ---------------- */
      if (activeSessionRes.ok) {
        const sessionData = await activeSessionRes.json();
        setActiveSession(sessionData.session || null);
      } else {
        console.warn('Active session API failed:', activeSessionRes.status);
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load dashboard data right now.');
    } finally {
      setLoading(false);
    }
  }

  const firstName = useMemo(() => {
    return session?.user?.name?.split(' ')[0] ?? 'Student';
  }, [session?.user?.name]);

  const presentCount = todayAttendance.filter(
    (item) => item.status === 'Present'
  ).length;

  const absentCount = todayAttendance.filter(
    (item) => item.status === 'Absent'
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
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View your classes, attendance status, and active session from one place.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E4002B] text-white">
            <UserCircle2 size={22} />
          </div>

          <div>
            <p className="text-sm font-bold text-gray-900">
              {session?.user?.name ?? 'Student'}
            </p>
            <p className="text-xs text-gray-500">
              {studentId || 'Loading...'} · {studentProgram || 'Program not synced yet'}
            </p>
          </div>
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
              Enrolled Units
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : upcomingClasses.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">Loaded from database</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Active Session
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-[#E4002B]">
            {loading ? '—' : activeSession ? activeSession.course.code : 'None'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Live attendance status</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Present Today
            </p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {loading ? '—' : presentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Recorded successfully</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Absent Today
            </p>
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : absentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Based on today records</p>
        </div>
      </section>

      {/*Main Dashboard Grid*/}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* ---------------- Left column ---------------- */}
        <div className="space-y-6">
          {/* Upcoming classes */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  My Classes
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Units currently linked to your student account
                </p>
              </div>

              <Link
                href="/student/classes"
                className="text-sm font-semibold text-[#E4002B] transition hover:text-[#C70026]"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-6 py-8 text-sm text-gray-500">
                  Loading classes...
                </div>
              ) : upcomingClasses.length > 0 ? (
                upcomingClasses.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                          {item.code}
                        </span>

                        {item.sessionType && (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                            {item.sessionType}
                          </span>
                        )}
                      </div>

                      <h3 className="truncate text-base font-bold text-gray-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.day} · {item.time} · {item.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                          Attendance
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-900">
                          {item.attendanceRate ?? 0}%
                        </p>
                      </div>

                      <Link
                        href="/student/attendance"
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        Details
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-sm text-gray-500">
                  No classes found yet.
                </div>
              )}
            </div>
          </div>

          {/* Today attendance */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Today&apos;s Attendance
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Latest attendance captured for today
                </p>
              </div>

              <Link
                href="/student/attendance"
                className="text-sm font-semibold text-[#E4002B] transition hover:text-[#C70026]"
              >
                Full History
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-6 py-8 text-sm text-gray-500">
                  Loading attendance...
                </div>
              ) : todayAttendance.length > 0 ? (
                todayAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                          {item.code}
                        </span>

                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                          {item.session}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500">
                        {item.recordedAt
                          ? `Checked in at ${item.recordedAt}`
                          : 'No check-in time recorded'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-bold sm:self-center ${getStatusBadgeClasses(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-sm text-gray-500">
                  No attendance records for today.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- Right column ---------------- */}
        <div className="space-y-6">
          {/* Active session card */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                  Live Attendance
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                  {activeSession ? activeSession.course.code : 'No active session'}
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  {activeSession
                    ? 'A lecturer has started an attendance session. Open your QR code now.'
                    : 'There is currently no live attendance session for your enrolled classes.'}
                </p>
              </div>

              <div className="rounded-full bg-rose-50 p-3 text-[#E4002B]">
                <QrCode size={22} />
              </div>
            </div>

            {activeSession ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Class
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {activeSession.course.name}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Session Type
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatSessionType(activeSession.sessionType)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Venue
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {activeSession.course.venue || 'Venue not set'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Start
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatTime(activeSession.startTime)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      End
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatTime(activeSession.endTime)}
                    </p>
                  </div>
                </div>

                <Link
                  href="/student/qrcode"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
                >
                  <QrCode size={16} />
                  Open My QR Code
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                Once a lecturer starts a session, this panel will update automatically
                after refresh.
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Jump to the key student attendance pages
            </p>

            <div className="mt-5 grid gap-3">
              <Link
                href="/student/qrcode"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span className="flex items-center gap-2">
                  <QrCode size={16} />
                  Open QR Code
                </span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/student/classes"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  View My Classes
                </span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/student/attendance"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span className="flex items-center gap-2">
                  <ScanLine size={16} />
                  Review Attendance
                </span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/student/profile"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  My Profile
                </span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}