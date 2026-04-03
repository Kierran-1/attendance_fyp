'use client';

import React, { useState, useCallback, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Upload,
  Search,
  Eye,
  Edit2,
  X,
  ChevronLeft,
  Users,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Check,
  TrendingDown,
  TrendingUp,
  BarChart3,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  studentNumber: string;
  name: string;
  program?: string;
  nationality?: string;
  schoolStatus?: string;
}

interface Session {
  id: string;
  date: string;
  attendancePercentage: number;
  status: "Completed" | "Ongoing" | "Scheduled";
  presentCount: number;
  absentCount: number;
  lateCount: number;
  sickCount: number;
}

interface ClassData {
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
  students: Student[];
  sessions: Session[];
  createdAt: string;
}

interface ParsedSheet {
  sheetName: string;
  metadata: {
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
  students: any[];
  columns: string[];
}

type ViewMode = "list" | "upload" | "detail";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "sessions">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploadColumns, setUploadColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({ studentId: "", name: "", program: "" });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[]>([]);

  // Add student modal state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    studentNumber: "",
    name: "",
    program: "",
    nationality: "",
    schoolStatus: "Active",
  });

  // Edit student modal state
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // ── Fetch classes from API ──────────────────────────────────────────────────

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        const response = await fetch('/api/lecturer/unit');
        if (!response.ok) throw new Error('Failed to fetch courses');
        const data = await response.json();
        setClasses(data);
        setExpandedUnits(new Set<string>(data.map((c: ClassData) => c.unitCode)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────

  const groupedClasses = useMemo(() => {
    const groups: Record<string, ClassData[]> = {};
    classes.forEach(cls => {
      if (!groups[cls.unitCode]) groups[cls.unitCode] = [];
      groups[cls.unitCode].push(cls);
    });
    return groups;
  }, [classes]);

  const getUniqueStudentsForUnit = (unitClasses: ClassData[]) => {
    const map = new Map<string, Student>();
    unitClasses.forEach(cls =>
      cls.students.forEach(s => { if (!map.has(s.studentNumber)) map.set(s.studentNumber, s); })
    );
    return map;
  };

  const allUniqueStudents = useMemo(() => {
    const map = new Map<string, Student>();
    classes.forEach(cls =>
      cls.students.forEach(s => { if (!map.has(s.studentNumber)) map.set(s.studentNumber, s); })
    );
    return map;
  }, [classes]);

  const units = useMemo(() =>
    Object.entries(groupedClasses).map(([unitCode, unitClasses]) => ({
      unitCode,
      unitName: unitClasses[0].unitName,
      classCount: unitClasses.length,
      totalStudents: getUniqueStudentsForUnit(unitClasses).size,
      classes: unitClasses,
    })), [groupedClasses]);

  const stats = useMemo(() => {
    const atRiskNums = new Set<string>();
    classes.forEach(c => {
      const avg = c.sessions.length > 0
        ? c.sessions.reduce((s, sess) => s + sess.attendancePercentage, 0) / c.sessions.length
        : 100;
      if (avg < 80) c.students.forEach(s => atRiskNums.add(s.studentNumber));
    });
    return {
      totalStudents: allUniqueStudents.size,
      totalSessions: classes.reduce((acc, c) => acc + c.sessions.length, 0),
      atRiskStudents: atRiskNums.size,
      classCount: classes.length,
    };
  }, [classes, allUniqueStudents]);

  const toggleUnit = (unitCode: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      next.has(unitCode) ? next.delete(unitCode) : next.add(unitCode);
      return next;
    });
  };

  // ── Delete ALL classes for a unit ───────────────────────────────────────────

  const deleteAllClassesForUnit = async (unitCode: string, unitClasses: ClassData[]) => {
    if (!confirm(`Are you sure you want to delete ALL ${unitClasses.length} classes for ${unitCode}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    let deleted = 0;
    let failed = 0;

    try {
      for (const cls of unitClasses) {
        try {
          const response = await fetch(`/api/lecturer/unit/${cls.id}`, { 
            method: 'DELETE' 
          });
          if (response.ok) {
            deleted++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      const refreshed = await fetch('/api/lecturer/unit');
      const data = await refreshed.json();
      setClasses(data);
      setExpandedUnits(new Set(data.map((c: ClassData) => c.unitCode)));

      alert(`Deleted ${deleted} classes${failed > 0 ? `, ${failed} failed` : ''}`);
    } catch (err) {
      alert('Failed to delete classes: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // ── Student operations ─────────────────────────────────────────────────────

  const addStudent = async () => {
    if (!selectedClass) return;
    if (!newStudent.studentNumber || !newStudent.name) {
      alert('Student ID and Name are required');
      return;
    }

    try {
      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add student');
      }

      const addedStudent = await response.json();

      setClasses(prev => prev.map(c =>
        c.id === selectedClass.id 
          ? { ...c, students: [...c.students, addedStudent] } 
          : c
      ));
      setSelectedClass(prev => prev 
        ? { ...prev, students: [...prev.students, addedStudent] } 
        : null
      );

      setNewStudent({
        studentNumber: "",
        name: "",
        program: "",
        nationality: "",
        schoolStatus: "Active",
      });
      setShowAddStudentModal(false);

    } catch (err) {
      alert('Failed to add student: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const editStudent = async () => {
    if (!selectedClass || !editingStudent) return;
    
    // CHECK: Verify student ID is valid
    if (!editingStudent.id) {
      console.error('Student ID is undefined:', editingStudent);
      alert('Error: Student ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStudent.name,
          program: editingStudent.program,
          nationality: editingStudent.nationality,
          schoolStatus: editingStudent.schoolStatus,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update student');
      }

      const updatedStudent = await response.json();

      setClasses(prev => prev.map(c =>
        c.id === selectedClass.id 
          ? { ...c, students: c.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) } 
          : c
      ));
      setSelectedClass(prev => prev 
        ? { ...prev, students: prev.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) } 
        : null
      );

      setShowEditStudentModal(false);
      setEditingStudent(null);

    } catch (err) {
      alert('Failed to update student: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!selectedClass) return;
    
    // CHECK: Verify student ID is valid
    if (!studentId) {
      console.error('Student ID is undefined');
      alert('Error: Student ID is missing.');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this student from the class?')) return;

    try {
      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to remove student');
      }

      setClasses(prev => prev.map(c =>
        c.id === selectedClass.id 
          ? { ...c, students: c.students.filter(s => s.id !== studentId) } 
          : c
      ));
      setSelectedClass(prev => prev 
        ? { ...prev, students: prev.students.filter(s => s.id !== studentId) } 
        : null
      );

    } catch (err) {
      alert('Failed to remove student: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // ── Excel parsing ───────────────────────────────────────────────────────────

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): ParsedSheet | null => {
    const allData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
    }) as any[][];

    if (allData.length < 7) {
      console.warn(`Sheet "${sheetName}" skipped — only ${allData.length} rows`);
      return null;
    }

    const row4: any[] = allData[2] || [];
    const row4Text = row4.join(' ');

    const termMatch = row4Text.match(/Term\s*:\s*([^,]+)/i);
    const term = termMatch ? termMatch[1].trim() : "";

    let unitCode = "";
    let unitName = "";
    const unitRegex = row4Text.match(/Unit\s*:\s*([A-Z]{2,4}\d{4,6})\s*-\s*(.+)/i);
    if (unitRegex) {
      unitCode = unitRegex[1].trim();
      unitName = unitRegex[2].split(',')[0].trim();
    } else if (row4Text.includes("Unit")) {
      const unitPart = row4Text.split("Unit")[1] || "";
      const cleaned = unitPart.replace(":", "").trim();
      const parts = cleaned.split("-");
      unitCode = parts[0]?.trim() || "";
      unitName = parts.slice(1).join("-").split(',')[0].trim() || "";
    }

    const row5: any[] = allData[3] || [];
    const row5Text = row5.join(',');
    const classDetails = row5Text
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const classType = classDetails[0] || "";
    const group = classDetails[1] || "";
    const day = classDetails[2] || "";
    const time = classDetails[3] || "";
    const room = classDetails[4] || "";
    const lecturer = classDetails[5] || "";

    const row6: any[] = allData[4] || [];
    const row7: any[] = allData[5] || [];
    const maxCols = Math.max(row6.length, row7.length);

    const headers: string[] = [];
    for (let i = 0; i < maxCols; i++) {
      const r6 = row6[i]?.toString().trim() || "";
      const r7 = row7[i]?.toString().trim() || "";

      if (i < 8) {
        switch (i) {
          case 0: headers.push("Sl.No"); break;
          case 1: headers.push("Student Number"); break;
          case 2: headers.push("Empty"); break;
          case 3: headers.push("Student Name"); break;
          case 4: headers.push("Program"); break;
          case 5: headers.push("Registered Course"); break;
          case 6: headers.push("Nationality"); break;
          case 7: headers.push("School Status"); break;
        }
      } else {
        if (r6.includes('/')) {
          headers.push(`Week_${r6.replace(/\//g, '_')}`);
        } else if (r6) {
          headers.push(r6);
        } else if (/^\d+$/.test(r7)) {
          headers.push(`Week_${r7}`);
        } else {
          headers.push(`Column_${i + 1}`);
        }
      }
    }

    const coreHeaders = headers.slice(0, 8);

    const studentData = allData
      .slice(6)
      .map((row: any[]) => {
        const padded = [...row];
        while (padded.length < 8) padded.push('');
        return padded.slice(0, 8);
      })
      .filter((row: any[]) => {
        const num = row[1];
        return num != null && String(num).trim() !== '';
      });

    return {
      sheetName,
      metadata: { term, unitCode, unitName, classType, group, day, time, room, lecturer },
      students: studentData,
      columns: coreHeaders,
    };
  };

  // ── File upload handler ─────────────────────────────────────────────────────

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'binary' });
        const allSheets: ParsedSheet[] = [];

        workbook.SheetNames.forEach(name => {
          const parsed = parseSheet(workbook.Sheets[name], name);
          if (parsed) allSheets.push(parsed);
        });

        if (allSheets.length === 0) {
          alert('No valid sheets found in the file. Please check the format.');
          return;
        }

        const unitCodes = new Set(allSheets.map(s => s.metadata.unitCode).filter(Boolean));
        if (unitCodes.size > 1) {
          alert(`Warning: sheets belong to different units: ${[...unitCodes].join(', ')}`);
        }

        setParsedSheets(allSheets);
        setUploadColumns(allSheets[0].columns);
        setUploadPreview(allSheets[0].students);
        setUploadFile(file);
        setUploadStep(2);

        const find = (patterns: string[]) =>
          allSheets[0].columns.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))) || "";

        setColumnMapping({
          studentId: find(["student number"]),
          name: find(["student name"]),
          program: find(["program"]),
        });
      } catch (err) {
        console.error('Excel parse error:', err);
        alert('Error parsing Excel file. Please ensure it is a valid Swinburne attendance form.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(active);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  }, []);

  // ── Confirm import ─────────────────────────────────────────────────────────

  const confirmImport = async () => {
    if (!columnMapping.studentId || !columnMapping.name) {
      alert('Please map at least Student ID and Name columns');
      return;
    }
    if (!uploadFile || parsedSheets.length === 0) return;

    setLoading(true);

    try {
      let totalCreated = 0;
      let totalEnrolled = 0;

      for (const sheet of parsedSheets) {
        const { metadata, students: studentData, columns } = sheet;

        const studentNumberCol = columns.indexOf(columnMapping.studentId);
        const nameCol = columns.indexOf(columnMapping.name);
        const programCol = columnMapping.program ? columns.indexOf(columnMapping.program) : -1;
        const nationalityCol = columns.indexOf('Nationality');
        const statusCol = columns.indexOf('School Status');

        const students = studentData
          .filter((row: any[]) => {
            const num = row[studentNumberCol];
            return num != null && String(num).trim() !== '';
          })
          .map((row: any[]) => {
            const studentId = row[studentNumberCol]?.toString().trim() || '';
            const name = row[nameCol]?.toString().trim() || '';
            if (!studentId || !name) return null;
            return {
              studentId,
              name,
              major: programCol >= 0 ? row[programCol]?.toString().trim() || null : null,
              nationality: nationalityCol >= 0 ? row[nationalityCol]?.toString().trim() || null : null,
              schoolStatus: statusCol >= 0 ? row[statusCol]?.toString().trim() || null : null,
            };
          })
          .filter(Boolean);

        const typePrefix = (metadata.classType || '').slice(0, 2).toUpperCase();
        const sessionTypeMap: Record<string, string> = {
          LA: 'LAB', LE: 'LECTURE', TU: 'TUTORIAL', PR: 'PRACTICAL',
        };

        const classGroup = metadata.classType && metadata.group
          ? `${metadata.classType}_${metadata.group}`
          : metadata.classType || metadata.group || null;

        const response = await fetch('/api/lecturer/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course: {
              code: metadata.unitCode || 'UNKNOWN',
              name: metadata.unitName || 'Imported Unit',
              semester: metadata.term || '2026_MAR_S1',
              sessionType: sessionTypeMap[typePrefix] || 'LECTURE',
              classGroup,
              scheduleDay: metadata.day || null,
              scheduleTime: metadata.time || null,
              venue: metadata.room || null,
            },
            students,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `Failed to import sheet "${sheet.sheetName}"`);
        }

        const result = await response.json();
        totalCreated += result.created || 0;
        totalEnrolled += result.enrolled || 0;
      }

      const refreshed = await fetch('/api/lecturer/unit');
      if (!refreshed.ok) throw new Error('Failed to refresh class list');
      const data = await refreshed.json();

      setClasses(data);
      setExpandedUnits(new Set<string>(data.map((c: ClassData) => c.unitCode)));

      setUploadFile(null);
      setUploadPreview([]);
      setUploadColumns([]);
      setColumnMapping({ studentId: '', name: '', program: '' });
      setParsedSheets([]);
      setUploadStep(1);
      setViewMode('list');

      alert(`✅ Import complete!\n${totalCreated} new students created\n${totalEnrolled} enrollments added`);

    } catch (err) {
      console.error('Import error:', err);
      alert('Import failed: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading && viewMode === 'list') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-lg">Loading classes...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl border shadow-sm text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Classes</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  // ── Views ──────────────────────────────────────────────────────────────────

  const renderListView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Units", value: units.length, icon: FolderOpen, color: "blue" },
          { label: "Total Classes", value: stats.classCount, icon: BarChart3, color: "blue" },
          { label: "Total Students", value: stats.totalStudents, icon: Users, color: "green", sub: "Unique across all units" },
          { label: "At Risk", value: stats.atRiskStudents, icon: AlertCircle, color: "red", bold: true },
        ].map(({ label, value, icon: Icon, color, sub, bold }) => (
          <div key={label} className="bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
              <span className={`p-2 bg-${color}-50 rounded-lg`}><Icon className={`w-4 h-4 text-${color}-600`} /></span>
            </div>
            <p className={`text-2xl font-bold ${bold ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search units or classes..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm" />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => setViewMode("upload")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" /> Upload Master List
          </button>
        </div>
      </div>

      {/* Units accordion */}
      <div className="space-y-4">
        {units.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Found</h3>
            <p className="text-gray-500 mb-4">Upload a master attendance list to get started.</p>
            <button onClick={() => setViewMode("upload")} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Upload List</button>
          </div>
        ) : (
          units.map(unit => {
            const isExpanded = expandedUnits.has(unit.unitCode);
            const filtered = unit.classes.filter(c =>
              c.unitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.classType?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length === 0) return null;

            return (
              <div key={unit.unitCode} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Unit header row */}
                <div className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleUnit(unit.unitCode)}>
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {unit.unitCode.slice(0, 2)}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-lg">{unit.unitCode}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {filtered.length} class{filtered.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{unit.unitName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end text-sm text-gray-500 cursor-pointer" onClick={() => toggleUnit(unit.unitCode)}>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{unit.totalStudents} total students</span>
                      <span className="text-xs text-gray-400">across all groups</span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAllClassesForUnit(unit.unitCode, unit.classes);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete all classes in this unit">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="cursor-pointer" onClick={() => toggleUnit(unit.unitCode)}>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Class cards */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map(cls => {
                        const avg = cls.sessions.length > 0
                          ? Math.round(cls.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / cls.sessions.length)
                          : 0;
                        return (
                          <div key={cls.id} className="group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                            <div className="p-5">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                                    {cls.classType || 'Class'}{cls.group ? ` • Group ${cls.group}` : ''}
                                  </p>
                                  <h3 className="font-bold text-gray-900 line-clamp-1">{cls.unitName}</h3>
                                </div>
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-4 h-4 text-gray-400" /><span>{cls.day}, {cls.time}</span></div>
                                <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /><span>{cls.location}</span></div>
                                <div className="flex items-center gap-2 text-sm text-gray-600"><Users className="w-4 h-4 text-gray-400" /><span>{cls.students.length} Students</span></div>
                                {cls.lecturer && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600"><GraduationCap className="w-4 h-4 text-gray-400" /><span>{cls.lecturer}</span></div>
                                )}
                              </div>

                              {cls.sessions.length > 0 && (
                                <div className="mb-4 pt-3 border-t">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Avg Attendance</span>
                                    <span className={`font-semibold ${avg >= 80 ? 'text-green-600' : avg >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{avg}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${avg >= 80 ? 'bg-green-500' : avg >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${avg}%` }} />
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <button onClick={() => { setSelectedClass(cls); setViewMode("detail"); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                                  <Eye className="w-4 h-4" /> View
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderUploadView = () => (
    <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-6 border-b">
          <button onClick={() => { setViewMode("list"); setUploadStep(1); setUploadFile(null); setUploadPreview([]); setParsedSheets([]); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Classes
          </button>
          <div className="flex items-center gap-3">
            {[1, 2].map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${uploadStep >= step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{step}</span>
                  <span className={`text-sm font-medium ${uploadStep >= step ? 'text-gray-900' : 'text-gray-500'}`}>{step === 1 ? 'Upload' : 'Map Columns'}</span>
                </div>
                {i === 0 && (
                  <div className="w-12 h-0.5 bg-gray-200">
                    <div className={`h-full bg-red-600 transition-all duration-300 ${uploadStep >= 2 ? 'w-full' : 'w-0'}`} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {uploadStep === 1 ? (
          <div className="p-8">
            <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              onDragEnter={e => handleDrag(e, true)} onDragLeave={e => handleDrag(e, false)}
              onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Master Attendance Form</h3>
              <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">Upload the official Swinburne attendance Excel file with multiple sheets.</p>
              <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">Each sheet represents a different class group (LA1, LA2, TU1…). All sheets will be imported.</p>
              <input type="file" accept=".xlsx,.xls" id="file-upload" className="hidden"
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" /> Choose File
              </label>
              <p className="text-xs text-gray-400 mt-4">Supports .xlsx, .xls • Max 10MB • Multiple sheets</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {parsedSheets.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Detected {parsedSheets.length} sheet{parsedSheets.length !== 1 ? 's' : ''} for unit: <span className="font-bold">{parsedSheets[0].metadata.unitCode}</span>
                </h4>
                <div className="space-y-2">
                  {parsedSheets.map((sheet, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-white p-3 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-blue-900">{sheet.sheetName}</span>
                        <span className="text-blue-600">{sheet.metadata.classType}{sheet.metadata.group ? ` • Group ${sheet.metadata.group}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-500">
                        <span>{sheet.metadata.day}, {sheet.metadata.time}</span>
                        <span>{sheet.metadata.room}</span>
                        <span>{sheet.students.length} students</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Excel Columns</h3>
              <p className="text-sm text-gray-500">Verify the column mappings. These apply to ALL sheets.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Student ID", key: "studentId", required: true },
                { label: "Name", key: "name", required: true },
                { label: "Program", key: "program", required: false },
              ].map(({ label, key, required }) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <select value={(columnMapping as any)[key]}
                    onChange={e => setColumnMapping(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white">
                    <option value="">Select column…</option>
                    {uploadColumns.map((col, i) => <option key={i} value={col}>{col}</option>)}
                  </select>
                  {(columnMapping as any)[key] && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="w-3 h-3" /> Mapped to "{(columnMapping as any)[key]}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Student Data Preview (first sheet)</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{uploadColumns.slice(0, 7).map((col, i) => (
                      <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uploadPreview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {uploadColumns.slice(0, 7).map((_, ci) => (
                          <td key={ci} className="px-4 py-2 text-gray-600 whitespace-nowrap">{row[ci]?.toString() || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setUploadStep(1)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Back</button>
              <button
                onClick={confirmImport}
                disabled={!columnMapping.studentId || !columnMapping.name || loading}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Import All {parsedSheets.length} Classes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDetailView = () => {
    if (!selectedClass) return null;
    const avg = selectedClass.sessions.length > 0
      ? Math.round(selectedClass.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / selectedClass.sessions.length)
      : 0;
    const atRiskCount = avg < 80 ? selectedClass.students.length : 0;

    return (
      <div className="animate-in slide-in-from-right-4 duration-300">
        <div className="bg-white rounded-xl border shadow-sm mb-6 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />
          <div className="p-6">
            <button onClick={() => setViewMode("list")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
              <ChevronLeft className="w-4 h-4" /> Back to Classes
            </button>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{selectedClass.unitCode}</span>
                  {selectedClass.classType && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {selectedClass.classType} • Group {selectedClass.group}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{selectedClass.createdAt}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedClass.unitName}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{selectedClass.day}, {selectedClass.time}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{selectedClass.location}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{selectedClass.students.length} Students</span>
                  {selectedClass.lecturer && <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4" />{selectedClass.lecturer}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t">
            {[
              { id: "students", label: "Students", icon: Users, count: selectedClass.students.length },
              { id: "sessions", label: "Sessions", icon: Calendar, count: selectedClass.sessions.length },
             
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>
                )}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm min-h-[400px]">
          {/* Students tab */}
          {activeTab === "students" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Student List</h3>
                <button 
                  onClick={() => setShowAddStudentModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Student
                </button>
              </div>
              {selectedClass.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Student ID", "Name", "Program", "Nationality", "Status", "Actions"].map(h => (
                          <th key={h} className={`px-4 py-3 text-${h === 'Actions' ? 'right' : 'left'} font-medium text-gray-700`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedClass.students.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3 font-mono text-gray-600">{student.studentNumber}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{student.program || "-"}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{student.nationality || "-"}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                              student.schoolStatus === 'Active' ? 'bg-green-100 text-green-700' : 
                              student.schoolStatus === 'Inactive' ? 'bg-gray-100 text-gray-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {student.schoolStatus || "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  console.log('Setting editing student:', student);
                                  setEditingStudent(student);
                                  setShowEditStudentModal(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteStudent(student.id)} 
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-gray-400" /></div>
                  <h4 className="text-gray-900 font-medium mb-1">No students yet</h4>
                  <p className="text-sm text-gray-500 mb-4">Add students manually or upload an Excel file</p>
                  <button 
                    onClick={() => setShowAddStudentModal(true)} 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Student
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sessions tab */}
          {activeTab === "sessions" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Attendance Sessions</h3>
              </div>
              {selectedClass.sessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedClass.sessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-red-300 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${session.status === 'Completed' ? 'bg-green-100' : session.status === 'Ongoing' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                          <Calendar className={`w-6 h-6 ${session.status === 'Completed' ? 'text-green-600' : session.status === 'Ongoing' ? 'text-amber-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{session.date}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{session.presentCount} Present</span>
                            <span className="flex items-center gap-1"><X className="w-3.5 h-3.5 text-red-500" />{session.absentCount} Absent</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-semibold ${session.attendancePercentage >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{session.attendancePercentage}%</span>
                            <span className="text-xs text-gray-500">attendance</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${session.status === 'Completed' ? 'bg-green-100 text-green-700' : session.status === 'Ongoing' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="w-8 h-8 text-gray-400" /></div>
                  <h4 className="text-gray-900 font-medium mb-1">No sessions yet STILL WAITING FOR ATTENDANCE PAGE</h4>
                  <p className="text-sm text-gray-500 mb-4">Attendance sessions will appear here when recorded</p>
                </div>
              )}
            </div>
          )}

        
        </div>

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Student ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newStudent.studentNumber}
                    onChange={e => setNewStudent(p => ({ ...p, studentNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    placeholder="e.g., 102345678"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Program</label>
                  <input
                    type="text"
                    value={newStudent.program}
                    onChange={e => setNewStudent(p => ({ ...p, program: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nationality</label>
                  <input
                    type="text"
                    value={newStudent.nationality}
                    onChange={e => setNewStudent(p => ({ ...p, nationality: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    placeholder="e.g., Malaysian"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newStudent.schoolStatus}
                    onChange={e => setNewStudent(p => ({ ...p, schoolStatus: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addStudent}
                  disabled={!newStudent.studentNumber || !newStudent.name}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {showEditStudentModal && editingStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Student</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Student ID</label>
                  <input
                    type="text"
                    value={editingStudent.studentNumber}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={e => setEditingStudent(p => p ? { ...p, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Program</label>
                  <input
                    type="text"
                    value={editingStudent.program || ''}
                    onChange={e => setEditingStudent(p => p ? { ...p, program: e.target.value } : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nationality</label>
                  <input
                    type="text"
                    value={editingStudent.nationality || ''}
                    onChange={e => setEditingStudent(p => p ? { ...p, nationality: e.target.value } : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editingStudent.schoolStatus || 'Active'}
                    onChange={e => setEditingStudent(p => p ? { ...p, schoolStatus: e.target.value } : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditStudentModal(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editStudent}
                  disabled={!editingStudent.name}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto">
        {viewMode === "list" && renderListView()}
        {viewMode === "upload" && renderUploadView()}
        {viewMode === "detail" && renderDetailView()}
      </div>
    </div>
  );
}