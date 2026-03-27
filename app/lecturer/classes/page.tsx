'use client';

import Link from 'next/link';
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileSpreadsheet,
  MapPin,
  Plus,
  Search,
  Upload,
  Users,
  X,
} from 'lucide-react';

type SessionType = 'Lecture' | 'Tutorial' | 'Lab';
type SessionStatus = 'Completed' | 'Ongoing' | 'Scheduled';
type ViewMode = 'list' | 'detail' | 'create' | 'upload';

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

type ParsedMetadata = {
  term?: string;
  unitCode?: string;
  unitName?: string;
  classType?: string;
  group?: string;
  day?: string;
  time?: string;
  room?: string;
  lecturer?: string;
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
        name: 'Emily Jong Hui Xiu',
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
        id: 'st-3',
        studentNumber: '102799101',
        name: 'Muhammad Danish',
        program: 'Bachelor of Software Engineering',
        nationality: '',
        schoolStatus: '',
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

function getSessionTypeClasses(type?: string) {
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

function getStatusClasses(status: SessionStatus) {
  switch (status) {
    case 'Completed':
      return 'border-green-100 bg-green-50 text-green-700';
    case 'Ongoing':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'Scheduled':
      return 'border-gray-200 bg-gray-50 text-gray-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

function getAttendanceTextClasses(rate: number) {
  if (rate >= 90) return 'text-green-600';
  if (rate >= 75) return 'text-amber-600';
  return 'text-red-600';
}

function mapClassTypeToSessionType(classType?: string): SessionType {
  const value = (classType || '').toLowerCase();

  if (value.includes('lab')) return 'Lab';
  if (value.includes('tutorial') || value.includes('tu')) return 'Tutorial';
  return 'Lecture';
}

export default function LecturerClassesPage() {
  const [classes, setClasses] = useState<LecturerClass[]>(INITIAL_CLASSES);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    INITIAL_CLASSES[0]?.id ?? null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | SessionType>('All');

  const [createForm, setCreateForm] = useState({
    unitCode: '',
    unitName: '',
    day: 'Monday',
    time: '',
    location: '',
    lecturer: '',
    classType: 'Lecture',
    group: '',
    term: '',
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string[][]>([]);
  const [uploadColumns, setUploadColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    studentId: '',
    name: '',
    program: '',
  });
  const [parsedMetadata, setParsedMetadata] = useState<ParsedMetadata>({});
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [isDragging, setIsDragging] = useState(false);

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

        if (uniqueImported.length === 0) return prev;

        return [...uniqueImported, ...prev];
      });

      setSelectedClassId((prevSelectedId) => {
        if (prevSelectedId) return prevSelectedId;
        return importedClasses[0]?.id ?? INITIAL_CLASSES[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to load imported classes from localStorage:', error);
    }
  }, []);

  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      const matchesSearch =
        item.unitCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.lecturer || '').toLowerCase().includes(searchTerm.toLowerCase());

      const classSessionType =
        item.sessionType || mapClassTypeToSessionType(item.classType);
      const matchesType =
        selectedType === 'All' ? true : classSessionType === selectedType;

      return matchesSearch && matchesType;
    });
  }, [classes, searchTerm, selectedType]);

  const selectedClass =
    classes.find((item) => item.id === selectedClassId) ?? null;

  const stats = useMemo(() => {
    const totalStudents = classes.reduce((sum, item) => sum + item.students.length, 0);
    const totalSessions = classes.reduce((sum, item) => sum + item.sessions.length, 0);
    const avgAttendance =
      classes.length > 0
        ? Math.round(
            classes.reduce((sum, item) => {
              if (item.sessions.length === 0) return sum;
              const classAvg =
                item.sessions.reduce(
                  (inner, session) => inner + session.attendancePercentage,
                  0
                ) / item.sessions.length;
              return sum + classAvg;
            }, 0) / classes.length
          )
        : 0;

    return {
      totalStudents,
      totalSessions,
      classCount: classes.length,
      avgAttendance,
    };
  }, [classes]);

  const openClassDetail = (classId: string) => {
    setSelectedClassId(classId);
    setViewMode('detail');
  };

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadColumns([]);
    setColumnMapping({
      studentId: '',
      name: '',
      program: '',
    });
    setParsedMetadata({});
    setUploadStep(1);
    setIsDragging(false);
  };

  const handleCreateClass = () => {
    if (!createForm.unitCode.trim() || !createForm.unitName.trim()) return;

    const newClass: LecturerClass = {
      id: `class-${Date.now()}`,
      unitCode: createForm.unitCode.trim(),
      unitName: createForm.unitName.trim(),
      day: createForm.day.trim() || 'TBA',
      time: createForm.time.trim() || 'TBA',
      location: createForm.location.trim() || 'TBA',
      lecturer: createForm.lecturer.trim() || 'TBA',
      classType: createForm.classType.trim() || 'Lecture',
      group: createForm.group.trim() || '',
      term: createForm.term.trim() || '',
      sessionType: mapClassTypeToSessionType(createForm.classType),
      students: [],
      sessions: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setClasses((prev) => [newClass, ...prev]);
    setSelectedClassId(newClass.id);
    setCreateForm({
      unitCode: '',
      unitName: '',
      day: 'Monday',
      time: '',
      location: '',
      lecturer: '',
      classType: 'Lecture',
      group: '',
      term: '',
    });
    setViewMode('detail');
  };

  const parseAttendanceWorkbook = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      window.alert('Please upload an Excel file (.xlsx or .xls).');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const allRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
        }) as (string | number | null)[][];

        if (allRows.length < 7) {
          window.alert(
            'The file does not contain enough rows for the attendance format.'
          );
          return;
        }

        const row4 = allRows[2] || [];
        const row5 = allRows[3] || [];
        const row6 = allRows[4] || [];
        const row7 = allRows[5] || [];

        const row4Text = row4.map(String).join(' ');
        const row5Parts = row5
          .map((value) => String(value ?? '').trim())
          .filter((value) => value.length > 0);

        const termMatch = row4Text.match(/Term\s*:\s*([^,]+)/i);
        const term = termMatch ? termMatch[1].trim() : '';

        let unitCode = '';
        let unitName = '';

        const unitMatch = row4Text.match(/Unit\s*:?\s*([A-Z0-9]+)\s*-\s*(.+)$/i);
        if (unitMatch) {
          unitCode = unitMatch[1].trim();
          unitName = unitMatch[2].trim();
        } else if (row4Text.includes('Unit')) {
          const unitPart = row4Text.split('Unit').pop()?.replace(':', '').trim() || '';
          const parts = unitPart.split('-');
          unitCode = parts[0]?.trim() || '';
          unitName = parts.slice(1).join('-').trim() || '';
        }

        const classType = row5Parts[0] || '';
        const group = row5Parts[1] || '';
        const day = row5Parts[2] || '';
        const time = row5Parts[3] || '';
        const room = row5Parts[4] || '';
        const lecturer = row5Parts[5] || '';

        const headers: string[] = [];
        const maxCols = Math.max(row6.length, row7.length);

        for (let index = 0; index < maxCols; index += 1) {
          const topValue = String(row6[index] ?? '').trim();
          const bottomValue = String(row7[index] ?? '').trim();

          if (index < 8) {
            if (index === 0) headers.push(topValue || 'Sl.No');
            else if (index === 1) headers.push(topValue || 'Student Number');
            else if (index === 2) headers.push('Empty');
            else if (index === 3) headers.push(topValue || 'Student Name');
            else if (index === 4) headers.push(topValue || 'Program');
            else if (index === 5) headers.push(topValue || 'Registered Course');
            else if (index === 6) headers.push(topValue || 'Nationality');
            else if (index === 7) headers.push(topValue || 'School Status');
          } else {
            if (topValue && topValue.includes('/')) {
              headers.push(`Week_${topValue.replace(/\//g, '_')}`);
            } else if (topValue) {
              headers.push(topValue);
            } else if (bottomValue && /^\d+$/.test(bottomValue)) {
              headers.push(`Week_${bottomValue}`);
            } else {
              headers.push(`Column_${index + 1}`);
            }
          }
        }

        const coreHeaders = headers.slice(0, 8);
        const studentRows = allRows.slice(6).map((row) => {
          const padded = [...row.map((value) => String(value ?? ''))];
          while (padded.length < headers.length) padded.push('');
          return padded.slice(0, 8);
        });

        const findColumn = (patterns: string[]) => {
          return (
            coreHeaders.find((header) =>
              patterns.some((pattern) =>
                header.toLowerCase().includes(pattern.toLowerCase())
              )
            ) || ''
          );
        };

        setParsedMetadata({
          term,
          unitCode,
          unitName,
          classType,
          group,
          day,
          time,
          room,
          lecturer,
        });
        setUploadColumns(coreHeaders);
        setUploadPreview(studentRows);
        setUploadFile(file);
        setColumnMapping({
          studentId: findColumn(['student number']),
          name: findColumn(['student name']),
          program: findColumn(['program']),
        });
        setUploadStep(2);
      } catch (error) {
        console.error(error);
        window.alert(
          'Error parsing Excel file. Please check that it follows the expected attendance format.'
        );
      }
    };

    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    if (!uploadFile) return;

    if (!columnMapping.studentId || !columnMapping.name) {
      window.alert('Please map at least Student ID and Name columns.');
      return;
    }

    const studentNumberCol = uploadColumns.indexOf(columnMapping.studentId);
    const nameCol = uploadColumns.indexOf(columnMapping.name);
    const programCol = columnMapping.program
      ? uploadColumns.indexOf(columnMapping.program)
      : -1;
    const nationalityCol = uploadColumns.findIndex((item) =>
      item.toLowerCase().includes('nationality')
    );
    const schoolStatusCol = uploadColumns.findIndex((item) =>
      item.toLowerCase().includes('school status')
    );

    const newStudents: Student[] = uploadPreview
      .filter((row) => row && row.length > 0 && row[0] !== '')
      .map((row, index) => {
        const studentNumber = String(row[studentNumberCol] ?? '').trim();
        const name = String(row[nameCol] ?? '').trim();

        if (!studentNumber || !name) return null;

        return {
          id: `student-${Date.now()}-${index}`,
          studentNumber,
          name,
          program:
            programCol >= 0 ? String(row[programCol] ?? '').trim() : '',
          nationality:
            nationalityCol >= 0 ? String(row[nationalityCol] ?? '').trim() : '',
          schoolStatus:
            schoolStatusCol >= 0 ? String(row[schoolStatusCol] ?? '').trim() : '',
        };
      })
      .filter((item): item is Student => item !== null);

    if (newStudents.length === 0) {
      window.alert('No valid students were found. Please check the column mappings.');
      return;
    }

    const importedClass: LecturerClass = {
      id: `class-${Date.now()}`,
      unitCode: parsedMetadata.unitCode || 'IMPORTED',
      unitName: parsedMetadata.unitName || 'Imported Class',
      day: parsedMetadata.day || 'TBA',
      time: parsedMetadata.time || 'TBA',
      location: parsedMetadata.room || 'TBA',
      lecturer: parsedMetadata.lecturer || 'TBA',
      classType: parsedMetadata.classType || 'Lecture',
      group: parsedMetadata.group || '',
      term: parsedMetadata.term || '',
      sessionType: mapClassTypeToSessionType(parsedMetadata.classType),
      students: newStudents,
      sessions: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setClasses((prev) => [importedClass, ...prev]);
    setSelectedClassId(importedClass.id);

    try {
      const existingRaw = localStorage.getItem('lecturerImportedClasses');
      const existing: LecturerClass[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [importedClass, ...existing];
      localStorage.setItem('lecturerImportedClasses', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save imported class to localStorage:', error);
    }

    resetUploadState();
    setViewMode('detail');
  };

  const removeStudent = (studentId: string) => {
    if (!selectedClass) return;

    setClasses((prev) =>
      prev.map((item) =>
        item.id === selectedClass.id
          ? {
              ...item,
              students: item.students.filter((student) => student.id !== studentId),
            }
          : item
      )
    );
  };

  const createSession = () => {
    if (!selectedClass) return;

    const newSession: Session = {
      id: `session-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: selectedClass.time || 'TBA',
      venue: selectedClass.location || 'TBA',
      attendancePercentage: 0,
      status: 'Scheduled',
      presentCount: 0,
      absentCount: selectedClass.students.length,
      lateCount: 0,
      sickCount: 0,
    };

    setClasses((prev) =>
      prev.map((item) =>
        item.id === selectedClass.id
          ? { ...item, sessions: [newSession, ...item.sessions] }
          : item
      )
    );
  };

  const deleteClass = (classId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this class?');
    if (!confirmed) return;

    setClasses((prev) => prev.filter((item) => item.id !== classId));

    try {
      const importedRaw = localStorage.getItem('lecturerImportedClasses');
      if (importedRaw) {
        const importedClasses: LecturerClass[] = JSON.parse(importedRaw);
        const updatedImported = importedClasses.filter((item) => item.id !== classId);
        localStorage.setItem(
          'lecturerImportedClasses',
          JSON.stringify(updatedImported)
        );
      }
    } catch (error) {
      console.error('Failed to update localStorage after delete:', error);
    }

    if (selectedClassId === classId) {
      const remaining = classes.filter((item) => item.id !== classId);
      setSelectedClassId(remaining[0]?.id ?? null);
      setViewMode('list');
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) parseAttendanceWorkbook(file);
  };

  const handleDragState = (
    event: DragEvent<HTMLLabelElement>,
    active: boolean
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(active);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) parseAttendanceWorkbook(file);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Classes
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Manage classes, import student rosters, review sessions, and view class
            details.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/upload-roster"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <Upload size={16} />
            Upload Roster Page
          </Link>

          <button
            type="button"
            onClick={() => {
              resetUploadState();
              setViewMode('upload');
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <Upload size={16} />
            Quick Upload Here
          </button>

          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <Plus size={16} />
            Create Class
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Classes
            </p>
            <BookOpen size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {stats.classCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">Lecturer teaching units</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Students
            </p>
            <Users size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {stats.totalStudents}
          </p>
          <p className="mt-2 text-xs text-gray-500">Across all classes</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total Sessions
            </p>
            <CalendarDays size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {stats.totalSessions}
          </p>
          <p className="mt-2 text-xs text-gray-500">Recorded class sessions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Avg. Attendance
            </p>
            <CheckCircle2 size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-[#E4002B]">
            {stats.avgAttendance}%
          </p>
          <p className="mt-2 text-xs text-gray-500">Sample overview rate</p>
        </div>
      </section>

      {viewMode === 'list' && (
        <>
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.5fr_220px]">
              <div>
                <label
                  htmlFor="class-search"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Search classes
                </label>

                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="class-search"
                    type="text"
                    placeholder="Search by unit code, unit name, or lecturer"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="class-type-filter"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Filter by type
                </label>

                <select
                  id="class-type-filter"
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.target.value as 'All' | SessionType)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                >
                  <option value="All">All</option>
                  <option value="Lecture">Lecture</option>
                  <option value="Tutorial">Tutorial</option>
                  <option value="Lab">Lab</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {filteredClasses.length > 0 ? (
              filteredClasses.map((item) => {
                const classSessionType =
                  item.sessionType || mapClassTypeToSessionType(item.classType);

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                            {item.unitCode}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionTypeClasses(
                              classSessionType
                            )}`}
                          >
                            {classSessionType}
                          </span>
                        </div>

                        <h2 className="text-xl font-black tracking-tight text-gray-900">
                          {item.unitName}
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                          Lecturer: {item.lecturer || 'TBA'}
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              <CalendarDays size={14} />
                              Day
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.day}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              <Clock3 size={14} />
                              Time
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.time}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              <MapPin size={14} />
                              Venue
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.location}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              <Users size={14} />
                              Students
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.students.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full xl:w-[240px]">
                        <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E4002B]">
                            Class Overview
                          </p>

                          <p
                            className={`mt-3 text-4xl font-black tracking-tight ${getAttendanceTextClasses(
                              item.sessions.length > 0
                                ? Math.round(
                                    item.sessions.reduce(
                                      (sum, session) =>
                                        sum + session.attendancePercentage,
                                      0
                                    ) / item.sessions.length
                                  )
                                : 0
                            )}`}
                          >
                            {item.sessions.length > 0
                              ? Math.round(
                                  item.sessions.reduce(
                                    (sum, session) => sum + session.attendancePercentage,
                                    0
                                  ) / item.sessions.length
                                )
                              : 0}
                            %
                          </p>

                          <p className="mt-2 text-xs text-gray-500">
                            Average attendance for this class
                          </p>

                          <div className="mt-5 space-y-3">
                            <button
                              type="button"
                              onClick={() => openClassDetail(item.id)}
                              className="flex w-full items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                            >
                              <span>View Details</span>
                              <ChevronRight size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteClass(item.id)}
                              className="flex w-full items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:border-red-100 hover:bg-red-50"
                            >
                              <span>Delete Class</span>
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">No classes found</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Try changing the search term or filter.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {viewMode === 'create' && (
        <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                Create Class
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                Add a new class
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-500">
                Create a lecturer class manually before connecting it to backend data.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Unit Code
              </label>
              <input
                type="text"
                value={createForm.unitCode}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, unitCode: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Unit Name
              </label>
              <input
                type="text"
                value={createForm.unitName}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, unitName: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Day
              </label>
              <select
                value={createForm.day}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, day: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              >
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Time
              </label>
              <input
                type="text"
                placeholder="e.g. 09:00 - 11:00"
                value={createForm.time}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, time: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={createForm.location}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Lecturer
              </label>
              <input
                type="text"
                value={createForm.lecturer}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, lecturer: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Class Type
              </label>
              <select
                value={createForm.classType}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, classType: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              >
                <option>Lecture</option>
                <option>Tutorial</option>
                <option>Lab</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Group
              </label>
              <input
                type="text"
                value={createForm.group}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, group: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Term
              </label>
              <input
                type="text"
                value={createForm.term}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, term: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleCreateClass}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
            >
              <Plus size={16} />
              Create Class
            </button>
          </div>
        </section>
      )}

      {viewMode === 'upload' && (
        <section className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                  Upload Roster
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                  Import Swinburne attendance sheet
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  Upload an Excel roster, preview student data, map the required
                  columns, and confirm import.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetUploadState();
                  setViewMode('list');
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>

            {uploadStep === 1 && (
              <div className="space-y-6">
                <label
                  htmlFor="roster-upload"
                  onDragEnter={(e) => handleDragState(e, true)}
                  onDragOver={(e) => handleDragState(e, true)}
                  onDragLeave={(e) => handleDragState(e, false)}
                  onDrop={handleDrop}
                  className={`block cursor-pointer rounded-[28px] border-2 border-dashed p-10 text-center transition ${
                    isDragging
                      ? 'border-[#E4002B] bg-rose-50'
                      : 'border-gray-200 bg-gray-50 hover:border-[#E4002B]/40 hover:bg-rose-50/40'
                  }`}
                >
                  <input
                    id="roster-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <FileSpreadsheet size={28} className="text-[#E4002B]" />
                  </div>

                  <h3 className="mt-5 text-xl font-black tracking-tight text-gray-900">
                    Drop Excel file here or click to upload
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-500">
                    Supports .xlsx and .xls attendance roster files.
                  </p>
                </label>

                <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
                  <p className="text-sm font-bold text-[#E4002B]">Expected file flow</p>
                  <p className="mt-2 text-sm leading-7 text-gray-700">
                    The upload parser reads the attendance sheet metadata, builds a
                    student preview, and lets you confirm the roster before creating
                    the class.
                  </p>
                </div>
              </div>
            )}

            {uploadStep === 2 && (
              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                      <h3 className="text-base font-bold text-gray-900">
                        Parsed Metadata
                      </h3>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Term
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.term || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Unit Code
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.unitCode || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Unit Name
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.unitName || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Class Type
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.classType || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Group
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.group || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Day
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.day || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Time
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.time || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Room
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.room || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Lecturer
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {parsedMetadata.lecturer || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                      <h3 className="text-base font-bold text-gray-900">
                        Column Mapping
                      </h3>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Student ID Column
                          </label>
                          <select
                            value={columnMapping.studentId}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                studentId: e.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">Select column</option>
                            {uploadColumns.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Student Name Column
                          </label>
                          <select
                            value={columnMapping.name}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">Select column</option>
                            {uploadColumns.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Program Column
                          </label>
                          <select
                            value={columnMapping.program}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                program: e.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">Optional</option>
                            {uploadColumns.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4">
                      <h3 className="text-base font-bold text-gray-900">
                        Student Preview
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Preview of imported rows before confirmation
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            {uploadColumns.slice(0, 8).map((column) => (
                              <th key={column} className="px-4 py-3 font-semibold">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.slice(0, 12).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-t border-gray-100">
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={`${rowIndex}-${cellIndex}`}
                                  className="px-4 py-3 text-gray-700"
                                >
                                  {cell || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-6 py-4 text-xs text-gray-500">
                      Showing up to 12 preview rows.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={confirmImport}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
                  >
                    <CheckCircle2 size={16} />
                    Confirm Import
                  </button>

                  <button
                    type="button"
                    onClick={resetUploadState}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                  >
                    <X size={16} />
                    Reset Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {viewMode === 'detail' && selectedClass && (
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#E4002B]">
                    {selectedClass.unitCode}
                  </span>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSessionTypeClasses(
                      selectedClass.sessionType ||
                        mapClassTypeToSessionType(selectedClass.classType)
                    )}`}
                  >
                    {selectedClass.sessionType ||
                      mapClassTypeToSessionType(selectedClass.classType)}
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  {selectedClass.unitName}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Lecturer: {selectedClass.lecturer || 'TBA'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                >
                  <ArrowLeft size={16} />
                  Back to List
                </button>

                <Link
                  href="/lecturer/attendance"
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                >
                  <Eye size={16} />
                  Open Attendance
                </Link>

                <button
                  type="button"
                  onClick={createSession}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
                >
                  <Plus size={16} />
                  Create Session
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <CalendarDays size={14} />
                  Day
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedClass.day}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Clock3 size={14} />
                  Time
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedClass.time}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <MapPin size={14} />
                  Venue
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedClass.location}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Users size={14} />
                  Students
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedClass.students.length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-bold text-gray-900">Students</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enrolled student list for this class
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {selectedClass.students.length > 0 ? (
                  selectedClass.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {student.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {student.studentNumber}
                        </p>
                        {student.program && (
                          <p className="mt-1 text-xs text-gray-500">
                            {student.program}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeStudent(student.id)}
                        className="self-start rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-sm text-gray-500">
                    No students added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-bold text-gray-900">Sessions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Session records and attendance progress
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {selectedClass.sessions.length > 0 ? (
                  selectedClass.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                              session.status
                            )}`}
                          >
                            {session.status}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-gray-900">
                          {session.date}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {session.time} · {session.venue}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Present: {session.presentCount} · Absent: {session.absentCount}{' '}
                          · Late: {session.lateCount} · Sick: {session.sickCount}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p
                          className={`text-lg font-black tracking-tight ${getAttendanceTextClasses(
                            session.attendancePercentage
                          )}`}
                        >
                          {session.attendancePercentage}%
                        </p>
                        <p className="text-xs text-gray-500">attendance rate</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-sm text-gray-500">
                    No sessions recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}