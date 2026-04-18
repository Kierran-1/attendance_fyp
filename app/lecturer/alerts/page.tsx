'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Info,
  Loader2,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react';

type AlertLevel = 'Critical' | 'Warning' | 'Info';
type AlertTargetGroup =
  | 'ALL_STUDENTS'
  | 'ABSENT_STUDENTS'
  | 'LATE_STUDENTS'
  | 'AT_RISK_STUDENTS';

type LecturerUnitOption = {
  unitId: string;
  unitCode: string;
  unitName: string;
};

type LecturerAlert = {
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

type LecturerAlertsResponse = {
  units?: LecturerUnitOption[];
  alerts?: LecturerAlert[];
  alert?: LecturerAlert; // fix: include single created alert response too
  deleted?: number;
  error?: string;
};

type NewAlertForm = {
  title: string;
  message: string;
  level: AlertLevel;
  unitCode: string;
  targetGroup: AlertTargetGroup;
};

const INITIAL_FORM: NewAlertForm = {
  title: '',
  message: '',
  level: 'Warning',
  unitCode: '',
  targetGroup: 'ALL_STUDENTS',
};

function formatDateTime(value: string) {
  const parsed = new Date(value);

  return {
    date: parsed.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function getLevelBadge(level: AlertLevel) {
  switch (level) {
    case 'Critical':
      return 'border-red-100 bg-red-50 text-red-700';
    case 'Warning':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    default:
      return 'border-blue-100 bg-blue-50 text-blue-700';
  }
}

function getLevelIcon(level: AlertLevel) {
  switch (level) {
    case 'Critical':
      return <ShieldAlert size={18} className="text-red-600" />;
    case 'Warning':
      return <TriangleAlert size={18} className="text-amber-600" />;
    default:
      return <Info size={18} className="text-blue-600" />;
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

export default function LecturerAlertsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | AlertLevel>('ALL');
  const [units, setUnits] = useState<LecturerUnitOption[]>([]);
  const [alerts, setAlerts] = useState<LecturerAlert[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState<NewAlertForm>(INITIAL_FORM);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/alerts', { cache: 'no-store' });
        const json: LecturerAlertsResponse = await response.json();

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load alerts');
        }

        const nextUnits = Array.isArray(json.units) ? json.units : [];
        const nextAlerts = Array.isArray(json.alerts) ? json.alerts : [];

        setUnits(nextUnits);
        setAlerts(nextAlerts);

        // Default the dropdown to first lecturer unit.
        if (nextUnits.length > 0) {
          setForm((prev) => ({
            ...prev,
            unitCode: prev.unitCode || nextUnits[0].unitCode,
          }));
        }
      } catch (loadError) {
        console.error('Failed to load lecturer alerts:', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load lecturer alerts.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredAlerts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return alerts.filter((item) => {
      const matchesLevel =
        levelFilter === 'ALL' ? true : item.level === levelFilter;

      const matchesSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.message.toLowerCase().includes(keyword) ||
        item.unitCode.toLowerCase().includes(keyword) ||
        (item.unitName ?? '').toLowerCase().includes(keyword) ||
        getTargetGroupLabel(item.targetGroup).toLowerCase().includes(keyword);

      return matchesLevel && matchesSearch;
    });
  }, [alerts, levelFilter, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter((item) => item.level === 'Critical').length,
      warning: alerts.filter((item) => item.level === 'Warning').length,
      info: alerts.filter((item) => item.level === 'Info').length,
    };
  }, [alerts]);

  async function handleSendAlert() {
    if (!form.title.trim() || !form.message.trim() || !form.unitCode) {
      window.alert('Please fill in the title, message, and unit.');
      return;
    }

    try {
      setSubmitting(true);
      setSuccessMessage('');

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          level: form.level,
          unitCode: form.unitCode,
          targetGroup: form.targetGroup,
        }),
      });

      const json: LecturerAlertsResponse = await response.json();

      if (!response.ok || !json.alert) {
        console.error('Create alert response:', json);
        throw new Error(json.error || 'Failed to send alert');
      }

      setAlerts((prev) => [json.alert as LecturerAlert, ...prev]);
      setForm((prev) => ({
        ...INITIAL_FORM,
        unitCode: prev.unitCode,
      }));
      setSuccessMessage('Alert sent successfully.');
    } catch (submitError) {
      console.error('Failed to send lecturer alert:', submitError);
      window.alert(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to send alert.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearAlerts() {
    const confirmed = window.confirm(
      'Clear all alerts sent from this lecturer account?'
    );
    if (!confirmed) return;

    try {
      setClearing(true);
      setSuccessMessage('');

      const response = await fetch('/api/alerts', {
        method: 'DELETE',
      });

      const json: LecturerAlertsResponse = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to clear alerts');
      }

      setAlerts([]);
      setSuccessMessage('All lecturer alerts cleared.');
    } catch (clearError) {
      console.error('Failed to clear lecturer alerts:', clearError);
      window.alert(
        clearError instanceof Error
          ? clearError.message
          : 'Failed to clear alerts.'
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Alerts</span>
      </nav>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Alerts
          </h1>
          <p className="mt-2 max-w-3xl text-base text-gray-500">
            Send class-based alerts using only the real units linked to this
            lecturer account.
          </p>
        </div>

        <Link
          href="/lecturer/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
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

      {successMessage ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {successMessage}
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
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Critical
            </p>
            <ShieldAlert size={18} className="text-red-500" />
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
            <TriangleAlert size={18} className="text-amber-500" />
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
            <Info size={18} className="text-blue-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-blue-600">
            {loading ? '—' : stats.info}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-[#E4002B]">
              <Send size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Send Alert to Students
              </h2>
              <p className="mt-1 text-sm leading-7 text-gray-500">
                Unit selection is taken from the lecturer&apos;s real class list.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-10 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin text-red-600" />
              Loading units...
            </div>
          ) : units.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-sm text-gray-500">
              No lecturer units found yet. Upload roster data first so the alert
              page can map alerts to real classes.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="alert-unit"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Unit
                </label>
                <select
                  id="alert-unit"
                  value={form.unitCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unitCode: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                >
                  {units.map((unit) => (
                    <option key={unit.unitCode} value={unit.unitCode}>
                      {unit.unitCode} — {unit.unitName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alert-target-group"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Target Group
                </label>
                <select
                  id="alert-target-group"
                  value={form.targetGroup}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      targetGroup: e.target.value as AlertTargetGroup,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                >
                  <option value="ALL_STUDENTS">All Students</option>
                  <option value="ABSENT_STUDENTS">Absent Students</option>
                  <option value="LATE_STUDENTS">Late Students</option>
                  <option value="AT_RISK_STUDENTS">At-Risk Students</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="alert-title"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Alert Title
                </label>
                <input
                  id="alert-title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Example: Attendance reminder"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label
                  htmlFor="alert-message"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Alert Message
                </label>
                <textarea
                  id="alert-message"
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="Write the lecturer alert message here..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label
                  htmlFor="alert-level"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Alert Level
                </label>
                <select
                  id="alert-level"
                  value={form.level}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      level: e.target.value as AlertLevel,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                >
                  <option value="Critical">Critical</option>
                  <option value="Warning">Warning</option>
                  <option value="Info">Info</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendAlert}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c2183a] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Send Alert
                </button>

                <button
                  type="button"
                  onClick={handleClearAlerts}
                  disabled={clearing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {clearing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Clear My Alerts
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Sent Alerts</h2>
              <p className="mt-1 text-sm leading-7 text-gray-500">
                These are the alerts created from this lecturer account.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.4fr_220px]">
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, message, or unit"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="alert-level-filter"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Filter by level
              </label>
              <select
                id="alert-level-filter"
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as 'ALL' | AlertLevel)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              >
                <option value="ALL">All</option>
                <option value="Critical">Critical</option>
                <option value="Warning">Warning</option>
                <option value="Info">Info</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-14 text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin text-red-600" />
                Loading alerts...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
                <h3 className="text-lg font-bold text-gray-900">No alerts found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Send your first unit-based alert from the form on the left.
                </p>
              </div>
            ) : (
              filteredAlerts.map((item) => {
                const stamp = formatDateTime(item.createdAt);

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5 transition hover:border-gray-200 hover:bg-white"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                          {getLevelIcon(item.level)}
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getLevelBadge(
                                item.level
                              )}`}
                            >
                              {item.level}
                            </span>

                            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600">
                              {getTargetGroupLabel(item.targetGroup)}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {item.title}
                            </h3>
                            <p className="mt-1 text-sm leading-7 text-gray-500">
                              {item.message}
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-gray-600">
                            {item.unitCode}
                            {item.unitName ? ` — ${item.unitName}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 sm:items-end">
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
            )}
          </div>
        </div>
      </section>
    </div>
  );
}