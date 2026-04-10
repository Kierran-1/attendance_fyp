'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  Send,
} from 'lucide-react';

type AlertType =
  | 'Attendance'
  | 'Reminder'
  | 'Schedule'
  | 'General'
  | 'Lecturer Message';

type AlertStatus = 'Unread' | 'Read';

type StudentAlert = {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  date: string;
  time: string;
  status: AlertStatus;
  unitCode?: string;
  unitName?: string;
  actionHref?: string;
  actionLabel?: string;
  source?: 'system' | 'lecturer';
};

type LecturerSentAlert = {
  id: string;
  title: string;
  message: string;
  level?: 'Critical' | 'Warning' | 'Info';
  type?: string;
  unitCode?: string;
  unitName?: string;
  time: string;
  date: string;
  actionLabel?: string;
  actionHref?: string;
  source?: 'system' | 'lecturer';
};

type StudentClass = {
  id: string;
  code: string;
  name: string;
  lecturer?: string | null;
  faculty?: string | null;
  day: string | null;
  time: string | null;
  venue?: string | null;
  location?: string | null;
  sessionType?: string | null;
  attendanceRate?: number | null;
};

type TodayAttendance = {
  id: string;
  code: string;
  session: string;
  status: 'Present' | 'Absent';
  recordedAt: string | null;
};

type ActiveSession = {
  id: string;
  unitId: string;
  unit: {
    code: string;
    name: string;
  };
  sessionName: string;
  sessionTime: string;
  sessionDuration: number;
} | null;

type ClassesApiResponse = {
  classes?: StudentClass[];
};

type AttendanceApiResponse = {
  attendance?: TodayAttendance[];
};

type ActiveSessionApiResponse = {
  session?: ActiveSession;
};

