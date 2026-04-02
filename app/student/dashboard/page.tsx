'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
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

/* Student Dashboard Page */

type AttendanceStatus = 'Present' | 'Absent';

type StudentClass = {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  day: string;
  time: string;
  location: string;
};

type TodayAttendanceItem = {
  id: string;
  code: string;
  session: string;
  status: AttendanceStatus;
  recordedAt: string | null;
};

function getStatusBadgeClasses(status: AttendanceStatus) {
  if (status === 'Present') {
    return 'bg-green-50 text-green-700 border-green-100';
  }

  return 'bg-red-50 text-red-600 border-red-100';
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [studentId, setStudentId] = useState('');
  const [studentProgram, setStudentProgram] = useState('');
  const [upcomingClasses, setUpcomingClasses] = useState<StudentClass[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch student ID and profile
  useEffect(() => {
    if (session?.user?.id) {
      loadAllData();
    }
  }, [session?.user?.id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [profileRes, classesRes, attendanceRes] = await Promise.all([
        fetch('/api/student/profile?basic=1', { cache: 'no-store' }),
        fetch('/api/student/classes', { cache: 'no-store' }),
        fetch('/api/student/attendance?date=today', { cache: 'no-store' }),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setStudentId(profileData.studentId || '');
        setStudentProgram(profileData.program || '');
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setUpcomingClasses(classesData.classes || []);
      }

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        setTodayAttendance(attendanceData.attendance || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Student';

  const presentCount = todayAttendance.filter(
    (item) => item.status === 'Present'
  ).length;

  const absentCount = todayAttendance.filter(
    (item) => item.status === 'Absent'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View your upcoming classes, attendance status, and quick access to
            your QR code.
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
              {studentId || 'Loading...'} · {studentProgram}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Synced from Microsoft Authenticator
            </p>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Enrolled Units
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {upcomingClasses.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">Maximum 4 units shown</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Upcoming Classes
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {upcomingClasses.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">This week</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Present Today
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
              Absent Today
            </p>
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {absentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Based on current records</p>
        </div>
      </section>

      {/* Main dashboard grid */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Upcoming classes */}
        <div className="xl:col-span-2 rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Upcoming Classes
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Your enrolled units and scheduled sessions
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
            {upcomingClasses.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                      {item.code}
                    </span>
                    <span className="text-xs text-gray-400">{item.day}</span>
                  </div>

                  <h3 className="text-sm font-bold uppercase leading-6 text-gray-900">
                    {item.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Lecturer: {item.lecturer}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.time} · {item.location}
                  </p>
                </div>

                <Link
                  href="/student/classes"
                  className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                >
                  View Class
                  <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Active session */}
          <div className="rounded-3xl bg-[#E4002B] p-6 text-white shadow-lg shadow-rose-100">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                Active Attendance Session
              </p>
              <ScanLine size={18} className="text-white/80" />
            </div>

            {todayAttendance.length > 0 ? (
              <>
                <p className="text-lg font-black tracking-tight">
                  {todayAttendance[0]?.code || 'Session Active'}
                </p>
                <p className="mt-1 text-sm text-white/85">
                  Attendance session in progress
                </p>
                <p className="mt-4 text-sm font-semibold">
                  {todayAttendance[0]?.session || 'Lecture'}
                </p>
                <p className="mt-1 text-sm text-white/75">
                  Open now to mark attendance
                </p>

                <Link
                  href="/student/qrcode"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#E4002B] transition hover:bg-rose-50"
                >
                  <QrCode size={18} />
                  Open My QR Code
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-black tracking-tight">
                  No session active
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Your lecturer has not started an attendance session yet.
                </p>
              </>
            )}
          </div>

          {/* Today's status */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Today&apos;s Attendance Status
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Present or absent for today&apos;s sessions
                </p>
              </div>
              <Clock3 size={18} className="text-gray-300" />
            </div>

            <div className="space-y-3">
              {todayAttendance.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {item.code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.session}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClasses(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    {item.recordedAt
                      ? `Recorded at ${item.recordedAt}`
                      : 'No attendance recorded'}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/student/attendance"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#E4002B] transition hover:text-[#C70026]"
            >
              View Attendance History
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Shortcuts for common student tasks
            </p>

            <div className="mt-4 space-y-3">
              <Link
                href="/student/qrcode"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>Generate QR Code</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/student/classes"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>View My Classes</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/student/profile"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
              >
                <span>View Profile</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}