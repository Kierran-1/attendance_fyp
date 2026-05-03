'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit2,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
  XCircle,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  RadioTower,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = 'unscheduled' | 'scheduled' | 'active' | 'completed';

type ClassSession = {
  id: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  sessionName: 'LECTURE' | 'TUTORIAL' | 'LAB';
  weekNumber: number | null;
  day: string | null;
  scheduledDate: string | null;
  sessionTime: string | null;
  sessionDuration: number | null;
  location: string | null;
  groupNo: string | null;
  subcomponent: string | null;
  status: SessionStatus;
  attendanceCount: number;
};

type EditForm = {
  scheduledDate: string;
  sessionTime: string;
  sessionDuration: string;
  location: string;
  weekNumber: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────


const STATUS_META: Record<SessionStatus, { label: string; colour: string; icon: React.ReactNode }> = {
  unscheduled: { label: 'Unscheduled', colour: 'bg-gray-50 text-gray-500 border-gray-200',  icon: <Clock3 size={11} /> },
  scheduled:   { label: 'Scheduled',   colour: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Calendar size={11} /> },
  active:      { label: 'Live',        colour: 'bg-green-50 text-green-700 border-green-200', icon: <RadioTower size={11} /> },
  completed:   { label: 'Completed',   colour: 'bg-slate-50 text-slate-500 border-slate-200', icon: <CheckCircle2 size={11} /> },
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function dayOfWeek(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' });
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}



// ─── Component ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [sessions, setSessions]     = useState<ClassSession[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Filters
  const [unitFilter, setUnitFilter]     = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch]             = useState('');

  // Edit modal
  const [editTarget, setEditTarget]   = useState<ClassSession | null>(null);
  const [editForm, setEditForm]       = useState<EditForm>({ scheduledDate: '', sessionTime: '', sessionDuration: '', location: '', weekNumber: '' });
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');

  // Cancel confirmation
  const [cancelTarget, setCancelTarget] = useState<ClassSession | null>(null);
  const [cancelling, setCancelling]     = useState(false);

  // ── Load sessions ──────────────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setError('Unable to load sessions. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Edit session ───────────────────────────────────────────────────────────

  function openEdit(s: ClassSession) {
    setEditTarget(s);
    setSaveError('');
    setEditForm({
      scheduledDate:   toDatetimeLocal(s.scheduledDate),
      sessionTime:     toDatetimeLocal(s.sessionTime),
      sessionDuration: s.sessionDuration != null ? String(s.sessionDuration) : '',
      location:        s.location ?? '',
      weekNumber:      s.weekNumber != null ? String(s.weekNumber) : '',
    });
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    setSaveError('');

    const body: Record<string, unknown> = {};
    if (editForm.scheduledDate) body.scheduledDate = new Date(editForm.scheduledDate).toISOString();
    if (editForm.sessionTime)   body.sessionTime   = new Date(editForm.sessionTime).toISOString();
    else                        body.sessionTime   = null;
    if (editForm.sessionDuration) body.sessionDuration = Number(editForm.sessionDuration);
    body.location   = editForm.location || null;
    body.weekNumber = editForm.weekNumber ? Number(editForm.weekNumber) : null;

    try {
      const res = await fetch(`/api/sessions/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to save');
      }
      setEditTarget(null);
      await loadSessions();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ── Cancel attendances ─────────────────────────────────────────────────────

  async function handleCancelAttendances() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await fetch(`/api/sessions/${cancelTarget.id}/records`, { method: 'DELETE' });
      setCancelTarget(null);
      await loadSessions();
    } catch { /* silent */ } finally {
      setCancelling(false);
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const units = Array.from(new Map(sessions.map(s => [s.unitId, { id: s.unitId, code: s.unitCode, name: s.unitName }])).values());

  const filtered = sessions.filter(s => {
    if (unitFilter !== 'all' && s.unitId !== unitFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.unitCode.toLowerCase().includes(q) && !s.unitName.toLowerCase().includes(q) && !(s.location ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">

      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="cursor-default hover:text-gray-600">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Sessions</span>
      </nav>

      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">Sessions</h1>
          <p className="mt-2 text-sm text-gray-500">
            View, reschedule, and manage all class sessions. Cancel attendance records for accidental opens.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSessions}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm transition hover:border-[#E4002B]/30 hover:text-[#E4002B] self-start"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

      {/* Filters */}
      <section className="flex flex-wrap gap-3">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search unit or location…"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100 w-56"
        />

        {/* Unit filter */}
        <div className="relative">
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="appearance-none rounded-2xl border border-gray-200 bg-white py-2 pl-4 pr-8 text-sm font-semibold text-gray-700 outline-none transition focus:border-[#E4002B]"
          >
            <option value="all">All Units</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.code}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none rounded-2xl border border-gray-200 bg-white py-2 pl-4 pr-8 text-sm font-semibold text-gray-700 outline-none transition focus:border-[#E4002B]"
          >
            <option value="all">All Statuses</option>
            <option value="unscheduled">Unscheduled</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Live</option>
            <option value="completed">Completed</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <span className="ml-auto self-center text-xs text-gray-400">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
      </section>

      {/* Session list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" /> Loading sessions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          <Calendar size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">No sessions found</p>
          <p className="mt-1 text-xs">Adjust filters or upload a class timetable via Classes.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Week / Day</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Unit</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden lg:table-cell">Attendance Window</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => {
                const weekNo   = s.weekNumber;
                const dayName  = s.day ?? dayOfWeek(s.scheduledDate);
                const meta     = STATUS_META[s.status];

                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Week / Day */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{weekNo != null ? `Week ${weekNo}` : '—'}</p>
                      {dayName && <p className="text-xs text-gray-400">{dayName}</p>}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {fmtDate(s.scheduledDate)}
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{s.unitCode}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{s.unitName}</p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-700">{s.sessionName}</p>
                      {s.groupNo && <p className="text-[10px] text-gray-400">{s.groupNo}</p>}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {s.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                          {s.location}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Attendance Window */}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 whitespace-nowrap">
                      {s.sessionTime ? (
                        <>
                          <p>{fmtDateTime(s.sessionTime)}</p>
                          {s.sessionDuration && <p className="text-gray-400">{s.sessionDuration} min</p>}
                        </>
                      ) : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.colour}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                      {s.attendanceCount > 0 && (
                        <p className="mt-0.5 text-[10px] text-gray-400">{s.attendanceCount} records</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          title="Edit / Reschedule"
                          className="rounded-xl border border-gray-200 p-1.5 text-gray-400 transition hover:border-[#E4002B]/30 hover:text-[#E4002B]"
                        >
                          <Edit2 size={13} />
                        </button>
                        {s.attendanceCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(s)}
                            title="Cancel all attendances"
                            className="rounded-xl border border-red-100 p-1.5 text-red-400 transition hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Edit Session</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editTarget.unitCode} · {editTarget.sessionName}{editTarget.groupNo ? ` · ${editTarget.groupNo}` : ''}
                </p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="space-y-4">
              {/* Scheduled Date */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-500">
                  Scheduled Date
                </label>
                <input
                  type="datetime-local"
                  value={editForm.scheduledDate}
                  onChange={e => setEditForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#E4002B] focus:bg-white"
                />
                <p className="mt-1 text-[11px] text-gray-400">The date and time of the class itself.</p>
              </div>

              {/* Attendance Window Start */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-500">
                  Attendance Window Start
                </label>
                <input
                  type="datetime-local"
                  value={editForm.sessionTime}
                  onChange={e => setEditForm(f => ({ ...f, sessionTime: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#E4002B] focus:bg-white"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  When students can start checking in. Leave blank to reset to unscheduled.
                </p>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-500">
                  Attendance Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 60"
                  value={editForm.sessionDuration}
                  onChange={e => setEditForm(f => ({ ...f, sessionDuration: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-[#E4002B] focus:outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-500">
                  Location / Room
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. BA301"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#E4002B] focus:bg-white"
                />
              </div>

              {/* Week Number */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-500">
                  Week Number (optional override)
                </label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={editForm.weekNumber}
                  onChange={e => setEditForm(f => ({ ...f, weekNumber: e.target.value }))}
                  placeholder="Auto-inferred if blank"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#E4002B] focus:bg-white"
                />
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-sm font-semibold text-red-600">{saveError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#E4002B] py-2.5 text-sm font-semibold text-white transition hover:bg-[#C70026] disabled:opacity-50"
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Confirmation Modal ── */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h2 className="text-base font-black text-gray-900">Cancel All Attendances?</h2>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              This will permanently delete <strong>{cancelTarget.attendanceCount} attendance record{cancelTarget.attendanceCount !== 1 ? 's' : ''}</strong> and all raw scan data for:
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-4">
              {cancelTarget.unitCode} · {cancelTarget.sessionName} · {fmtDate(cancelTarget.scheduledDate)}
            </p>

            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold flex items-start gap-2">
              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
              This cannot be undone. Use this to fix accidental session opens.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Keep Records
              </button>
              <button
                type="button"
                onClick={handleCancelAttendances}
                disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? <><Loader2 size={15} className="animate-spin" /> Deleting…</> : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