function formatNowDateTime() {
  const now = new Date();

  return {
    date: now.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: now.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function buildSystemAlerts(
  classes: StudentClass[],
  todayAttendance: TodayAttendance[],
  activeSession: ActiveSession
): StudentAlert[] {
  const alerts: StudentAlert[] = [];
  const stamp = formatNowDateTime();

  if (activeSession) {
    alerts.push({
      id: `sys-active-${activeSession.id}`,
      title: 'Attendance session is active',
      message: `Your lecturer has opened attendance for ${activeSession.unit.code}. Please open your QR code and complete attendance verification during class.`,
      type: 'Attendance',
      date: stamp.date,
      time: stamp.time,
      status: 'Unread',
      unitCode: activeSession.unit.code,
      unitName: activeSession.unit.name,
      actionHref: '/student/qrcode',
      actionLabel: 'Open My QR',
      source: 'system',
    });
  }

  const nextClass = classes.find((item) => item.day || item.time) ?? classes[0];
  if (nextClass) {
    alerts.push({
      id: `sys-next-${nextClass.id}`,
      title: 'Upcoming class reminder',
      message: `${nextClass.code} ${nextClass.name}${
        nextClass.day || nextClass.time
          ? ` is scheduled for ${nextClass.day ?? 'TBA'} at ${nextClass.time ?? 'TBA'}.`
          : ' is available in your class list.'
      }`,
      type: 'Reminder',
      date: stamp.date,
      time: stamp.time,
      status: 'Unread',
      unitCode: nextClass.code,
      unitName: nextClass.name,
      actionHref: '/student/classes',
      actionLabel: 'View Classes',
      source: 'system',
    });
  }

  const presentToday = todayAttendance.find((item) => item.status === 'Present');
  if (presentToday) {
    alerts.push({
      id: `sys-attended-${presentToday.id}`,
      title: 'Attendance recorded',
      message: `Your attendance for ${presentToday.code} (${presentToday.session}) has been recorded successfully.`,
      type: 'Attendance',
      date: stamp.date,
      time: presentToday.recordedAt ?? stamp.time,
      status: 'Read',
      unitCode: presentToday.code,
      actionHref: '/student/attendance',
      actionLabel: 'View Attendance',
      source: 'system',
    });
  }

  const absentToday = todayAttendance.find((item) => item.status === 'Absent');
  if (absentToday) {
    alerts.push({
      id: `sys-absent-${absentToday.id}`,
      title: 'Attendance missing',
      message: `No valid attendance check-in was found yet for ${absentToday.code} (${absentToday.session}).`,
      type: 'Schedule',
      date: stamp.date,
      time: stamp.time,
      status: 'Unread',
      unitCode: absentToday.code,
      actionHref: '/student/qrcode',
      actionLabel: 'Open QR Page',
      source: 'system',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'sys-empty',
      title: 'No alerts at the moment',
      message:
        'You have no active attendance session, class reminder, or attendance update right now.',
      type: 'General',
      date: stamp.date,
      time: stamp.time,
      status: 'Read',
      source: 'system',
    });
  }

  return alerts;
}

function getTypeClasses(type: AlertType) {
  switch (type) {
    case 'Attendance':
      return 'border-rose-100 bg-rose-50 text-[#E4002B]';
    case 'Reminder':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'Schedule':
      return 'border-blue-100 bg-blue-50 text-blue-700';
    case 'Lecturer Message':
      return 'border-purple-100 bg-purple-50 text-purple-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

function getStatusClasses(status: AlertStatus) {
  return status === 'Unread'
    ? 'border-[#E4002B]/10 bg-[#E4002B]/10 text-[#E4002B]'
    : 'border-green-100 bg-green-50 text-green-700';
}

export default function StudentAlertsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | AlertType>('All');
  const [lecturerAlerts, setLecturerAlerts] = useState<StudentAlert[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<StudentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        setError('');

        const saved = localStorage.getItem('lecturerSentAlerts');
        let mappedLecturerAlerts: StudentAlert[] = [];

        if (saved) {
          try {
            const parsed: LecturerSentAlert[] = JSON.parse(saved);

            if (Array.isArray(parsed)) {
              mappedLecturerAlerts = parsed.map((item) => ({
                id: `student-copy-${item.id}`,
                title: item.title,
                message: item.message,
                type: 'Lecturer Message',
                date: item.date,
                time: item.time,
                status: 'Unread',
                unitCode: item.unitCode,
                unitName: item.unitName,
                actionHref: item.actionHref || '/student/alerts',
                actionLabel: item.actionLabel || 'View Alert',
                source: 'lecturer',
              }));
            }
          } catch (parseError) {
            console.error('Failed to parse lecturerSentAlerts:', parseError);
          }
        }

        setLecturerAlerts(mappedLecturerAlerts);

        const [classesRes, attendanceRes, activeRes] = await Promise.all([
          fetch('/api/student/classes', { cache: 'no-store' }),
          fetch('/api/student/attendance?date=today', { cache: 'no-store' }),
          fetch('/api/attendance/active-session', { cache: 'no-store' }),
        ]);

        const classesJson: ClassesApiResponse = classesRes.ok
          ? await classesRes.json()
          : { classes: [] };

        const attendanceJson: AttendanceApiResponse = attendanceRes.ok
          ? await attendanceRes.json()
          : { attendance: [] };

        const activeJson: ActiveSessionApiResponse = activeRes.ok
          ? await activeRes.json()
          : { session: null };

        setSystemAlerts(
          buildSystemAlerts(
            Array.isArray(classesJson.classes) ? classesJson.classes : [],
            Array.isArray(attendanceJson.attendance) ? attendanceJson.attendance : [],
            activeJson.session ?? null
          )
        );
      } catch (err) {
        console.error('Failed to load student alerts:', err);
        setError('Unable to load alerts right now.');
        setSystemAlerts(buildSystemAlerts([], [], null));
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  const allAlerts = useMemo(() => {
    return [...lecturerAlerts, ...systemAlerts].sort((a, b) => {
      const aDate = new Date(`${a.date} ${a.time}`).getTime();
      const bDate = new Date(`${b.date} ${b.time}`).getTime();

      if (Number.isNaN(aDate) || Number.isNaN(bDate)) return 0;
      return bDate - aDate;
    });
  }, [lecturerAlerts, systemAlerts]);

  const filteredAlerts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return allAlerts.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.message.toLowerCase().includes(keyword) ||
        item.date.toLowerCase().includes(keyword) ||
        (item.unitCode || '').toLowerCase().includes(keyword) ||
        (item.unitName || '').toLowerCase().includes(keyword);

      const matchesType = typeFilter === 'All' ? true : item.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [allAlerts, searchTerm, typeFilter]);

  const unreadCount = allAlerts.filter((item) => item.status === 'Unread').length;
  const readCount = allAlerts.filter((item) => item.status === 'Read').length;
  const attendanceAlerts = allAlerts.filter(
    (item) => item.type === 'Attendance'
  ).length;
  const lecturerMessageCount = allAlerts.filter(
    (item) => item.type === 'Lecturer Message'
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Alerts</span>
      </nav>

      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Student <span className="text-red-600">Alerts</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            View attendance updates, reminders, system notices, and lecturer-sent
            messages that are relevant to your classes.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Alerts
            </p>
            <Bell size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : allAlerts.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">All current student notices</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Unread
            </p>
            <AlertCircle size={18} className="text-[#E4002B]" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {loading ? '—' : unreadCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Need student attention</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Read
            </p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {loading ? '—' : readCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Reviewed notifications</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Attendance Alerts
            </p>
            <CalendarClock size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : attendanceAlerts}
          </p>
          <p className="mt-2 text-xs text-gray-500">Attendance-related notices</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Lecturer Messages
            </p>
            <Send size={18} className="text-purple-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-purple-600">
            {loading ? '—' : lecturerMessageCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Messages forwarded from lecturer panel</p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_220px]">
          <div>
            <label
              htmlFor="alert-search"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Search alerts
            </label>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="alert-search"
                type="text"
                placeholder="Search by title, message, unit, or date"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="alert-type"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Filter by type
            </label>

            <div className="relative">
              <Filter
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                id="alert-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'All' | AlertType)}
                className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              >
                <option value="All">All</option>
                <option value="Attendance">Attendance</option>
                <option value="Reminder">Reminder</option>
                <option value="Schedule">Schedule</option>
                <option value="General">General</option>
                <option value="Lecturer Message">Lecturer Message</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-gray-100 bg-white px-6 py-16 text-sm text-gray-500 shadow-sm">
            <Loader2 size={18} className="animate-spin text-red-600" />
            Loading alerts...
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getTypeClasses(
                        item.type
                      )}`}
                    >
                      {item.type}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>

                    {item.source === 'lecturer' ? (
                      <span className="inline-flex rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                        Sent by Lecturer
                      </span>
                    ) : null}

                    <span className="text-xs text-gray-400">
                      {item.date} · {item.time}
                    </span>
                  </div>

                  <h2 className="text-xl font-black tracking-tight text-gray-900">
                    {item.title}
                  </h2>

                  {item.unitCode || item.unitName ? (
                    <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                      {item.unitCode ? item.unitCode : ''}
                      {item.unitName ? ` · ${item.unitName}` : ''}
                    </p>
                  ) : null}

                  <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                    {item.message}
                  </p>
                </div>

                <div className="w-full xl:w-[240px]">
                  <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      Quick Action
                    </p>

                    {item.actionHref && item.actionLabel ? (
                      <Link
                        href={item.actionHref}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
                      >
                        {item.actionLabel}
                        <ChevronRight size={16} />
                      </Link>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-400">
                        No action required
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[2rem] border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-base font-bold text-gray-700">No alerts found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try changing the search or filter settings.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}