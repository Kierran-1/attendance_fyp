'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
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
  ArrowUpRight,
  MoreHorizontal,
  LayoutDashboard,
  Calendar,
  MapPin,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
  LECTURE: 'Lecture',
  LAB: 'Lab',
  TUTORIAL: 'Tutorial',
  PRACTICAL: 'Practical',
};

function getSessionBadgeClasses(type: string) {
  const label = CLASS_TYPE_LABEL[type] ?? type;
  switch (label) {
    case 'Lecture': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'Tutorial': return 'bg-rose-50 text-[#E4002B] border-rose-100';
    case 'Lab': return 'bg-purple-50 text-purple-700 border-purple-100';
    default: return 'bg-gray-50 text-gray-700 border-gray-100';
  }
}

function getDayOrder(day: string): number {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.indexOf(day);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon: Icon, color, trend }: any) => (
  <div className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-red-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <h3 className={`mt-2 text-3xl font-black tracking-tight ${color}`}>{value}</h3>
      </div>
      <div className="rounded-2xl bg-gray-50 p-3 text-gray-400 transition-colors group-hover:bg-red-50 group-hover:text-red-500">
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      {trend && (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
          <TrendingUp size={10} /> {trend}
        </span>
      )}
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LecturerDashboardPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

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

  // ── Derived state ────────────────────────────────────────────────────────────

  // AFTER
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Tuesday"

  // Normalize stored day abbreviations ("Tue") to full names ("Tuesday")
  const DAY_EXPAND: Record<string, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
    Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
  };
  const normalizeDay = (d: string) => DAY_EXPAND[d] ?? d;

  const todaysClasses = useMemo(() =>
    classes
      .filter(c => normalizeDay(c.day) === today)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [classes, today]
  );

  const upcomingClasses = useMemo(() =>
    classes
      .filter(c => normalizeDay(c.day) !== today)
      .sort((a, b) => getDayOrder(normalizeDay(a.day)) - getDayOrder(normalizeDay(b.day)))
      .slice(0, 3),
    [classes, today]
  );

  const totalStudents = useMemo(() =>
    new Set(classes.flatMap(c => c.students.map(s => s.id))).size,
    [classes]
  );

  const allSessions = useMemo(() => classes.flatMap(c => c.sessions), [classes]);

  const avgAttendance = useMemo(() =>
    allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.attendancePercentage, 0) / allSessions.length)
      : 0,
    [allSessions]
  );

  const todayCheckedIn = useMemo(() =>
    todaysClasses.reduce((sum, c) => {
      const latestSession = c.sessions.at(-1);
      return sum + (latestSession?.presentCount ?? 0);
    }, 0),
    [todaysClasses]
  );

  // Group classes by unit code for the attendance trends section
  const groupedUnitStats = useMemo(() => {
    const groups: Record<string, { code: string; name: string; avg: number; classes: any[] }> = {};

    classes.forEach(c => {
      if (!groups[c.unitCode]) {
        groups[c.unitCode] = { code: c.unitCode, name: c.unitName, avg: 0, classes: [] };
      }

      const classAvg = c.sessions.length > 0
        ? Math.round(c.sessions.reduce((s, sess) => s + sess.attendancePercentage, 0) / c.sessions.length)
        : 0;

      groups[c.unitCode].classes.push({
        id: c.id,
        type: c.classType,
        group: c.group,
        avg: classAvg
      });
    });

    // Calculate overall unit average
    return Object.values(groups).map(unit => {
      const totalAvg = unit.classes.reduce((sum, cls) => sum + cls.avg, 0);
      unit.avg = unit.classes.length > 0 ? Math.round(totalAvg / unit.classes.length) : 0;
      return unit;
    }).sort((a, b) => b.avg - a.avg);
  }, [classes]);

  const liveTotal = useMemo(() =>
    activeSession ? (classes.find(c => c.id === activeSession.unitId)?.students.length ?? 0) : 0,
    [activeSession, classes]
  );

  const toggleUnitExpand = (unitCode: string) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitCode]: !prev[unitCode]
    }));
  };

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-gray-100 border-t-red-600 animate-spin" />
        <LayoutDashboard className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300" size={24} />
      </div>
      <p className="text-sm font-medium text-gray-500 animate-pulse">Preparing your dashboard...</p>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">

      {/* Top Navigation / Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="hover:text-gray-600 cursor-default">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Dashboard</span>
      </nav>

      {/* Welcome Header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            {greeting}, <span className="text-red-600">Lecturer</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            Welcome back. You have <span className="font-bold text-gray-900">{todaysClasses.length} classes</span> scheduled for today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/lecturer/classes"
            className="group flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-red-100 hover:text-red-600"
          >
            <Upload size={18} className="transition-transform group-hover:-translate-y-0.5" />
            Upload Roster
          </Link>
          <Link
            href="/lecturer/live-attendance"
            className="group flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700 hover:shadow-red-200 active:scale-95"
          >
            <PlayCircle size={18} className="transition-transform group-hover:scale-110" />
            Start Attendance
          </Link>
        </div>
      </header>

      {/* Key Metrics */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Classes"
          value={classes.length}
          sub="Active units"
          icon={BookOpen}
          color="text-gray-900"
        />
        <StatCard
          label="Today's Schedule"
          value={todaysClasses.length}
          sub={today}
          icon={CalendarDays}
          color="text-gray-900"
        />
        <StatCard
          label="Checked In Today"
          value={todayCheckedIn}
          sub="Total student records"
          icon={Users}
          color="text-emerald-600"
          trend="+12%"
        />
        <StatCard
          label="Avg. Attendance"
          value={`${avgAttendance}%`}
          sub={`Across ${allSessions.length} sessions`}
          icon={BarChart3}
          color="text-red-600"
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">

        {/* Main Content Area (Left 2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Today's Classes List */}
          <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-50 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-2 text-red-600">
                  <Calendar size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">Today's Schedule</h2>
              </div>
              <Link href="/lecturer/classes" className="group flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700">
                View All <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {todaysClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-full bg-gray-50 p-4 text-gray-300">
                    <Calendar size={32} />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No classes scheduled for today.</p>
                  <Link href="/lecturer/classes" className="mt-4 text-xs font-bold text-red-600 hover:underline">Check full schedule</Link>
                </div>
              ) : (
                todaysClasses.map(cls => (
                  <div key={cls.id} className="group flex flex-col gap-6 p-8 transition-colors hover:bg-gray-50/50 sm:flex-row sm:items-center">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black text-white uppercase tracking-wider">
                          {cls.unitCode}
                        </span>
                        <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getSessionBadgeClasses(cls.classType ?? '')}`}>
                          {CLASS_TYPE_LABEL[cls.classType ?? ''] ?? cls.classType}{cls.group ? ` · GRP ${cls.group}` : ''}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors">{cls.unitName}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1.5"><Clock3 size={14} /> {cls.time}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} /> {cls.location}</span>
                        <span className="flex items-center gap-1.5"><Users size={14} /> {cls.students.length} Students</span>
                      </div>
                    </div>
                    <Link
                      href="/lecturer/classes"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold text-white transition-all hover:bg-red-600 hover:text-white group-hover:shadow-md"
                    >
                      Manage Class <ArrowUpRight size={14} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attendance Trends (Grouped by Unit) */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <BarChart3 size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">Attendance Trends</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {groupedUnitStats.length > 0 ? (
                groupedUnitStats.map(unit => (
                  <div key={unit.code} className="overflow-hidden rounded-2xl border border-gray-50 transition-all hover:border-gray-100">
                    {/* Unit Header (Clickable) */}
                    <button
                      onClick={() => toggleUnitExpand(unit.code)}
                      className="flex w-full items-center justify-between bg-gray-50/50 p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-gray-900">{unit.code}</span>
                        <span className="text-xs font-medium text-gray-400 line-clamp-1">{unit.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${unit.avg >= 80 ? 'text-emerald-600' : unit.avg >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
                            {unit.avg}%
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${unit.avg >= 80 ? 'bg-emerald-500' : unit.avg >= 60 ? 'bg-amber-400' : 'bg-red-500'
                                }`}
                              style={{ width: `${unit.avg}%` }}
                            />
                          </div>
                        </div>
                        {expandedUnits[unit.code] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </button>

                    {/* Collapsible Class List */}
                    {expandedUnits[unit.code] && (
                      <div className="divide-y divide-gray-50 bg-white px-4 py-2">
                        {unit.classes.map(cls => (
                          <div key={cls.id} className="flex items-center justify-between py-3 pl-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {CLASS_TYPE_LABEL[cls.type ?? ''] ?? cls.type}{cls.group ? ` · GRP ${cls.group}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold ${cls.avg >= 80 ? 'text-emerald-600' : cls.avg >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
                                {cls.avg}%
                              </span>
                              <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full rounded-full ${cls.avg >= 80 ? 'bg-emerald-500' : cls.avg >= 60 ? 'bg-amber-400' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${cls.avg}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No attendance data available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar (Right 1/3) */}
        <div className="space-y-8">

          {/* Live Session Status */}
          <div className={`relative overflow-hidden rounded-[2rem] p-8 text-white shadow-xl transition-all ${activeSession ? 'bg-red-600 shadow-red-100' : 'bg-gray-900 shadow-gray-100'}`}>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                  <span className={`h-2 w-2 rounded-full ${activeSession ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                  {activeSession ? 'Live Session' : 'No Active Session'}
                </span>
                <ScanLine size={20} className="text-white/50" />
              </div>

              {activeSession ? (
                <>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tight">{activeSession.unit.code}</h3>
                    <p className="text-sm font-medium text-white/80 line-clamp-1">{activeSession.unit.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white/60">Type</p>
                      <p className="text-xs font-bold">{CLASS_TYPE_LABEL[activeSession.classType] ?? activeSession.classType}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white/60">Students</p>
                      <p className="text-xs font-bold">{liveTotal} Enrolled</p>
                    </div>
                  </div>

                  <Link
                    href="/lecturer/live-attendance"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-red-600 transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <PlayCircle size={18} /> Open Session
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-white/70">
                    Ready to start? Launch a new attendance session for your current class.
                  </p>
                  <Link
                    href="/lecturer/live-attendance"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/20 active:scale-95"
                  >
                    <PlayCircle size={18} /> Start New Session
                  </Link>
                </>
              )}
            </div>

            {/* Decorative Background Element */}
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
          </div>

          {/* Quick Actions */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid gap-3">
              {[
                { label: 'Class Rosters', icon: Users, href: '/lecturer/classes', color: 'text-blue-600 bg-blue-50' },
                { label: 'Live Attendance', icon: ScanLine, href: '/lecturer/live-attendance', color: 'text-red-600 bg-red-50' },
                { label: 'Unit Reports', icon: BarChart3, href: '/lecturer/reports', color: 'text-amber-600 bg-amber-50' },
                { label: 'Upload Data', icon: Upload, href: '/lecturer/classes', color: 'text-purple-600 bg-purple-50' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-all hover:border-gray-100 hover:bg-gray-50"
                >
                  <div className={`rounded-xl p-2.5 transition-transform group-hover:scale-110 ${action.color}`}>
                    <action.icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{action.label}</span>
                  <ChevronRight size={14} className="ml-auto text-gray-300 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Classes */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-6">Upcoming</h2>
            {upcomingClasses.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <AlertCircle size={24} className="text-gray-200 mb-2" />
                <p className="text-xs text-gray-400 font-medium">No upcoming classes found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingClasses.map(cls => (
                  <div key={cls.id} className="relative pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full before:bg-gray-100 hover:before:bg-red-500 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">{cls.unitCode}</span>
                      <span className="text-[10px] font-bold text-gray-400">{cls.day}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{cls.unitName}</p>
                    <p className="mt-1 text-[10px] font-medium text-gray-400">{cls.time} · {cls.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
