'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Filter,
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
  level: 'Critical' | 'Warning' | 'Info';
  type: string;
  unitCode?: string;
  unitName?: string;
  time: string;
  date: string;
  actionLabel?: string;
  actionHref?: string;
  source?: 'system' | 'lecturer';
};

const systemStudentAlerts: StudentAlert[] = [
  {
    id: 'alt-1',
    title: 'Attendance session is active',
    message:
      'Your lecturer has opened the attendance session for COS40005. Please show your QR code during class.',
    type: 'Attendance',
    date: '26 Mar 2026',
    time: '9:02 AM',
    status: 'Unread',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    actionHref: '/student/qrcode',
    actionLabel: 'Open My QR',
    source: 'system',
  },
  {
    id: 'alt-2',
    title: 'Upcoming class reminder',
    message:
      'SWE30003 Software Architecture and Design starts later today. Check your class details before the session.',
    type: 'Reminder',
    date: '26 Mar 2026',
    time: '8:15 AM',
    status: 'Unread',
    unitCode: 'SWE30003',
    unitName: 'Software Architecture and Design',
    actionHref: '/student/classes',
    actionLabel: 'View Classes',
    source: 'system',
  },
  {
    id: 'alt-3',
    title: 'Attendance record updated',
    message:
      'Your attendance for COS30015 IT Security has been recorded successfully.',
    type: 'Attendance',
    date: '25 Mar 2026',
    time: '4:08 PM',
    status: 'Read',
    unitCode: 'COS30015',
    unitName: 'IT Security',
    actionHref: '/student/attendance',
    actionLabel: 'View Attendance',
    source: 'system',
  },
  {
    id: 'alt-4',
    title: 'Venue update',
    message:
      'The next COS30049 session will be held in B203. Please check your class page for the latest schedule information.',
    type: 'Schedule',
    date: '25 Mar 2026',
    time: '1:10 PM',
    status: 'Read',
    unitCode: 'COS30049',
    unitName: 'Computing Technology Innovation Project',
    actionHref: '/student/classes',
    actionLabel: 'Open Class Page',
    source: 'system',
  },
  {
    id: 'alt-5',
    title: 'System notice',
    message:
      'AttendSync student pages are available across supported browser devices for your convenience.',
    type: 'General',
    date: '24 Mar 2026',
    time: '10:30 AM',
    status: 'Read',
    source: 'system',
  },
];

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lecturerSentAlerts');
      if (!saved) return;

      const parsed: LecturerSentAlert[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;

      const mappedAlerts: StudentAlert[] = parsed.map((item) => ({
        id: `student-copy-${item.id}`,
        title: item.title,
        message: item.message,
        type: 'Lecturer Message',
        date: item.date,
        time: item.time,
        status: 'Unread',
        unitCode: item.unitCode,
        unitName: item.unitName,
        actionHref: '/student/alerts',
        actionLabel: 'View Alert',
        source: 'lecturer',
      }));

      setLecturerAlerts(mappedAlerts);
    } catch (error) {
      console.error('Failed to load lecturer alerts for student page:', error);
    }
  }, []);

  const allAlerts = useMemo(() => {
    return [...lecturerAlerts, ...systemStudentAlerts];
  }, [lecturerAlerts]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.unitCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.unitName || '').toLowerCase().includes(searchTerm.toLowerCase());

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
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Alerts
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View reminders, attendance updates, student-facing notices, and
            lecturer-sent alerts.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Alerts
            </p>
            <Bell size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {allAlerts.length}
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
            {unreadCount}
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
            {readCount}
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
            {attendanceAlerts}
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
            {lecturerMessageCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Alerts sent by lecturer</p>
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
                placeholder="Search by alert title, message, unit, or date"
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
                onChange={(e) =>
                  setTypeFilter(e.target.value as 'All' | AlertType)
                }
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
        {filteredAlerts.length > 0 ? (
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

                    {item.source === 'lecturer' && (
                      <span className="inline-flex rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                        Sent by Lecturer
                      </span>
                    )}

                    <span className="text-xs text-gray-400">
                      {item.date} · {item.time}
                    </span>
                  </div>

                  <h2 className="text-xl font-black tracking-tight text-gray-900">
                    {item.title}
                  </h2>

                  {(item.unitCode || item.unitName) && (
                    <p className="mt-2 text-sm font-semibold text-[#E4002B]">
                      {item.unitCode ? `${item.unitCode}` : ''}
                      {item.unitName ? ` · ${item.unitName}` : ''}
                    </p>
                  )}

                  <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                    {item.message}
                  </p>
                </div>

                <div className="w-full xl:w-[240px]">
                  <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      Quick Action
                    </p>

                    <div className="mt-4 space-y-3">
                      {item.actionHref && item.actionLabel ? (
                        <Link
                          href={item.actionHref}
                          className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                        >
                          <span>{item.actionLabel}</span>
                          <ChevronRight size={16} />
                        </Link>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                          No action needed
                        </div>
                      )}

                      <Link
                        href="/student/dashboard"
                        className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        <span>Go to Dashboard</span>
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
            <h2 className="text-xl font-bold text-gray-900">No alerts found</h2>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Try changing the search term or alert type filter.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <BookOpen size={18} className="mt-1 text-[#E4002B]" />
          <div>
            <p className="text-sm font-bold text-[#E4002B]">Frontend-first note</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              This student alerts page now reads lecturer-sent alerts from browser
              storage too, so your lecturer-to-student notification flow is visible
              in the frontend before backend integration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}