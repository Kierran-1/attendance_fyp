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
  Check,
  BarChart3,
  GraduationCap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Loader2,
  BookOpen,
  TrendingUp,
  ShieldAlert,
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
    location?: string;
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

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    studentNumber: "", name: "", program: "", nationality: "", schoolStatus: "Active",
  });
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (showAddStudentModal) {
      setNewStudent({
        studentNumber: "",
        name: "",
        program: "",
        nationality: "",
        schoolStatus: "Active",
      });
    }
  }, [showAddStudentModal]);

  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

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

  // ── Derived state ──────────────────────────────────────────────────────────

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
    unitClasses.forEach(cls => cls.students.forEach(s => { if (!map.has(s.studentNumber)) map.set(s.studentNumber, s); }));
    return map;
  };

  const allUniqueStudents = useMemo(() => {
    const map = new Map<string, Student>();
    classes.forEach(cls => cls.students.forEach(s => { if (!map.has(s.studentNumber)) map.set(s.studentNumber, s); }));
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

  // ── Delete all classes for a unit ─────────────────────────────────────────

  const deleteAllClassesForUnit = async (unitCode: string, unitClasses: ClassData[]) => {
    if (!confirm(`Are you sure you want to delete ALL ${unitClasses.length} classes for ${unitCode}? This action cannot be undone.`)) return;
    setLoading(true);
    let deleted = 0, failed = 0;
    try {
      for (const cls of unitClasses) {
        try {
          const r = await fetch(`/api/lecturer/unit/${cls.id}`, { method: 'DELETE' });
          r.ok ? deleted++ : failed++;
        } catch { failed++; }
      }
      const refreshed = await fetch('/api/lecturer/unit');
      const data = await refreshed.json();
      setClasses(data);
      setExpandedUnits(new Set(data.map((c: ClassData) => c.unitCode)));
      alert(`Deleted ${deleted} classes${failed > 0 ? `, ${failed} failed` : ''}`);
    } catch (err) {
      alert('Failed to delete classes: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setLoading(false); }
  };

  // ── Student operations ─────────────────────────────────────────────────────

  const addStudent = async () => {
    if (!selectedClass) return;

    if (!newStudent.studentNumber || !newStudent.name) {
      alert('Student ID and Name are required');
      return;
    }
    setModalLoading(true);
    try {
      const email = `${newStudent.studentNumber}@students.swinburne.edu.my`;

      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: newStudent.name,
          programName: newStudent.program,
          nationality: newStudent.nationality,
          schoolStatus: newStudent.schoolStatus,
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to add student'); }

      const addedStudent = await response.json();

      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, students: [...c.students, addedStudent] } : c));
      setSelectedClass(prev => prev ? { ...prev, students: [...prev.students, addedStudent] } : null);
      setNewStudent({ studentNumber: "", name: "", program: "", nationality: "", schoolStatus: "Active" });
      setShowAddStudentModal(false);
    } catch (err) { alert('Failed to add student: ' + (err instanceof Error ? err.message : 'Unknown error')); }
    finally { setModalLoading(false); }
  };

  const editStudent = async () => {
    if (!selectedClass || !editingStudent) return;
    if (!editingStudent.id) { alert('Error: Student ID is missing.'); return; }
    setModalLoading(true);
    try {
      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students/${editingStudent.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStudent.name,
          programName: editingStudent.program,
          nationality: editingStudent.nationality,
          schoolStatus: editingStudent.schoolStatus
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to update student'); }
      const updatedStudent = await response.json();
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, students: c.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) } : c));
      setSelectedClass(prev => prev ? { ...prev, students: prev.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) } : null);
      setShowEditStudentModal(false);
      setEditingStudent(null);
    } catch (err) { alert('Failed to update student: ' + (err instanceof Error ? err.message : 'Unknown error')); }
    finally { setModalLoading(false); }
  };

  const deleteStudent = async (studentId: string) => {
    if (!selectedClass || !studentId) return;
    if (!confirm('Are you sure you want to remove this student from the class?')) return;
    try {
      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students/${studentId}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to remove student'); }
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c));
      setSelectedClass(prev => prev ? { ...prev, students: prev.students.filter(s => s.id !== studentId) } : null);
    } catch (err) { alert('Failed to remove student: ' + (err instanceof Error ? err.message : 'Unknown error')); }
  };

  // ── Excel parsing ──────────────────────────────────────────────────────────

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): ParsedSheet | null => {
    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '' }) as any[][];
    if (allData.length < 8) { console.warn(`Sheet "${sheetName}" skipped`); return null; }
    const metaCell = String(allData[3]?.[0] ?? '');
    const termMatch = metaCell.match(/Term\s*:\s*([^,]+)/i);
    const term = termMatch ? termMatch[1].trim() : "";
    let unitCode = "", unitName = "";
    const unitRegex = metaCell.match(/Unit\s*:\s*([A-Z]{2,4}\d{4,6})\s*-\s*(.+)/i);
    if (unitRegex) { unitCode = unitRegex[1].trim(); unitName = unitRegex[2].split(',')[0].trim(); }
    const classCell = String(allData[4]?.[0] ?? '');
    const classParts = classCell.split(',').map((s: string) => s.trim());
    const classType = classParts[0] || "";
    const group = classParts[1] || "";
    const day = classParts[2] || "";
    const time = classParts[3] || "";
    const location = classParts[4] || "";
    const lecturer = classParts[5] || "";
    const coreHeaders = ["Sl.No", "Student Number", "Empty", "Student Name", "Program", "Registered Course", "Nationality", "School Status"];
    const studentData = allData.slice(7)
      .map((row: any[]) => { const p = [...row]; while (p.length < 8) p.push(''); return p.slice(0, 8); })
      .filter((row: any[]) => { const s = String(row[1]).trim(); return row[1] != null && s !== '' && !/^\D/.test(s); });
    return { sheetName, metadata: { term, unitCode, unitName, classType, group, day, time, location, lecturer }, students: studentData, columns: coreHeaders };
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) { alert('Please upload an Excel file (.xlsx or .xls)'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const allSheets: ParsedSheet[] = [];
        workbook.SheetNames.forEach(name => {
          const parsed = parseSheet(workbook.Sheets[name], name);
          if (parsed) allSheets.push(parsed);
        });
        if (allSheets.length === 0) { alert('No valid sheets found in the file.'); return; }
        setParsedSheets(allSheets);
        setUploadColumns(allSheets[0].columns);
        setUploadPreview(allSheets[0].students);
        setUploadFile(file);
        setUploadStep(2);
        const find = (patterns: string[]) => allSheets[0].columns.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))) || "";
        setColumnMapping({ studentId: find(["student number"]), name: find(["student name"]), program: find(["program"]) });
      } catch (err) { console.error('Excel parse error:', err); alert('Error parsing Excel file.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(active); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]); }, []);

  const confirmImport = async () => {
  if (!columnMapping.studentId || !columnMapping.name) { alert('Please map at least Student ID and Name columns'); return; }
  if (!uploadFile || parsedSheets.length === 0) return;
  setLoading(true);
  try {
    let totalCreated = 0, totalEnrolled = 0;

    for (const sheet of parsedSheets) {
      const { metadata, students: studentData, columns } = sheet;
      const studentNumberCol = columns.indexOf(columnMapping.studentId);
      const nameCol = columns.indexOf(columnMapping.name);
      const programCol = columnMapping.program ? columns.indexOf(columnMapping.program) : -1;
      const nationalityCol = columns.indexOf('Nationality');
      const statusCol = columns.indexOf('School Status');

      const students = studentData
        .filter((row: any[]) => row[studentNumberCol] != null && String(row[studentNumberCol]).trim() !== '')
        .map((row: any[]) => {
          const studentId = row[studentNumberCol]?.toString().trim() || '';
          const name = row[nameCol]?.toString().trim() || '';
          if (!studentId || !name) return null;
          return {
            studentId,
            name,
            programName: programCol >= 0 ? row[programCol]?.toString().trim() || null : null,
            nationality: nationalityCol >= 0 ? row[nationalityCol]?.toString().trim() || null : null,
            schoolStatus: statusCol >= 0 ? row[statusCol]?.toString().trim() || null : null,
          };
        }).filter(Boolean);

      const response = await fetch('/api/lecturer/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit: {
            code: metadata.unitCode || 'UNKNOWN',
            name: metadata.unitName || 'Imported Unit',
            semester: metadata.term || '2026_MAR_S1',
            sessionType: metadata.classType || '',
            groupNo: metadata.group || '',
            day: metadata.day || '',
            time: metadata.time || '',
            location: metadata.location || '',
          },
          students,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to import sheet "${sheet.sheetName}"`);
      }

      // ✅ Accumulate counts from each sheet's response
      const result = await response.json();
      totalCreated += result.created ?? 0;
      totalEnrolled += result.enrolled ?? 0;
    }

    // ✅ Refresh once after ALL sheets are imported
    const refreshed = await fetch('/api/lecturer/unit');
    if (!refreshed.ok) throw new Error('Failed to refresh class list');
    const data = await refreshed.json();
    setClasses(data);
    setExpandedUnits(new Set<string>(data.map((c: ClassData) => c.unitCode)));

    // ✅ Reset state once after the loop
    setUploadFile(null);
    setUploadPreview([]);
    setUploadColumns([]);
    setColumnMapping({ studentId: '', name: '', program: '' });
    setParsedSheets([]);
    setUploadStep(1);
    setViewMode('list');

    // ✅ Alert once with correct totals
    alert(`Import complete!\n${totalCreated} new students created\n${totalEnrolled} enrollments added`);

  } catch (err) {
    console.error('Import error:', err);
    alert('Import failed: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
  } finally {
    setLoading(false);
  }
};

    // ── Loading / error ────────────────────────────────────────────────────────

    if (loading && viewMode === 'list') return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          <span className="text-sm font-medium">Loading classes...</span>
        </div>
      </div>
    );

    if (error) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border shadow-sm text-center max-w-md">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Error Loading Classes</h3>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">Retry</button>
        </div>
      </div>
    );

    // ── Stat card helper ───────────────────────────────────────────────────────

    const StatCard = ({ label, value, icon: Icon, accent, sub }: { label: string; value: number; icon: any; accent: string; sub?: string }) => (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-3xl font-bold ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${accent === 'text-red-600' ? 'bg-red-50' : accent === 'text-emerald-600' ? 'bg-emerald-50' : accent === 'text-amber-600' ? 'bg-amber-50' : 'bg-blue-50'}`}>
            <Icon className={`w-5 h-5 ${accent}`} />
          </div>
        </div>
      </div>
    );

    // ── Views ──────────────────────────────────────────────────────────────────

    const renderListView = () => (
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your units, class groups and student enrolments</p>
          </div>
          <button
            onClick={() => setViewMode("upload")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" /> Upload Master List
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Units" value={units.length} icon={BookOpen} accent="text-blue-600" />
          <StatCard label="Classes" value={stats.classCount} icon={BarChart3} accent="text-blue-600" />
          <StatCard label="Students" value={stats.totalStudents} icon={Users} accent="text-emerald-600" sub="unique across units" />
          <StatCard label="At Risk" value={stats.atRiskStudents} icon={ShieldAlert} accent="text-red-600" />
        </div>

        {/* Search */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by unit code, name or class type…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Units list */}
        <div className="space-y-3">
          {units.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">No classes yet</p>
              <p className="text-sm text-gray-400 mb-5">Upload a Swinburne master attendance form to get started.</p>
              <button onClick={() => setViewMode("upload")} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
                <Upload className="w-4 h-4" /> Upload List
              </button>
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
                <div key={unit.unitCode} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Unit header */}
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors">
                    <button className="flex items-center gap-4 flex-1 text-left" onClick={() => toggleUnit(unit.unitCode)}>
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {unit.unitCode.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{unit.unitCode}</span>
                          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {filtered.length} class{filtered.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{unit.unitName}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400">
                        <Users className="w-3.5 h-3.5" />
                        {unit.totalStudents} students
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteAllClassesForUnit(unit.unitCode, unit.classes); }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete all classes in this unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleUnit(unit.unitCode)} className="p-2 text-gray-300 hover:text-gray-500 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Class cards */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filtered.map(cls => {
                          const avg = cls.sessions.length > 0
                            ? Math.round(cls.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / cls.sessions.length)
                            : null;
                          const sessionLabel = cls.classType === 'LECTURE' ? 'Lecture' : cls.classType === 'LAB' ? 'Lab' : cls.classType === 'TUTORIAL' ? 'Tutorial' : cls.classType || 'Class';
                          return (
                            <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-200 overflow-hidden group">
                              <div className="h-0.5 bg-gradient-to-r from-red-500 to-orange-400" />
                              <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 uppercase tracking-wide">
                                      {sessionLabel}{cls.group ? ` · Grp ${cls.group}` : ''}
                                    </span>
                                    <h3 className="font-semibold text-gray-900 text-sm mt-0.5 line-clamp-1">{cls.unitName}</h3>
                                  </div>
                                </div>

                                <div className="space-y-1.5 mb-4">
                                  {(cls.day || cls.time) && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                      <span>{[cls.day, cls.time].filter(Boolean).join(', ')}</span>
                                    </div>
                                  )}
                                  {cls.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                      <span>{cls.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Users className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                    <span>{cls.students.length} students enrolled</span>
                                  </div>
                                  {cls.lecturer && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <GraduationCap className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                      <span className="truncate">{cls.lecturer}</span>
                                    </div>
                                  )}
                                </div>

                                {avg !== null && (
                                  <div className="mb-4 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                      <span className="text-gray-400">Avg Attendance</span>
                                      <span className={`font-semibold ${avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{avg}%</span>
                                    </div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${avg >= 80 ? 'bg-emerald-500' : avg >= 60 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${avg}%` }} />
                                    </div>
                                  </div>
                                )}

                                <button
                                  onClick={() => { setSelectedClass(cls); setViewMode("detail"); }}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View Details
                                </button>
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => { setViewMode("list"); setUploadStep(1); setUploadFile(null); setUploadPreview([]); setParsedSheets([]); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Classes
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Upload Master List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Import students from an official Swinburne attendance form</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-4">
          {[{ n: 1, label: 'Upload file' }, { n: 2, label: 'Map columns' }].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${uploadStep >= n ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{uploadStep > n ? <Check className="w-3.5 h-3.5" /> : n}</span>
                <span className={`text-sm font-medium ${uploadStep >= n ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i === 0 && <div className="flex-1 h-px bg-gray-100"><div className={`h-full bg-red-500 transition-all duration-500 ${uploadStep >= 2 ? 'w-full' : 'w-0'}`} /></div>}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {uploadStep === 1 ? (
            <div className="p-8">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                onDragEnter={e => handleDrag(e, true)} onDragLeave={e => handleDrag(e, false)}
                onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              >
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-red-500" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">Drop your Excel file here</p>
                <p className="text-sm text-gray-400 mb-6">Each sheet = one class group (LA1, LE1, TU1…)</p>
                <input type="file" accept=".xlsx,.xls" id="file-upload" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" /> Choose File
                </label>
                <p className="text-xs text-gray-300 mt-4">.xlsx, .xls · up to 10 MB</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Detected sheets */}
              {parsedSheets.length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-semibold text-blue-900">
                      Detected {parsedSheets.length} sheet{parsedSheets.length !== 1 ? 's' : ''} — unit <span className="font-bold">{parsedSheets[0].metadata.unitCode}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    {parsedSheets.map((sheet, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2.5 border border-blue-100">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">{sheet.sheetName}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-blue-600 font-medium">{sheet.metadata.classType}{sheet.metadata.group ? ` Grp ${sheet.metadata.group}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                          {sheet.metadata.day && <span>{sheet.metadata.day}{sheet.metadata.time ? `, ${sheet.metadata.time}` : ''}</span>}
                          {sheet.metadata.location && <span>{sheet.metadata.location}</span>}
                          <span className="font-medium text-gray-600">{sheet.students.length} students</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Column mapping */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Map Columns</h3>
                <p className="text-xs text-gray-400 mb-4">These mappings apply to all sheets.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[{ label: "Student ID", key: "studentId", required: true }, { label: "Name", key: "name", required: true }, { label: "Program", key: "program", required: false }].map(({ label, key, required }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        {label} {required && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={(columnMapping as any)[key]}
                        onChange={e => setColumnMapping(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-400 outline-none bg-white"
                      >
                        <option value="">Select column…</option>
                        {uploadColumns.map((col, i) => <option key={i} value={col}>{col}</option>)}
                      </select>
                      {(columnMapping as any)[key] && (
                        <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                          <Check className="w-3 h-3" /> "{(columnMapping as any)[key]}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview — first sheet</h3>
                <div className="border border-gray-100 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{uploadColumns.slice(0, 7).map((col, i) => <th key={i} className="px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">{col}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {uploadPreview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          {uploadColumns.slice(0, 7).map((_, ci) => <td key={ci} className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{row[ci]?.toString() || '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setUploadStep(1)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Back</button>
                <button
                  onClick={confirmImport}
                  disabled={!columnMapping.studentId || !columnMapping.name || loading}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><CheckCircle2 className="w-4 h-4" /> Import {parsedSheets.length} Class{parsedSheets.length !== 1 ? 'es' : ''}</>}
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
        : null;
      const sessionLabel = selectedClass.classType === 'LECTURE' ? 'Lecture' : selectedClass.classType === 'LAB' ? 'Lab' : selectedClass.classType === 'TUTORIAL' ? 'Tutorial' : selectedClass.classType || 'Class';

      return (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Back */}
          <button onClick={() => setViewMode("list")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Classes
          </button>

          {/* Class header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 to-orange-400" />
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg">{selectedClass.unitCode}</span>
                    {selectedClass.classType && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                        {sessionLabel}{selectedClass.group ? ` · Group ${selectedClass.group}` : ''}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-3">{selectedClass.unitName}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {(selectedClass.day || selectedClass.time) && (
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-300" />{[selectedClass.day, selectedClass.time].filter(Boolean).join(', ')}</span>
                    )}
                    {selectedClass.location && (
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-300" />{selectedClass.location}</span>
                    )}
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-300" />{selectedClass.students.length} students</span>
                    {selectedClass.lecturer && <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-gray-300" />{selectedClass.lecturer}</span>}
                    {avg !== null && (
                      <span className={`flex items-center gap-1.5 font-medium ${avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        <TrendingUp className="w-4 h-4" />{avg}% avg attendance
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-t border-gray-100">
              {[
                { id: "students", label: "Students", icon: Users, count: selectedClass.students.length },
                { id: "sessions", label: "Sessions", icon: Calendar, count: selectedClass.sessions.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            {activeTab === "students" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-900">Student List</h3>
                  <button onClick={() => setShowAddStudentModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> Add Student
                  </button>
                </div>
                {selectedClass.students.length > 0 ? (
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100">
                        <tr className="text-left">
                          {["Student ID", "Name", "Program", "Nationality", "Status", ""].map((h, i) => (
                            <th key={i} className={`px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedClass.students.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50/60 group">
                            <td className="px-6 py-3.5 font-mono text-xs text-gray-500">{student.studentNumber}</td>
                            <td className="px-6 py-3.5 font-medium text-gray-900">{student.name}</td>
                            <td className="px-6 py-3.5 text-gray-500 text-xs max-w-[180px] truncate">{student.program || '—'}</td>
                            <td className="px-6 py-3.5 text-gray-500 text-xs">{student.nationality || '—'}</td>
                              <td className="px-8 py-5">
                              {(() => {
                                const status = student.schoolStatus || "Active";
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                    status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 
                                    status === 'Inactive' ? 'bg-gray-100 text-gray-600' : 
                                    'bg-amber-50 text-amber-700'
                                  }`}>
                                    {status === 'Active' && <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1.5" />}
                                    {status === 'Inactive' && <X className="w-3 h-3 text-gray-400 mr-1.5" />}
                                    {status === 'At Risk' && <AlertCircle className="w-3 h-3 text-amber-400 mr-1.5" />}
                                    {status}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingStudent(student); setShowEditStudentModal(true); }} className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteStudent(student.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
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
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6 text-gray-300" /></div>
                    <p className="font-medium text-gray-900 mb-1 text-sm">No students yet</p>
                    <p className="text-xs text-gray-400 mb-4">Add students manually or upload an Excel file</p>
                    <button onClick={() => setShowAddStudentModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add Student
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "sessions" && (
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-5">Attendance Sessions</h3>
                {selectedClass.sessions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClass.sessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-red-100 hover:bg-red-50/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session.status === 'Completed' ? 'bg-emerald-50' : session.status === 'Ongoing' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                            <Calendar className={`w-5 h-5 ${session.status === 'Completed' ? 'text-emerald-500' : session.status === 'Ongoing' ? 'text-amber-500' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{session.date}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{session.presentCount} present</span>
                              <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-400" />{session.absentCount} absent</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-bold ${session.attendancePercentage >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{session.attendancePercentage}%</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${session.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : session.status === 'Ongoing' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{session.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3"><Calendar className="w-6 h-6 text-gray-300" /></div>
                    <p className="font-medium text-gray-900 mb-1 text-sm">No sessions yet</p>
                    <p className="text-xs text-gray-400">Attendance sessions will appear here once recorded</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    // ── Modals ─────────────────────────────────────────────────────────────────

    // ── Modals ─────────────────────────────────────────────────────────────────

    return (
      <div className="min-h-screen bg-gray-50/70 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {viewMode === "list" && renderListView()}
          {viewMode === "upload" && renderUploadView()}
          {viewMode === "detail" && renderDetailView()}
        </div>

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <Modal title="Add Student" onClose={() => setShowAddStudentModal(false)} footer={
            <>
              <button onClick={() => setShowAddStudentModal(false)} disabled={modalLoading} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={addStudent} disabled={!newStudent.studentNumber || !newStudent.name || modalLoading} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {modalLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : "Add Student"}
              </button>
            </>
          }>
            <FormField label="Student ID" required><input type="text" value={newStudent.studentNumber} onChange={e => setNewStudent(p => ({ ...p, studentNumber: e.target.value }))} className={inputCls} placeholder="e.g. 102345678" /></FormField>
            <FormField label="Full Name" required><input type="text" value={newStudent.name} onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. John Doe" /></FormField>
            <FormField label="Program"><input type="text" value={newStudent.program} onChange={e => setNewStudent(p => ({ ...p, program: e.target.value }))} className={inputCls} placeholder="e.g. Computer Science" /></FormField>
            <FormField label="Nationality"><input type="text" value={newStudent.nationality} onChange={e => setNewStudent(p => ({ ...p, nationality: e.target.value }))} className={inputCls} placeholder="e.g. Malaysian" /></FormField>
            <FormField label="Status">
              <select value={newStudent.schoolStatus} onChange={e => setNewStudent(p => ({ ...p, schoolStatus: e.target.value }))} className={inputCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </FormField>
          </Modal>
        )}

        {/* Edit Student Modal */}
        {showEditStudentModal && editingStudent && (
          <Modal title="Edit Student" onClose={() => { setShowEditStudentModal(false); setEditingStudent(null); }} footer={
            <>
              <button onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }} disabled={modalLoading} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={editStudent} disabled={!editingStudent.name || modalLoading} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {modalLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </>
          }>
            <FormField label="Student ID"><input type="text" value={editingStudent.studentNumber} disabled className={`${inputCls} bg-gray-50 text-gray-400`} /></FormField>
            <FormField label="Full Name" required><input type="text" value={editingStudent.name} onChange={e => setEditingStudent(p => p ? { ...p, name: e.target.value } : null)} className={inputCls} /></FormField>
            <FormField label="Program"><input type="text" value={editingStudent.program || ''} onChange={e => setEditingStudent(p => p ? { ...p, program: e.target.value } : null)} className={inputCls} /></FormField>
            <FormField label="Nationality"><input type="text" value={editingStudent.nationality || ''} onChange={e => setEditingStudent(p => p ? { ...p, nationality: e.target.value } : null)} className={inputCls} /></FormField>
            <FormField label="Status">
              <select value={editingStudent.schoolStatus} onChange={e => setEditingStudent(p => p ? { ...p, schoolStatus: e.target.value } : null)} className={inputCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </FormField>
          </Modal>
        )}
      </div>
    );
  }

  // ── Helper Components (Moved outside to prevent re-renders during input) ──

  const Modal = ({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">{footer}</div>
      </div>
    </div>
  );

  const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-400 outline-none transition-colors";