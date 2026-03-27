'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  Search,
} from 'lucide-react';

type SessionType = 'Lecture' | 'Tutorial' | 'Lab';
type SessionStatus = 'Completed' | 'Ongoing' | 'Scheduled';

type Student = {
  id: string;
  studentNumber: string;
  name: string;
  program: string;
  nationality: string;
  schoolStatus: string;
};

type Session = {
  id: string;
  date: string;
  time: string;
  venue: string;
  attendancePercentage: number;
  status: SessionStatus;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  sickCount: number;
};

type LecturerClass = {
  id: string;
  unitCode: string;
  unitName: string;
  day: string;
  time: string;
  location: string;
  lecturer?: string;
  classType?: string;
  group?: string;
  term?: string;
  sessionType?: SessionType;
  students: Student[];
  sessions: Session[];
  createdAt: string;
};

const INITIAL_CLASSES: LecturerClass[] = [
  {
    id: 'cls-1',
    unitCode: 'COS40005',
    unitName: 'Computing Technology Project A',
    day: 'Monday',
    time: '09:00 - 11:00',
    location: 'A304',
    lecturer: 'Jason Thomas Chew',
    classType: 'Tutorial',
    group: '01',
    term: '2026_MAR_S1',
    sessionType: 'Tutorial',
    createdAt: '2026-03-01',
    students: [
      {
        id: 'st-1',
        studentNumber: '102788856',
        name: 'Ally',
        program: 'Bachelor of Computer Science',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
      {
        id: 'st-2',
        studentNumber: '102788857',
        name: 'Nur Aisyah Binti Ahmad',
        program: 'Bachelor of Computer Science',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
      {
        id: 'st-3',
        studentNumber: '102788858',
        name: 'Lee Wen Hao',
        program: 'Bachelor of Computer Science',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
    ],
    sessions: [
      {
        id: 'se-1',
        date: '19 Mar 2026',
        time: '09:00 - 11:00',
        venue: 'A304',
        attendancePercentage: 89,
        status: 'Completed',
        presentCount: 25,
        absentCount: 2,
        lateCount: 1,
        sickCount: 0,
      },
      {
        id: 'se-2',
        date: '26 Mar 2026',
        time: '09:00 - 11:00',
        venue: 'A304',
        attendancePercentage: 68,
        status: 'Ongoing',
        presentCount: 19,
        absentCount: 8,
        lateCount: 1,
        sickCount: 0,
      },
    ],
  },
  {
    id: 'cls-2',
    unitCode: 'SWE30003',
    unitName: 'Software Architecture and Design',
    day: 'Thursday',
    time: '14:00 - 16:00',
    location: 'C102',
    lecturer: 'Siti Khatijah Bolhassan',
    classType: 'Lecture',
    group: 'LE1',
    term: '2026_MAR_S1',
    sessionType: 'Lecture',
    createdAt: '2026-03-02',
    students: [
      {
        id: 'st-4',
        studentNumber: '102799101',
        name: 'Muhammad Danish',
        program: 'Bachelor of Software Engineering',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
      {
        id: 'st-5',
        studentNumber: '102799102',
        name: 'Chloe Ting',
        program: 'Bachelor of Software Engineering',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
    ],
    sessions: [
      {
        id: 'se-3',
        date: '20 Mar 2026',
        time: '14:00 - 16:00',
        venue: 'C102',
        attendancePercentage: 84,
        status: 'Completed',
        presentCount: 44,
        absentCount: 7,
        lateCount: 2,
        sickCount: 0,
      },
      {
        id: 'se-4',
        date: '27 Mar 2026',
        time: '14:00 - 16:00',
        venue: 'C102',
        attendancePercentage: 79,
        status: 'Completed',
        presentCount: 41,
        absentCount: 8,
        lateCount: 3,
        sickCount: 1,
      },
    ],
  },
  {
    id: 'cls-3',
    unitCode: 'COS30049',
    unitName: 'Computing Technology Innovation Project',
    day: 'Tuesday',
    time: '10:00 - 12:00',
    location: 'B203',
    lecturer: 'Elaine Yeu Yee Lee',
    classType: 'Lecture',
    group: '01',
    term: '2026_MAR_S1',
    sessionType: 'Lecture',
    createdAt: '2026-03-04',
    students: [
      {
        id: 'st-6',
        studentNumber: '102700001',
        name: 'Alya Sofia',
        program: 'Bachelor of Computer Science',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
      {
        id: 'st-7',
        studentNumber: '102700002',
        name: 'Brandon Lim',
        program: 'Bachelor of Information Technology',
        nationality: 'Malaysian',
        schoolStatus: 'Current',
      },
    ],
    sessions: [
      {
        id: 'se-5',
        date: '18 Mar 2026',
        time: '10:00 - 12:00',
        venue: 'B203',
        attendancePercentage: 84,
        status: 'Completed',
        presentCount: 34,
        absentCount: 5,
        lateCount: 2,
        sickCount: 0,
      },
      {
        id: 'se-6',
        date: '25 Mar 2026',
        time: '10:00 - 12:00',
        venue: 'B203',
        attendancePercentage: 90,
        status: 'Completed',
        presentCount: 37,
        absentCount: 2,
        lateCount: 1,
        sickCount: 1,
      },
    ],
  },
];

function averageAttendanceForClass(item: LecturerClass) {
  if (!item.sessions.length) return 0;
  return Math.round(
    item.sessions.reduce((sum, session) => sum + session.attendancePercentage, 0) /
      item.sessions.length
  );
}

function riskLabel(rate: number) {
  if (rate < 50) return 'High Risk';
  if (rate < 75) return 'Medium';
  return 'Stable';
}

export default function ReportsAnalytics() {
  const { data: session } = useSession();

  const [classes, setClasses] = useState<LecturerClass[]>(INITIAL_CLASSES);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'semester'>(
    'weekly'
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    try {
      const importedRaw = localStorage.getItem('lecturerImportedClasses');
      if (!importedRaw) return;

      const importedClasses: LecturerClass[] = JSON.parse(importedRaw);
      if (!Array.isArray(importedClasses) || importedClasses.length === 0) return;

      setClasses((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueImported = importedClasses.filter(
          (item) => !existingIds.has(item.id)
        );
        return [...uniqueImported, ...prev];
      });
    } catch (error) {
      console.error('Failed to load imported classes:', error);
    }
  }, []);

  const filteredClasses = useMemo(() => {
    if (selectedUnitId === 'all') return classes;
    return classes.filter((item) => item.id === selectedUnitId);
  }, [classes, selectedUnitId]);

  const classAttendanceData = useMemo(() => {
    return filteredClasses.map((item) => ({
      name: item.unitCode,
      attendance: averageAttendanceForClass(item),
      students: item.students.length,
      unitName: item.unitName,
    }));
  }, [filteredClasses]);

  const weeklyTrendData = useMemo(() => {
    const maxSessions = Math.max(
      ...filteredClasses.map((item) => item.sessions.length),
      0
    );

    return Array.from({ length: maxSessions }, (_, index) => {
      const point: Record<string, string | number> = {
        week: `Week ${index + 1}`,
      };

      filteredClasses.forEach((item) => {
        point[item.unitCode] = item.sessions[index]?.attendancePercentage ?? null;
      });

      return point;
    });
  }, [filteredClasses]);

  const monthlyTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    return monthNames.map((month, index) => {
      const values = filteredClasses
        .map((item) => item.sessions[index]?.attendancePercentage)
        .filter((value): value is number => typeof value === 'number');

      const overall =
        values.length > 0
          ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
          : 0;

      return { month, overall };
    });
  }, [filteredClasses]);

  const studentBreakdown = useMemo(() => {
    const rows = filteredClasses.flatMap((item) => {
      const average = averageAttendanceForClass(item);

      return item.students.map((student, index) => {
        const adjustment = (index % 4) * 7;
        const attendance = Math.max(35, Math.min(98, average - adjustment));
        const totalClasses = item.sessions.length > 0 ? item.sessions.length * 2 + 2 : 6;
        const attendedClasses = Math.max(
          0,
          Math.round((attendance / 100) * totalClasses)
        );

        return {
          name: student.name,
          id: student.studentNumber,
          unit: item.unitCode,
          attendance,
          classesAttended: `${attendedClasses}/${totalClasses}`,
          status: riskLabel(attendance),
        };
      });
    });

    return rows.filter((row) => {
      const matchesRisk = row.attendance < 75;
      const matchesSearch =
        row.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        row.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
        row.unit.toLowerCase().includes(studentSearch.toLowerCase());

      return matchesRisk && matchesSearch;
    });
  }, [filteredClasses, studentSearch]);

  const stats = useMemo(() => {
    const totalClasses = filteredClasses.length;
    const totalStudents = filteredClasses.reduce(
      (sum, item) => sum + item.students.length,
      0
    );

    const averages = filteredClasses.map((item) => averageAttendanceForClass(item));
    const avgAttendance =
      averages.length > 0
        ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length)
        : 0;

    const highRiskCount = studentBreakdown.filter(
      (item) => item.status === 'High Risk'
    ).length;
    const mediumRiskCount = studentBreakdown.filter(
      (item) => item.status === 'Medium'
    ).length;

    return {
      totalClasses,
      totalStudents,
      avgAttendance,
      atRiskCount: studentBreakdown.length,
      highRiskCount,
      mediumRiskCount,
    };
  }, [filteredClasses, studentBreakdown]);

  const selectedUnit = useMemo(() => {
    if (selectedUnitId === 'all') return null;
    return classes.find((item) => item.id === selectedUnitId) ?? null;
  }, [classes, selectedUnitId]);

  const handleExportReport = () => {
    const lines: string[] = [];

    lines.push('Lecturer Reports Export');
    lines.push(`Generated by: ${session?.user?.name ?? 'Lecturer'}`);
    lines.push(`Selected Unit: ${selectedUnit ? `${selectedUnit.unitCode} - ${selectedUnit.unitName}` : 'All Units'}`);
    lines.push(`Average Attendance: ${stats.avgAttendance}%`);
    lines.push(`At-Risk Students: ${stats.atRiskCount}`);
    lines.push('');

    lines.push('Unit Summary');
    classAttendanceData.forEach((item) => {
      lines.push(`${item.name}: ${item.attendance}% (${item.students} students)`);
    });

    lines.push('');
    lines.push('At-Risk Students');
    studentBreakdown.forEach((item) => {
      lines.push(
        `${item.name} | ${item.id} | ${item.unit} | ${item.attendance}% | ${item.classesAttended} | ${item.status}`
      );
    });

    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = selectedUnit
      ? `${selectedUnit.unitCode}_report.txt`
      : 'lecturer_reports.txt';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const insightCards = useMemo(() => {
    const lowest = classAttendanceData
      .slice()
      .sort((a, b) => a.attendance - b.attendance)[0];
    const highest = classAttendanceData
      .slice()
      .sort((a, b) => b.attendance - a.attendance)[0];

    return [
      {
        title: 'Critical Insight',
        body: lowest
          ? `${lowest.name} currently has the lowest tracked attendance at ${lowest.attendance}%.`
          : 'No class insight available yet.',
        theme: 'from-red-600 to-red-700',
      },
      {
        title: 'Pattern Detected',
        body:
          timeRange === 'weekly'
            ? 'Weekly trend view helps compare attendance changes across units.'
            : 'Monthly trend view helps observe broader attendance movement over time.',
        theme: 'from-orange-500 to-orange-600',
      },
      {
        title: 'Positive Trend',
        body: highest
          ? `${highest.name} is the strongest tracked unit at ${highest.attendance}% average attendance.`
          : 'No positive trend available yet.',
        theme: 'from-green-600 to-green-700',
      },
    ];
  }, [classAttendanceData, timeRange]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Analytics & Reports
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Decision-making dashboard for attendance insights, class tracking, and
            at-risk student review.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div>
            <label
              htmlFor="student-search"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Search at-risk students
            </label>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="student-search"
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by student name, ID, or unit"
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="selected-unit"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Tracked Unit
            </label>
            <select
              id="selected-unit"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              <option value="all">All Units</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.unitCode} - {item.unitName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="time-range"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Trend View
            </label>
            <select
              id="time-range"
              value={timeRange}
              onChange={(e) =>
                setTimeRange(e.target.value as 'weekly' | 'monthly' | 'semester')
              }
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
              <option value="semester">Semester View</option>
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-gray-700">
          <span className="font-semibold text-[#E4002B]">Tracked unit:</span>{' '}
          {selectedUnit
            ? `${selectedUnit.unitCode} - ${selectedUnit.unitName}`
            : 'All units currently loaded in lecturer pages'}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Classes"
          value={stats.totalClasses}
          note="Active in current view"
        />
        <MetricCard
          label="Avg Attendance"
          value={`${stats.avgAttendance}%`}
          note="Based on tracked sessions"
          valueClassName="text-green-600"
        />
        <MetricCard
          label="At-Risk Students"
          value={stats.atRiskCount}
          note={`${stats.highRiskCount} High · ${stats.mediumRiskCount} Medium`}
          valueClassName="text-red-600"
        />
        <MetricCard
          label="Total Students"
          value={stats.totalStudents}
          note="Across selected units"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-base sm:text-lg">
              Attendance % by Unit
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span>Below 75%</span>
              <span className="ml-2 h-3 w-3 rounded-full bg-green-500" />
              <span>75% and above</span>
            </div>
          </div>

          <div className="h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classAttendanceData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Attendance']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <ReferenceLine
                  y={75}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Risk Threshold (75%)',
                    position: 'right',
                    fill: '#ef4444',
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                  {classAttendanceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance >= 75 ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-center text-xs text-gray-600">
            <div>
              <p className="font-semibold text-green-600">
                {classAttendanceData.filter((item) => item.attendance >= 75).length}{' '}
                Units
              </p>
              <p>Above threshold</p>
            </div>
            <div>
              <p className="font-semibold text-red-600">
                {classAttendanceData.filter((item) => item.attendance < 75).length}{' '}
                Units
              </p>
              <p>Below threshold</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Lowest:{' '}
                {classAttendanceData.length > 0
                  ? classAttendanceData.slice().sort((a, b) => a.attendance - b.attendance)[0]
                      .name
                  : 'N/A'}
              </p>
              <p>
                {classAttendanceData.length > 0
                  ? `${classAttendanceData
                      .slice()
                      .sort((a, b) => a.attendance - b.attendance)[0].attendance}% attendance`
                  : 'No data'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-base sm:text-lg">Attendance Trends</h2>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setTimeRange('weekly')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeRange === 'weekly'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeRange('monthly')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeRange === 'monthly'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {timeRange === 'weekly' || timeRange === 'semester' ? (
                <LineChart
                  data={weeklyTrendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    domain={[60, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" />
                  {filteredClasses.map((item, index) => {
                    const colors = ['#ef4444', '#6366f1', '#14b8a6', '#ec4899', '#f59e0b', '#8b5cf6'];
                    return (
                      <Line
                        key={item.id}
                        type="monotone"
                        dataKey={item.unitCode}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={item.unitCode}
                      />
                    );
                  })}
                </LineChart>
              ) : (
                <LineChart
                  data={monthlyTrendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    domain={[70, 95]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Overall Attendance']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{
                      value: '75% Threshold',
                      position: 'right',
                      fill: '#ef4444',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="#dc2626"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#dc2626' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            {timeRange === 'weekly' || timeRange === 'semester' ? (
              filteredClasses.map((item) => (
                <span key={item.id} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  {item.unitCode}
                </span>
              ))
            ) : (
              <p className="text-gray-500">
                Broader monthly attendance pattern for the current report view
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <span className="text-red-500">⚠️</span> At-Risk Students (&lt;75% Attendance)
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/lecturer/classes"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
            >
              Filter by Unit
            </Link>
            <button className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200 transition-colors">
              Send Alerts
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-3 text-left font-medium">Student Name</th>
                <th className="py-3 text-left font-medium">Student ID</th>
                <th className="py-3 text-left font-medium">Unit</th>
                <th className="py-3 text-left font-medium">Attendance %</th>
                <th className="py-3 text-left font-medium">Classes Attended</th>
                <th className="py-3 text-left font-medium">Risk Level</th>
                <th className="py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {studentBreakdown.length > 0 ? (
                studentBreakdown.map((student) => (
                  <tr
                    key={`${student.id}-${student.unit}`}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 font-medium text-gray-900">{student.name}</td>
                    <td className="py-3 font-mono text-xs text-gray-600">{student.id}</td>
                    <td className="py-3 text-gray-600">{student.unit}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            student.attendance < 50
                              ? 'text-red-600'
                              : student.attendance < 65
                              ? 'text-orange-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {student.attendance}%
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${
                              student.attendance < 50
                                ? 'bg-red-500'
                                : student.attendance < 65
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${student.attendance}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">{student.classesAttended}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${
                          student.status === 'High Risk'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link
                        href="/lecturer/attendance"
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        View Attendance →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    No at-risk students found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-gray-500">
          <p>
            Showing {studentBreakdown.length} at-risk students out of {stats.totalStudents}{' '}
            total in the current view
          </p>
          <div className="flex gap-2">
            <button className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
              Previous
            </button>
            <button className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {insightCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-xl bg-gradient-to-br ${card.theme} p-5 text-white shadow-md`}
          >
            <p className="mb-2 text-xs uppercase tracking-wide opacity-90">
              {card.title}
            </p>
            <p className="text-lg font-semibold">{card.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  valueClassName = 'text-gray-900',
}: {
  label: string;
  value: string | number;
  note: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className={`mt-3 text-4xl font-black tracking-tight ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-500">{note}</p>
    </div>
  );
}