'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell,
} from 'recharts';
import {
  AlertTriangle, ArrowLeft, BarChart3, BookOpen,
  Download, Loader2, Search, ShieldAlert, Users,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiUnit = {
  id: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  semester: string;
  year: number;
  classType: string;
  group: string;
  students: {
    id: string;
    studentNumber: string;
    name: string;
    program: string;
    nationality: string;
  }[];
  sessions: {
    id: string;
    date: string;
    attendancePercentage: number;
    status: string;
    presentCount: number;
    absentCount: number;
  }[];
};

// Group multiple class-session rows by unitCode into a logical unit
type UnitSummary = {
  unitCode: string;
  unitName: string;
  classes: ApiUnit[];
  // merged unique students across all class groups
  students: ApiUnit['students'];
  // all sessions across all class groups
  sessions: ApiUnit['sessions'];
  avgAttendance: number;
  totalPresent: number;
  totalAbsent: number;
};

type AtRiskRow = {
  name: string;
  studentNumber: string;
  unit: string;
  sessionsPresent: number;
  sessionsTotal: number;
  rate: number;
  risk: 'High Risk' | 'Medium';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUnitSummaries(units: ApiUnit[]): UnitSummary[] {
  const map = new Map<string, UnitSummary>();

  for (const u of units) {
    if (!map.has(u.unitCode)) {
      map.set(u.unitCode, {
        unitCode: u.unitCode,
        unitName: u.unitName,
        classes: [],
        students: [],
        sessions: [],
        avgAttendance: 0,
        totalPresent: 0,
        totalAbsent: 0,
      });
    }
    const entry = map.get(u.unitCode)!;
    entry.classes.push(u);

    // Merge unique students by studentNumber
    for (const s of u.students) {
      if (!entry.students.find(x => x.studentNumber === s.studentNumber)) {
        entry.students.push(s);
      }
    }
    entry.sessions.push(...u.sessions);
  }

  // Calculate averages
  for (const entry of map.values()) {
    const totalPresent = entry.sessions.reduce((s, r) => s + r.presentCount, 0);
    const totalAbsent  = entry.sessions.reduce((s, r) => s + r.absentCount, 0);
    const total = totalPresent + totalAbsent;
    entry.totalPresent = totalPresent;
    entry.totalAbsent  = totalAbsent;
    entry.avgAttendance = total > 0 ? Math.round((totalPresent / total) * 100) : 0;
  }

  return Array.from(map.values());
}

function buildAtRiskRows(units: ApiUnit[]): AtRiskRow[] {
  // Per student per unit: count sessions present vs total
  const key = (studentNum: string, unitCode: string) => `${studentNum}::${unitCode}`;

  const presentMap  = new Map<string, number>();
  const totalMap    = new Map<string, number>();
  const nameMap     = new Map<string, string>();
  const unitMap     = new Map<string, string>();

  for (const u of units) {
    const totalSessions = u.sessions.length;
    if (totalSessions === 0) continue;

    for (const s of u.students) {
      const k = key(s.studentNumber, u.unitCode);
      totalMap.set(k, (totalMap.get(k) ?? 0) + totalSessions);
      nameMap.set(k, s.name);
      unitMap.set(k, u.unitCode);

      // Estimate per-student present using class-level attendance %
      // (real per-student data would need a separate API)
      const avgPct = u.sessions.reduce((sum, sess) => sum + sess.attendancePercentage, 0) / totalSessions;
      const estimatedPresent = Math.round((avgPct / 100) * totalSessions);
      presentMap.set(k, (presentMap.get(k) ?? 0) + estimatedPresent);
    }
  }

  const rows: AtRiskRow[] = [];
  for (const [k, total] of totalMap.entries()) {
    const present = presentMap.get(k) ?? 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    if (rate >= 75) continue; // only at-risk
    const [studentNumber] = k.split('::');
    rows.push({
      name: nameMap.get(k) ?? '—',
      studentNumber,
      unit: unitMap.get(k) ?? '—',
      sessionsPresent: present,
      sessionsTotal: total,
      rate,
      risk: rate < 50 ? 'High Risk' : 'Medium',
    });
  }

  return rows.sort((a, b) => a.rate - b.rate);
}

const CHART_COLORS = ['#ef4444', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: authSession } = useSession();

  const [rawUnits, setRawUnits]     = useState<ApiUnit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selectedCode, setSelectedCode] = useState('all');
  const [trendView, setTrendView]   = useState<'session' | 'unit'>('session');
  const [studentSearch, setStudentSearch] = useState('');

  // ── Fetch real data ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/lecturer/unit');
        if (!res.ok) throw new Error('Failed to load units');
        const data: ApiUnit[] = await res.json();
        setRawUnits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const unitSummaries = useMemo(() => buildUnitSummaries(rawUnits), [rawUnits]);

  const filteredSummaries = useMemo(() => {
    if (selectedCode === 'all') return unitSummaries;
    return unitSummaries.filter(u => u.unitCode === selectedCode);
  }, [unitSummaries, selectedCode]);

  // Bar chart data — one bar per unit
  const barData = useMemo(() =>
    filteredSummaries.map(u => ({
      name: u.unitCode,
      attendance: u.avgAttendance,
      students: u.students.length,
    }))
  , [filteredSummaries]);

  // Line chart: per-session trend across all selected units
  const sessionTrendData = useMemo(() => {
    const maxSessions = Math.max(...filteredSummaries.map(u => u.sessions.length), 0);
    return Array.from({ length: maxSessions }, (_, i) => {
      const point: Record<string, string | number> = { label: `Session ${i + 1}` };
      filteredSummaries.forEach(u => {
        point[u.unitCode] = u.sessions[i]?.attendancePercentage ?? 0;
      });
      return point;
    });
  }, [filteredSummaries]);

  // Line chart: per-unit average (single bar-style trend)
  const unitTrendData = useMemo(() =>
    filteredSummaries.map(u => ({ name: u.unitCode, avg: u.avgAttendance }))
  , [filteredSummaries]);

  const atRiskRows = useMemo(() => {
    const allRows = buildAtRiskRows(
      selectedCode === 'all' ? rawUnits : rawUnits.filter(u => u.unitCode === selectedCode)
    );
    const q = studentSearch.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.studentNumber.toLowerCase().includes(q) ||
      r.unit.toLowerCase().includes(q)
    );
  }, [rawUnits, selectedCode, studentSearch]);

  // Summary stats
  const totalStudents = useMemo(() => {
    const all = new Set<string>();
    filteredSummaries.forEach(u => u.students.forEach(s => all.add(s.studentNumber)));
    return all.size;
  }, [filteredSummaries]);

  const totalSessions = useMemo(() =>
    filteredSummaries.reduce((s, u) => s + u.sessions.length, 0)
  , [filteredSummaries]);

  const overallAvg = useMemo(() => {
    if (!filteredSummaries.length) return 0;
    return Math.round(filteredSummaries.reduce((s, u) => s + u.avgAttendance, 0) / filteredSummaries.length);
  }, [filteredSummaries]);

  // ── Export ──────────────────────────────────────────────────────────────────

  function handleExport() {
    const lines: string[] = [
      'AttendSync — Attendance Report',
      `Generated by: ${authSession?.user?.name ?? 'Lecturer'}`,
      `Date: ${new Date().toLocaleString()}`,
      `Filter: ${selectedCode === 'all' ? 'All Units' : selectedCode}`,
      '',
      '=== Unit Summary ===',
      ...filteredSummaries.map(u =>
        `${u.unitCode} | ${u.unitName} | Avg: ${u.avgAttendance}% | Students: ${u.students.length} | Sessions: ${u.sessions.length}`
      ),
      '',
      '=== At-Risk Students (<75%) ===',
      ...atRiskRows.map(r =>
        `${r.name} | ${r.studentNumber} | ${r.unit} | ${r.rate}% (${r.sessionsPresent}/${r.sessionsTotal}) | ${r.risk}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendsync_report_${selectedCode}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 size={22} className="animate-spin" />
        <span className="text-sm">Loading reports…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-8 text-center max-w-sm">
        <AlertTriangle size={28} className="mx-auto mb-3 text-red-500" />
        <p className="font-semibold text-red-700">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#E4002B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C70026]">
          Retry
        </button>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Analytics & Reports
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Real-time attendance insights, trends, and at-risk student tracking across your units.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
          >
            <Download size={16} /> Export Report
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Unit Filter</label>
            <select
              value={selectedCode}
              onChange={e => setSelectedCode(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              <option value="all">All Units</option>
              {unitSummaries.map(u => (
                <option key={u.unitCode} value={u.unitCode}>
                  {u.unitCode} — {u.unitName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Trend View</label>
            <select
              value={trendView}
              onChange={e => setTrendView(e.target.value as 'session' | 'unit')}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              <option value="session">Per Session</option>
              <option value="unit">Per Unit Average</option>
            </select>
          </div>
        </div>

        {unitSummaries.length === 0 && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No sessions recorded yet. Start a live attendance session to see data here.
          </div>
        )}
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Units', value: filteredSummaries.length, note: 'In current view', icon: <BookOpen size={18} className="text-gray-300" />, cls: 'text-gray-900' },
          { label: 'Avg Attendance', value: `${overallAvg}%`, note: 'Across selected units', icon: <BarChart3 size={18} className="text-green-400" />, cls: overallAvg >= 75 ? 'text-green-600' : 'text-red-600' },
          { label: 'At-Risk Students', value: buildAtRiskRows(selectedCode === 'all' ? rawUnits : rawUnits.filter(u => u.unitCode === selectedCode)).length, note: 'Below 75% threshold', icon: <ShieldAlert size={18} className="text-red-400" />, cls: 'text-red-600' },
          { label: 'Total Students', value: totalStudents, note: `Across ${totalSessions} sessions`, icon: <Users size={18} className="text-gray-300" />, cls: 'text-gray-900' },
        ].map(({ label, value, note, icon, cls }) => (
          <div key={label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
              {icon}
            </div>
            <p className={`text-4xl font-black tracking-tight ${cls}`}>{value}</p>
            <p className="mt-2 text-xs text-gray-500">{note}</p>
          </div>
        ))}
      </section>

      {/* Charts */}
      {unitSummaries.length > 0 && (
        <section className="grid gap-6 xl:grid-cols-2">

          {/* Bar chart — attendance per unit */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Attendance by Unit</h2>
                <p className="mt-1 text-xs text-gray-400">Average across all sessions per unit</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> ≥75%</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt;75%</span>
              </div>
            </div>

            {barData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">No session data yet</div>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                      <Tooltip
                        formatter={(v, _name, props) => [`${v}%`, props.payload.name]}
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      />
                      <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 3" label={{ value: '75%', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                      <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.attendance >= 75 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-center text-xs">
                  <div>
                    <p className="font-bold text-green-600">{barData.filter(d => d.attendance >= 75).length} unit{barData.filter(d => d.attendance >= 75).length !== 1 ? 's' : ''}</p>
                    <p className="mt-0.5 text-gray-400">Above threshold</p>
                  </div>
                  <div>
                    <p className="font-bold text-red-600">{barData.filter(d => d.attendance < 75).length} unit{barData.filter(d => d.attendance < 75).length !== 1 ? 's' : ''}</p>
                    <p className="mt-0.5 text-gray-400">Below threshold</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{overallAvg}%</p>
                    <p className="mt-0.5 text-gray-400">Overall avg</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Line chart — trend */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Attendance Trend</h2>
                <p className="mt-1 text-xs text-gray-400">
                  {trendView === 'session' ? 'Attendance % per recorded session' : 'Average per unit comparison'}
                </p>
              </div>
              <div className="flex rounded-xl border border-gray-100 bg-gray-50 p-1 text-xs">
                <button
                  onClick={() => setTrendView('session')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${trendView === 'session' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Per Session
                </button>
                <button
                  onClick={() => setTrendView('unit')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${trendView === 'unit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Per Unit
                </button>
              </div>
            </div>

            {(trendView === 'session' ? sessionTrendData : unitTrendData).length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">No session data yet</div>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {trendView === 'session' ? (
                      <LineChart data={sessionTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(v) => [`${v}%`]} />
                        <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 3" />
                        {filteredSummaries.map((u, i) => (
                          <Line
                            key={u.unitCode}
                            type="monotone"
                            dataKey={u.unitCode}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    ) : (
                      <BarChart data={unitTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                        <Tooltip formatter={v => [`${v}%`, 'Avg Attendance']} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                        <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 3" />
                        <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                          {unitTrendData.map((entry, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                {trendView === 'session' && filteredSummaries.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                    {filteredSummaries.map((u, i) => (
                      <span key={u.unitCode} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {u.unitCode}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Unit breakdown table */}
      {filteredSummaries.length > 0 && (
        <section className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-bold text-gray-900">Unit Breakdown</h2>
            <p className="mt-1 text-xs text-gray-400">Summary across all class groups</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Unit Code', 'Unit Name', 'Students', 'Sessions', 'Present', 'Absent', 'Avg Attendance'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSummaries.map(u => (
                  <tr key={u.unitCode} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-[#E4002B]">{u.unitCode}</span>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">{u.unitName}</td>
                    <td className="px-5 py-4 text-gray-600">{u.students.length}</td>
                    <td className="px-5 py-4 text-gray-600">{u.sessions.length}</td>
                    <td className="px-5 py-4 font-semibold text-green-600">{u.totalPresent}</td>
                    <td className="px-5 py-4 font-semibold text-red-500">{u.totalAbsent}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${u.avgAttendance >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${u.avgAttendance}%` }}
                          />
                        </div>
                        <span className={`font-bold text-sm ${u.avgAttendance >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                          {u.avgAttendance}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* At-risk table */}
      <section className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <AlertTriangle size={16} className="text-red-500" />
              At-Risk Students
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                &lt;75%
              </span>
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Students below the 75% attendance threshold
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID or unit…"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#E4002B] focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Student Name', 'Student ID', 'Unit', 'Attendance', 'Sessions', 'Risk Level'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {atRiskRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    {rawUnits.length === 0
                      ? 'No session data yet — start a live attendance session first.'
                      : studentSearch
                        ? 'No students matched your search.'
                        : 'No at-risk students found for this filter. Great job! 🎉'}
                  </td>
                </tr>
              ) : (
                atRiskRows.map((r, i) => (
                  <tr key={`${r.studentNumber}-${r.unit}-${i}`} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{r.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{r.studentNumber}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{r.unit}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${r.rate < 50 ? 'bg-red-500' : 'bg-amber-400'}`}
                            style={{ width: `${r.rate}%` }}
                          />
                        </div>
                        <span className={`font-bold text-sm ${r.rate < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                          {r.rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {r.sessionsPresent} / {r.sessionsTotal}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        r.risk === 'High Risk'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.risk}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {atRiskRows.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
            Showing {atRiskRows.length} student{atRiskRows.length !== 1 ? 's' : ''} below the 75% threshold
          </div>
        )}
      </section>

      {/* Insight cards */}
      {filteredSummaries.length > 0 && (() => {
        const sorted = [...filteredSummaries].sort((a, b) => a.avgAttendance - b.avgAttendance);
        const lowest  = sorted[0];
        const highest = sorted[sorted.length - 1];
        const highRisk = buildAtRiskRows(selectedCode === 'all' ? rawUnits : rawUnits.filter(u => u.unitCode === selectedCode)).filter(r => r.risk === 'High Risk').length;

        return (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-gradient-to-br from-red-600 to-red-700 p-5 text-white shadow-md shadow-red-100">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">Needs Attention</p>
              <p className="text-lg font-bold leading-snug">
                {lowest
                  ? `${lowest.unitCode} has the lowest attendance at ${lowest.avgAttendance}%.`
                  : 'No data yet.'}
              </p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-md shadow-orange-100">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">At-Risk Count</p>
              <p className="text-lg font-bold leading-snug">
                {highRisk > 0
                  ? `${highRisk} student${highRisk !== 1 ? 's' : ''} are High Risk and below 50% attendance.`
                  : 'No high-risk students detected right now.'}
              </p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-green-600 to-emerald-600 p-5 text-white shadow-md shadow-green-100">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">Best Performing</p>
              <p className="text-lg font-bold leading-snug">
                {highest
                  ? `${highest.unitCode} leads with ${highest.avgAttendance}% average attendance.`
                  : 'No data yet.'}
              </p>
            </div>
          </section>
        );
      })()}

    </div>
  );
}
