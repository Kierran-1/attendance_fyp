'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  PlayCircle,
  ScanLine,
  Upload,
  Users,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassData = {
  id: string;
  unitCode: string;
  unitName: string;
  day: string;
  time: string;
  location: string;
  lecturer?: string;
  classType?: string;
  group?: string;
  students: { id: string }[];
  sessions: {
    id: string;
    attendancePercentage: number;
    status: string;
    presentCount: number;
    absentCount: number;
  }[];
};

type ActiveSession = {
  id: string;
  unitId: string;
  unit: { code: string; name: string };
  classType: string;
  startTime: string;
  endTime: string;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLASS_TYPE_LABEL: Record<string, string> = {
  LE: 'Lecture',
  LA: 'Lab',
  TU: 'Tutorial',
  PR: 'Practical',
  LECTURE:   'Lecture',
  LAB:       'Lab',
  TUTORIAL:  'Tutorial',
  PRACTICAL: 'Practical',
};

function getSessionBadgeClasses(type: string) {
  const label = CLASS_TYPE_LABEL[type] ?? type;
  switch (label) {
    case 'Lecture':  return 'border-blue-100 bg-blue-50 text-blue-700';
    case 'Tutorial': return 'border-rose-100 bg-rose-50 text-[#E4002B]';
    case 'Lab':      return 'border-purple-100 bg-purple-50 text-purple-700';
    default:         return 'border-gray-100 bg-gray-50 text-gray-700';
  }
}

function getDayOrder(day: string): number {
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    .indexOf(day);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LecturerDashboardPage() {
  const [classes, setClasses]               = useState<ClassData[]>([]);
  const [activeSession, setActiveSession]   = useState<ActiveSession>(null);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [classRes, sessionRes] = await Promise.all([
          fetch('/api/lecturer/unit'),
          fetch('/api/attendance/active-session'),
        ]);

        if (classRes.ok) {
          const data: ClassData[] = await classRes.json();
          setClasses(data);
        }

        if (sessionRes.ok) {
          const data = await sessionRes.json();
          // lecturer endpoint returns { sessions: [...] }
          if (data.sessions?.length > 0) {
            setActiveSession(data.sessions[0]);
          } else {
            setActiveSession(null);
          }
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const todaysClasses = classes
    .filter(c => c.day === today)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const upcomingClasses = classes
    .filter(c => c.day !== today)
    .sort((a, b) => getDayOrder(a.day) - getDayOrder(b.day))
    .slice(0, 3);

  const totalStudents = new Set(
    classes.flatMap(c => c.students.map(s => s.id))
  ).size;

  // Average attendance across all completed sessions
  const allSessions = classes.flatMap(c => c.sessions);
  const avgAttendance = allSessions.length > 0
    ? Math.round(
        allSessions.reduce((sum, s) => sum + s.attendancePercentage, 0) /
        allSessions.length
      )
    : 0;

  // Today's total checked-in count
  const todayCheckedIn = todaysClasses.reduce((sum, c) => {
    const latestSession = c.sessions.at(-1);
    return sum + (latestSession?.presentCount ?? 0);
  }, 0);

  // Per-unit average for the bar chart (top 5)
  const unitStats = classes
    .map(c => {
      const avg = c.sessions.length > 0
        ? Math.round(c.sessions.reduce((s, sess) => s + sess.attendancePercentage, 0) / c.sessions.length)
        : 0;
      return { code: c.unitCode, avg };
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Live session details
  const liveCheckedIn  = 0; // real count needs AttendanceRecord query — placeholder
  const liveTotal      = activeSession
    ? (classes.find(c => c.id === activeSession.unitId)?.students.length ?? 0)
    : 0;
  const liveRate = liveTotal > 0 ? Math.round((liveCheckedIn / liveTotal) * 100) : 0;

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading dashboard…</span>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

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
            Monitor classes, attendance progress, and quick actions from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/live-attendance"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <PlayCircle size={16} /> Start Attendance
          </Link>
          <Link
            href="/lecturer/classes"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <Upload size={16} /> Upload Roster
          </Link>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Classes',
            value: classes.length,
            sub: 'Units under this lecturer',
            icon: BookOpen,
            color: 'text-gray-900',
          },
          {
            label: "Today's Classes",
            value: todaysClasses.length,
            sub: 'Scheduled for today',
            icon: CalendarDays,
            color: 'text-gray-900',
          },
          {
            label: 'Checked In Today',
            value: todayCheckedIn,
            sub: 'Students recorded today',
            icon: Users,
            color: 'text-green-600',
          },
          {
            label: 'Avg. Attendance Rate',
            value: `${avgAttendance}%`,
            sub: allSessions.length > 0 ? `Across ${allSessions.length} sessions` : 'No sessions yet',
            icon: BarChart3,
            color: 'text-[#E4002B]',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
              <Icon size={18} className="text-gray-300" />
            </div>
            <p className={`text-4xl font-black tracking-tight ${color}`}>{value}</p>
            <p className="mt-2 text-xs text-gray-500">{sub}</p>
          </div>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Today's classes */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Today's Classes</h2>
                <p className="mt-1 text-sm text-gray-500">{today} — {todaysClasses.length} class{todaysClasses.length !== 1 ? 'es' : ''} scheduled</p>
              </div>
              <Link href="/lecturer/classes" className="text-sm font-semibold text-[#E4002B] transition hover:text-[#C70026]">
                View All
              </Link>
            </div>

            {todaysClasses.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                No classes scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todaysClasses.map(cls => {
                  const typeLabel = CLASS_TYPE_LABEL[cls.classType ?? ''] ?? cls.classType ?? 'Class';
                  const latestSession = cls.sessions.at(-1);
                  return (
                    <div
                      key={cls.id}
                      className="flex flex-col gap-4 px-6 py-5 transition hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                            {cls.unitCode}
                          </span>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionBadgeClasses(cls.classType ?? '')}`}>
                            {typeLabel}{cls.group ? ` · Group ${cls.group}` : ''}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold uppercase leading-6 text-gray-900">{cls.unitName}</h3>
                        <p className="mt-1 text-sm text-gray-500">{cls.time}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {cls.location} · {cls.students.length} students
                          {latestSession && ` · ${latestSession.presentCount} present`}
                        </p>
                      </div>
                      <Link
                        href="/lecturer/classes"
                        className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        View Class <ChevronRight size={16} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance overview */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Attendance Overview</h2>
                <p className="mt-1 text-sm text-gray-500">Average attendance rate per unit</p>
              </div>
              <Clock3 size={18} className="text-gray-300" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Total Units</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">{classes.length}</p>
                <p className="mt-2 text-xs text-gray-500">Across all class groups</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Total Students</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">{totalStudents}</p>
                <p className="mt-2 text-xs text-gray-500">Unique enrollments</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Sessions Held</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-[#E4002B]">{allSessions.length}</p>
                <p className="mt-2 text-xs text-gray-500">Total recorded sessions</p>
              </div>
            </div>

            {unitStats.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100">
                <div className="bg-gray-50 px-5 py-4">
                  <p className="text-sm font-bold text-gray-900">Attendance Rate by Unit</p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  {unitStats.map(item => (
                    <div key={item.code}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-800">{item.code}</span>
                        <span className="font-bold text-[#E4002B]">
                          {item.avg > 0 ? `${item.avg}%` : 'No data'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#E4002B] transition-all duration-500"
                          style={{ width: `${item.avg}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
                No attendance data yet. Start a session to see stats here.
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">

          {/* Live session */}
          <div className="rounded-3xl bg-[#E4002B] p-6 text-white shadow-lg shadow-rose-100">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Live Session</p>
              <ScanLine size={18} className="text-white/80" />
            </div>

            {activeSession ? (
              <>
                <p className="text-lg font-black tracking-tight">{activeSession.unit.code}</p>
                <p className="mt-1 text-sm text-white/85">{activeSession.unit.name}</p>
                <div className="mt-5 space-y-2 text-sm text-white/85">
                  <p>{CLASS_TYPE_LABEL[activeSession.classType] ?? activeSession.classType}</p>
                  <p>Started {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>Ends {new Date(activeSession.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                {liveTotal > 0 && (
                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Checked In</span>
                      <span className="font-bold">{liveCheckedIn}/{liveTotal}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-white" style={{ width: `${liveRate}%` }} />
                    </div>
                    <p className="mt-3 text-xs text-white/75">Live attendance: {liveRate}%</p>
                  </div>
                )}

                <Link
                  href="/lecturer/live-attendance"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#E4002B] transition hover:bg-rose-50"
                >
                  <PlayCircle size={16} /> Open Live Attendance
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-black tracking-tight">No active session</p>
                <p className="mt-2 text-sm text-white/80">Start a new session to begin attendance scanning.</p>
                <Link
                  href="/lecturer/live-attendance"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#E4002B] transition hover:bg-rose-50"
                >
                  <PlayCircle size={16} /> Start Attendance
                </Link>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-500">Common lecturer tasks</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Start Attendance',     href: '/lecturer/live-attendance' },
                { label: 'Upload Student Roster', href: '/lecturer/classes' },
                { label: 'Manage Classes',        href: '/lecturer/classes' },
                { label: 'Open Reports',          href: '/lecturer/reports' },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:bg-rose-50 hover:text-[#E4002B]"
                >
                  <span>{label}</span>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming classes */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Upcoming Classes</h2>
            <p className="mt-1 text-sm text-gray-500">Next scheduled sessions</p>

            {upcomingClasses.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">No upcoming classes found.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {upcomingClasses.map(cls => (
                  <div key={cls.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                        {cls.unitCode}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionBadgeClasses(cls.classType ?? '')}`}>
                        {CLASS_TYPE_LABEL[cls.classType ?? ''] ?? cls.classType ?? 'Class'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{cls.unitName}</p>
                    <p className="mt-1 text-xs text-gray-500">{cls.day} · {cls.time}</p>
                    <p className="mt-1 text-xs text-gray-500">{cls.location} · {cls.students.length} students</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}