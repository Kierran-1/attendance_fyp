'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileWarning,
  Info,
  Search,
  Send,
  ShieldAlert,
  TriangleAlert,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';

type AlertLevel = 'Critical' | 'Warning' | 'Info';
type AlertType =
  | 'Absent Students'
  | 'Late Check-ins'
  | 'At-Risk Students'
  | 'Session Issue'
  | 'Upload Status'
  | 'System Info'
  | 'Lecturer Message';

type LecturerAlert = {
  id: string;
  title: string;
  message: string;
  level: AlertLevel;
  type: AlertType;
  unitCode?: string;
  unitName?: string;
  time: string;
  date: string;
  actionLabel?: string;
  actionHref?: string;
  source?: 'system' | 'lecturer';
};

type NewAlertForm = {
  title: string;
  message: string;
  level: AlertLevel;
  unitCode: string;
  targetGroup: string;
};

const lecturerAlerts: LecturerAlert[] = [
  {
    id: 'alert-1',
    title: 'High absence detected',
    message:
      '8 students are currently absent in COS40005. Review the attendance session and follow up if needed.',
    level: 'Critical',
    type: 'Absent Students',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    date: '26 Mar 2026',
    time: '10:05 AM',
    actionLabel: 'Open Attendance',
    actionHref: '/lecturer/attendance',
    source: 'system',
  },
  {
    id: 'alert-2',
    title: 'Attendance session inactive',
    message:
      'No active attendance session is running for SWE30003 even though the scheduled time has started.',
    level: 'Critical',
    type: 'Session Issue',
    unitCode: 'SWE30003',
    unitName: 'Software Architecture and Design',
    date: '26 Mar 2026',
    time: '2:08 PM',
    actionLabel: 'Start Live Attendance',
    actionHref: '/lecturer/live-attendance',
    source: 'system',
  },
  {
    id: 'alert-3',
    title: 'At-risk students detected',
    message:
      'Several students in COS30049 are below the recommended attendance threshold and may need early intervention.',
    level: 'Warning',
    type: 'At-Risk Students',
    unitCode: 'COS30049',
    unitName: 'Computing Technology Innovation Project',
    date: '25 Mar 2026',
    time: '4:15 PM',
    actionLabel: 'View Reports',
    actionHref: '/lecturer/reports',
    source: 'system',
  },
  {
    id: 'alert-4',
    title: 'Late check-ins recorded',
    message:
      '3 late check-ins were recorded during the latest COS40005 session.',
    level: 'Warning',
    type: 'Late Check-ins',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    date: '25 Mar 2026',
    time: '9:48 AM',
    actionLabel: 'Open Attendance',
    actionHref: '/lecturer/attendance',
    source: 'system',
  },
  {
    id: 'alert-5',
    title: 'Roster uploaded successfully',
    message:
      'The roster file for COS30015 was uploaded and parsed successfully.',
    level: 'Info',
    type: 'Upload Status',
    unitCode: 'COS30015',
    unitName: 'IT Security',
    date: '24 Mar 2026',
    time: '11:10 AM',
    actionLabel: 'View Classes',
    actionHref: '/lecturer/classes',
    source: 'system',
  },
  {
    id: 'alert-6',
    title: 'Attendance session started',
    message:
      'A live attendance session has started for COS40005 and is ready for QR-based check-in simulation.',
    level: 'Info',
    type: 'System Info',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    date: '24 Mar 2026',
    time: '9:00 AM',
    actionLabel: 'Open Live Attendance',
    actionHref: '/lecturer/live-attendance',
    source: 'system',
  },
  {
    id: 'alert-7',
    title: 'Possible upload issue',
    message:
      'A previous roster file appears incomplete and may require rechecking column mappings.',
    level: 'Warning',
    type: 'Upload Status',
    date: '23 Mar 2026',
    time: '1:20 PM',
    actionLabel: 'Upload Roster',
    actionHref: '/lecturer/upload-roster',
    source: 'system',
  },
];

const INITIAL_FORM: NewAlertForm = {
  title: '',
  message: '',
  level: 'Warning',
  unitCode: '',
  targetGroup: 'All Students',
};

function getLevelStyles(level: AlertLevel) {
  switch (level) {
    case 'Critical':
      return 'border-red-100 bg-red-50 text-red-700';
    case 'Warning':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'Info':
      return 'border-blue-100 bg-blue-50 text-blue-700';
    default:
      return 'border-gray-100 bg-gray-50 text-gray-700';
  }
}

