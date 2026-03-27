'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileDown,
  MapPin,
  PlayCircle,
  Search,
  Users,
  XCircle,
} from 'lucide-react';

type SessionType = 'Lecture' | 'Tutorial' | 'Lab';
type SessionStatus = 'Completed' | 'Ongoing' | 'Scheduled';
type AttendanceMark = 'Present' | 'Absent' | 'Late' | 'Sick';

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

type StudentAttendanceRow = Student & {
  attendance: AttendanceMark;
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
        name: 'John Doe',
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
    ],
  },
];

function mapClassTypeToSessionType(classType?: string): SessionType {
  const value = (classType || '').toLowerCase();
  if (value.includes('lab')) return 'Lab';
  if (value.includes('tutorial') || value.includes('tu')) return 'Tutorial';
  return 'Lecture';
}

function getStatusBadge(status: AttendanceMark) {
  switch (status) {
    case 'Present':
      return 'border-green-100 bg-green-50 text-green-700';
    case 'Absent':
      return 'border-red-100 bg-red-50 text-red-600';
    case 'Late':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'Sick':
      return 'border-blue-100 bg-blue-50 text-blue-700';
    default:
      return 'border-gray-100 bg-gray-50 text-gray-700';
  }
}

function getSessionBadge(type?: string) {
  switch (type) {
    case 'Lecture':
      return 'border-blue-100 bg-blue-50 text-blue-700';
    case 'Tutorial':
      return 'border-rose-100 bg-rose-50 text-[#E4002B]';
    case 'Lab':
      return 'border-purple-100 bg-purple-50 text-purple-700';
    default:
      return 'border-gray-100 bg-gray-50 text-gray-700';
  }
}

