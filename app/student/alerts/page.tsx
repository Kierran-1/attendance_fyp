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
  Loader2,
  Search,
  Send,
} from 'lucide-react';

type AlertLevel = 'Critical' | 'Warning' | 'Info';
type AlertTargetGroup =
  | 'ALL_STUDENTS'
  | 'ABSENT_STUDENTS'
  | 'LATE_STUDENTS'
  | 'AT_RISK_STUDENTS';

type StudentLecturerAlert = {
  id: string;
  title: string;
  message: string;
  level: AlertLevel;
  targetGroup: AlertTargetGroup;
  unitCode: string;
  unitName: string | null;
  actionHref: string | null;
  actionLabel: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
};

type StudentAlertsResponse = {
  alerts?: StudentLecturerAlert[];
  error?: string;
};

type StudentPageAlert = {
  id: string;
  title: string;
  message: string;
  type: 'Lecturer Message';
  level: AlertLevel;
  unitCode: string;
  unitName: string | null;
  actionHref: string | null;
  actionLabel: string | null;
  createdByName: string | null;
  createdAt: string;
};

function formatStamp(createdAt: string) {
  const date = new Date(createdAt);

  return {
    date: date.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function getLevelClasses(level: AlertLevel) {
  switch (level) {
    case 'Critical':
      return 'border-red-100 bg-red-50 text-red-700';
    case 'Warning':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    default:
      return 'border-blue-100 bg-blue-50 text-blue-700';
  }
}

function getTargetGroupLabel(value: AlertTargetGroup) {
  switch (value) {
    case 'ABSENT_STUDENTS':
      return 'Absent Students';
    case 'LATE_STUDENTS':
      return 'Late Students';
    case 'AT_RISK_STUDENTS':
      return 'At-Risk Students';
    default:
      return 'All Students';
  }
}

export default function StudentAlertsPage() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<StudentPageAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        setError('');

        console.log('Loading alerts...');
        const response = await fetch('/api/alerts', { cache: 'no-store' });
        console.log('Response status:', response.status, 'ok:', response.ok);

        const json: StudentAlertsResponse = await response.json();
        console.log('Response json:', json);

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load alerts');
        }

        const mapped: StudentPageAlert[] = Array.isArray(json.alerts)
          ? json.alerts.map((item) => ({
              id: item.id,
              title: item.title,
              message: item.message,
              type: 'Lecturer Message',
              level: item.level,
              unitCode: item.unitCode,
              unitName: item.unitName,
              actionHref: item.actionHref,
              actionLabel: item.actionLabel,
              createdByName: item.createdByName,
              createdAt: item.createdAt,
            }))
          : [];

        setAlerts(mapped);
      } catch (loadError) {
        console.error('Failed to load student alerts:', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load alerts.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return alerts.filter((item) => {
      if (!keyword) return true;

      return (
        item.title.toLowerCase().includes(keyword) ||
        item.message.toLowerCase().includes(keyword) ||
        item.unitCode.toLowerCase().includes(keyword) ||
        (item.unitName ?? '').toLowerCase().includes(keyword) ||
        (item.createdByName ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [alerts, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter((item) => item.level === 'Critical').length,
      warning: alerts.filter((item) => item.level === 'Warning').length,
      info: alerts.filter((item) => item.level === 'Info').length,
    };
  }, [alerts]);

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
            View lecturer messages that are matched to your real registered units.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Alerts
            </p>
            <Bell size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : stats.total}
          </p>
          <p className="mt-2 text-xs text-gray-500">Lecturer alerts for your units</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Critical
            </p>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : stats.critical}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Warning
            </p>
            <CalendarClock size={18} className="text-amber-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-amber-600">
            {loading ? '—' : stats.warning}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Info
            </p>
            <CheckCircle2 size={18} className="text-blue-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-blue-600">
            {loading ? '—' : stats.info}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
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
            placeholder="Search by title, message, unit, or lecturer"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-gray-100 bg-white px-6 py-16 text-sm text-gray-500 shadow-sm">
            <Loader2 size={18} className="animate-spin text-red-600" />
            Loading alerts...
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((item) => {
            const stamp = formatStamp(item.createdAt);

            return (
              <article
                key={item.id}
                className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getLevelClasses(
                          item.level
                        )}`}
                      >
                        {item.level}
                      </span>

                      <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-purple-700">
                        Lecturer Message
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl font-black tracking-tight text-gray-900">
                        {item.title}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                        {item.message}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="font-semibold">
                        {item.unitCode}
                        {item.unitName ? ` — ${item.unitName}` : ''}
                      </p>
                      {item.createdByName ? (
                        <p>From: {item.createdByName}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="text-sm text-gray-500">
                      <p className="font-semibold text-gray-700">{stamp.date}</p>
                      <p>{stamp.time}</p>
                    </div>

                    {item.actionHref ? (
                      <Link
                        href={item.actionHref}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        {item.actionLabel ?? 'Open'}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">No alerts found</h2>
            <p className="mt-2 text-sm text-gray-500">
              You do not have any lecturer alerts for your registered units yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}