function getTypeStyles(type: AlertType) {
  switch (type) {
    case 'Absent Students':
    case 'Session Issue':
      return 'border-red-100 bg-red-50 text-red-700';
    case 'Late Check-ins':
    case 'At-Risk Students':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'Upload Status':
    case 'System Info':
      return 'border-blue-100 bg-blue-50 text-blue-700';
    case 'Lecturer Message':
      return 'border-purple-100 bg-purple-50 text-purple-700';
    default:
      return 'border-gray-100 bg-gray-50 text-gray-700';
  }
}

function getAlertIcon(level: AlertLevel) {
  switch (level) {
    case 'Critical':
      return <ShieldAlert size={18} className="text-red-600" />;
    case 'Warning':
      return <TriangleAlert size={18} className="text-amber-600" />;
    case 'Info':
      return <Info size={18} className="text-blue-600" />;
    default:
      return <Bell size={18} className="text-gray-600" />;
  }
}

export default function LecturerAlertsPage() {
  const [levelFilter, setLevelFilter] = useState<'All' | AlertLevel>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sentAlerts, setSentAlerts] = useState<LecturerAlert[]>([]);
  const [newAlert, setNewAlert] = useState<NewAlertForm>(INITIAL_FORM);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lecturerSentAlerts');
      if (!saved) return;

      const parsed: LecturerAlert[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setSentAlerts(parsed);
      }
    } catch (error) {
      console.error('Failed to load sent lecturer alerts:', error);
    }
  }, []);

  const allAlerts = useMemo(() => {
    return [...sentAlerts, ...lecturerAlerts];
  }, [sentAlerts]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((item) => {
      const matchesLevel =
        levelFilter === 'All' ? true : item.level === levelFilter;

      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.unitCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.unitName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesLevel && matchesSearch;
    });
  }, [allAlerts, levelFilter, searchTerm]);

  const stats = useMemo(() => {
    const critical = allAlerts.filter((item) => item.level === 'Critical').length;
    const warning = allAlerts.filter((item) => item.level === 'Warning').length;
    const info = allAlerts.filter((item) => item.level === 'Info').length;
    const lecturerSent = allAlerts.filter(
      (item) => item.source === 'lecturer'
    ).length;

    return {
      total: allAlerts.length,
      critical,
      warning,
      info,
      lecturerSent,
    };
  }, [allAlerts]);

  const handleSendAlert = () => {
    if (!newAlert.title.trim() || !newAlert.message.trim()) {
      window.alert('Please fill in the alert title and message.');
      return;
    }

    const now = new Date();

    const createdAlert: LecturerAlert = {
      id: `lecturer-alert-${Date.now()}`,
      title: newAlert.title.trim(),
      message: `${newAlert.message.trim()}${newAlert.targetGroup ? ` Target: ${newAlert.targetGroup}.` : ''}`,
      level: newAlert.level,
      type: 'Lecturer Message',
      unitCode: newAlert.unitCode.trim() || undefined,
      unitName: undefined,
      date: now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      actionLabel: 'View Classes',
      actionHref: '/lecturer/classes',
      source: 'lecturer',
    };

    const updatedAlerts = [createdAlert, ...sentAlerts];
    setSentAlerts(updatedAlerts);

    try {
      localStorage.setItem('lecturerSentAlerts', JSON.stringify(updatedAlerts));
    } catch (error) {
      console.error('Failed to save lecturer sent alerts:', error);
    }

    setNewAlert(INITIAL_FORM);
    setSendSuccess(true);

    window.setTimeout(() => {
      setSendSuccess(false);
    }, 2000);
  };

  const handleClearSentAlerts = () => {
    const confirmed = window.confirm(
      'Clear all lecturer-sent alerts from browser storage?'
    );
    if (!confirmed) return;

    setSentAlerts([]);
    localStorage.removeItem('lecturerSentAlerts');
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Alerts
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Real-time warnings and notifications related to attendance tracking,
            at-risk students, upload issues, session activity, and lecturer-sent
            student messages.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Alerts"
          value={stats.total}
          note="All current lecturer notifications"
          icon={<Bell size={18} className="text-gray-300" />}
          valueClassName="text-gray-900"
        />

        <SummaryCard
          label="Critical Alerts"
          value={stats.critical}
          note="Absent students and session issues"
          icon={<ShieldAlert size={18} className="text-red-500" />}
          valueClassName="text-red-600"
        />

        <SummaryCard
          label="Warnings"
          value={stats.warning}
          note="At-risk students and late check-ins"
          icon={<TriangleAlert size={18} className="text-amber-500" />}
          valueClassName="text-amber-600"
        />

        <SummaryCard
          label="Info"
          value={stats.info}
          note="Session and upload updates"
          icon={<Info size={18} className="text-blue-500" />}
          valueClassName="text-blue-600"
        />

        <SummaryCard
          label="Lecturer Sent"
          value={stats.lecturerSent}
          note="Messages created from this page"
          icon={<Send size={18} className="text-purple-500" />}
          valueClassName="text-purple-600"
        />
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
                Create a lecturer message for students without backend first. This
                is saved in browser storage for frontend demonstration.
              </p>
            </div>
          </div>

          <div className="space-y-4">
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
                value={newAlert.title}
                onChange={(e) =>
                  setNewAlert((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Example: Attendance reminder for tomorrow"
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
                value={newAlert.message}
                onChange={(e) =>
                  setNewAlert((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder="Write the lecturer alert message here..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="alert-level"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Alert Level
                </label>
                <select
                  id="alert-level"
                  value={newAlert.level}
                  onChange={(e) =>
                    setNewAlert((prev) => ({
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

              <div>
                <label
                  htmlFor="alert-target-group"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Target Group
                </label>
                <select
                  id="alert-target-group"
                  value={newAlert.targetGroup}
                  onChange={(e) =>
                    setNewAlert((prev) => ({
                      ...prev,
                      targetGroup: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                >
                  <option>All Students</option>
                  <option>Absent Students</option>
                  <option>Late Students</option>
                  <option>At-Risk Students</option>
                  <option>Selected Class Only</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="alert-unit-code"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Unit Code
              </label>
              <input
                id="alert-unit-code"
                type="text"
                value={newAlert.unitCode}
                onChange={(e) =>
                  setNewAlert((prev) => ({ ...prev, unitCode: e.target.value }))
                }
                placeholder="Example: COS40005"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendAlert}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
              >
                <Send size={16} />
                Send Alert
              </button>

              <button
                type="button"
                onClick={() => setNewAlert(INITIAL_FORM)}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <X size={16} />
                Clear Form
              </button>

              <button
                type="button"
                onClick={handleClearSentAlerts}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <X size={16} />
                Clear Sent Alerts
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-red-100 bg-red-50/60 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" />
              <h2 className="text-base font-bold text-red-700">Critical Alerts</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Absent students and session-related problems that need immediate lecturer attention.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <TriangleAlert size={18} className="text-amber-600" />
              <h2 className="text-base font-bold text-amber-700">Warnings</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Low attendance trends, late arrivals, and upload situations that may need review.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-blue-700">Info</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Session started messages, successful roster uploads, and general system notices.
            </p>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-purple-50/60 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Send size={18} className="text-purple-600" />
              <h2 className="text-base font-bold text-purple-700">Lecturer Messages</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Lecturer-created alerts can be prepared here first before real student-side delivery is connected.
            </p>
          </div>
        </div>
      </section>

      {sendSuccess && (
        <section className="rounded-3xl border border-green-100 bg-green-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-1 text-green-700" />
            <div>
              <p className="text-sm font-bold text-green-700">
                Alert sent successfully
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                The lecturer alert was saved in browser storage and added to the alerts list.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_220px] rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
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
              placeholder="Search by title, unit, type, or message"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="level-filter"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Filter by level
          </label>
          <select
            id="level-filter"
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value as 'All' | AlertLevel)
            }
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
          >
            <option value="All">All</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Info">Info</option>
          </select>
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
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getLevelStyles(
                        item.level
                      )}`}
                    >
                      {item.level}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getTypeStyles(
                        item.type
                      )}`}
                    >
                      {item.type}
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

                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getAlertIcon(item.level)}</div>

                    <div className="min-w-0">
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
                  </div>
                </div>

                <div className="w-full xl:w-[240px]">
                  <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      Recommended Action
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
                          No action linked
                        </div>
                      )}

                      <Link
                        href="/lecturer/dashboard"
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
              Try changing the search or alert level filter.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InsightCard
          icon={<Users size={18} className="text-red-600" />}
          title="Absent students"
          text="Critical alerts highlight classes where absent counts may require immediate lecturer follow-up."
          theme="border-red-100 bg-red-50"
        />
        <InsightCard
          icon={<Clock3 size={18} className="text-amber-600" />}
          title="Late and low attendance"
          text="Warnings help detect patterns such as frequent late arrivals and students nearing risk thresholds."
          theme="border-amber-100 bg-amber-50"
        />
        <InsightCard
          icon={<UploadCloud size={18} className="text-blue-600" />}
          title="System updates"
          text="Info alerts keep lecturers aware of successful uploads, started sessions, and general workflow status."
          theme="border-blue-100 bg-blue-50"
        />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
  valueClassName: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
          {label}
        </p>
        {icon}
      </div>
      <p className={`text-4xl font-black tracking-tight ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  text,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  theme: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${theme}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-base font-bold text-gray-900">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-gray-700">{text}</p>
    </div>
  );
}