export default function LecturerAttendancePage() {
  const [classes, setClasses] = useState<LecturerClass[]>(INITIAL_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    INITIAL_CLASSES[0]?.id ?? ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);

  const [attendanceRows, setAttendanceRows] = useState<StudentAttendanceRow[]>([]);

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

      if (!selectedClassId && importedClasses[0]?.id) {
        setSelectedClassId(importedClasses[0].id);
      }
    } catch (error) {
      console.error('Failed to load imported classes:', error);
    }
  }, [selectedClassId]);

  const selectedClass =
    classes.find((item) => item.id === selectedClassId) ?? classes[0] ?? null;

  useEffect(() => {
    if (!selectedClass) {
      setAttendanceRows([]);
      return;
    }

    const rows: StudentAttendanceRow[] = selectedClass.students.map((student) => ({
      ...student,
      attendance: 'Absent',
    }));

    setAttendanceRows(rows);
    setSessionStarted(false);
  }, [selectedClassId, selectedClass]);

  const filteredRows = useMemo(() => {
    return attendanceRows.filter((item) => {
      return (
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.program.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [attendanceRows, searchTerm]);

  const counts = useMemo(() => {
    const present = attendanceRows.filter((item) => item.attendance === 'Present').length;
    const absent = attendanceRows.filter((item) => item.attendance === 'Absent').length;
    const late = attendanceRows.filter((item) => item.attendance === 'Late').length;
    const sick = attendanceRows.filter((item) => item.attendance === 'Sick').length;

    const total = attendanceRows.length;
    const attendanceRate =
      total > 0 ? Math.round(((present + late + sick) / total) * 100) : 0;

    return { present, absent, late, sick, total, attendanceRate };
  }, [attendanceRows]);

  const handleMarkAttendance = (studentId: string, value: AttendanceMark) => {
    setAttendanceRows((prev) =>
      prev.map((item) =>
        item.id === studentId ? { ...item, attendance: value } : item
      )
    );
  };

  const handleStartSession = () => {
    setSessionStarted(true);
  };

  const handleExportCsv = () => {
    if (!selectedClass) return;

    const rows = [
      ['Unit Code', selectedClass.unitCode],
      ['Unit Name', selectedClass.unitName],
      ['Lecturer', selectedClass.lecturer || ''],
      ['Day', selectedClass.day],
      ['Time', selectedClass.time],
      ['Venue', selectedClass.location],
      [],
      ['Student Number', 'Student Name', 'Program', 'Attendance'],
      ...attendanceRows.map((item) => [
        item.studentNumber,
        item.name,
        item.program,
        item.attendance,
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute(
      'download',
      `${selectedClass.unitCode}_attendance_export.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!selectedClass) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          No lecturer class available
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-500">
          Please create or import a class first.
        </p>
      </div>
    );
  }

  const selectedSessionType =
    selectedClass.sessionType || mapClassTypeToSessionType(selectedClass.classType);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Attendance
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Manage live class attendance and keep the selected unit tracked clearly.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/classes"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ArrowLeft size={16} />
            Back to Classes
          </Link>

          <button
            type="button"
            onClick={handleStartSession}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
          >
            <PlayCircle size={16} />
            {sessionStarted ? 'Session Active' : 'Start Session'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <FileDown size={16} />
            Export CSV
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <label
              htmlFor="selected-class"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Select Unit
            </label>
            <select
              id="selected-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.unitCode} - {item.unitName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="student-search"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Search Student
            </label>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="student-search"
                type="text"
                placeholder="Search by student number, name, or program"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Selected Unit
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">
            {selectedClass.unitCode}
          </p>
          <p className="mt-2 text-xs text-gray-500">{selectedClass.unitName}</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Present / Valid
          </p>
          <p className="mt-3 text-4xl font-black tracking-tight text-green-600">
            {counts.present + counts.late + counts.sick}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Present, late, and sick counted
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Absent
          </p>
          <p className="mt-3 text-4xl font-black tracking-tight text-red-600">
            {counts.absent}
          </p>
          <p className="mt-2 text-xs text-gray-500">Students not marked present</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Attendance Rate
          </p>
          <p className="mt-3 text-4xl font-black tracking-tight text-[#E4002B]">
            {counts.attendanceRate}%
          </p>
          <p className="mt-2 text-xs text-gray-500">For currently selected unit</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                {selectedClass.unitCode}
              </span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionBadge(
                  selectedSessionType
                )}`}
              >
                {selectedSessionType}
              </span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                  sessionStarted
                    ? 'border-green-100 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                {sessionStarted ? 'Session Active' : 'Not Started'}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-gray-900">
              {selectedClass.unitName}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoBox icon={<CalendarDays size={14} />} label="Day" value={selectedClass.day} />
              <InfoBox icon={<Clock3 size={14} />} label="Time" value={selectedClass.time} />
              <InfoBox icon={<MapPin size={14} />} label="Venue" value={selectedClass.location} />
              <InfoBox icon={<Users size={14} />} label="Students" value={String(selectedClass.students.length)} />
            </div>

            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-bold text-[#E4002B]">Tracked Unit Note</p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                All attendance marks on this page are currently tracked against
                <strong> {selectedClass.unitCode}</strong>.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">Quick Links</h3>
            <p className="mt-1 text-sm text-gray-500">
              Continue lecturer workflow for this unit
            </p>

            <div className="mt-4 space-y-3">
              <Link
                href="/lecturer/classes"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span>Manage Classes</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/lecturer/upload-roster"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span>Upload Roster</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/lecturer/reports"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <span>Open Reports</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-bold text-gray-900">Student Attendance List</h2>
            <p className="mt-1 text-sm text-gray-500">
              Mark attendance for the selected unit
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredRows.length > 0 ? (
              filteredRows.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{student.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {student.studentNumber}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{student.program}</p>

                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadge(
                          student.attendance
                        )}`}
                      >
                        {student.attendance}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAttendance(student.id, 'Present')}
                      className="rounded-2xl border border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                    >
                      Present
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkAttendance(student.id, 'Late')}
                      className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Late
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkAttendance(student.id, 'Sick')}
                      className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Sick
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkAttendance(student.id, 'Absent')}
                      className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center">
                <h3 className="text-lg font-bold text-gray-900">
                  No students found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try changing the search keyword.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}