'use client';

import React, { useState, useCallback, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import {
  Plus,
  Upload,
  Search,
  Eye,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
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
  sessionDates: string[];
  students: any[];
  columns: string[];
}

type ViewMode = "list" | "upload" | "detail";

// ─── Constants ───────────────────────────────────────────────────────────────

const RED = "#e4002b";
const RED_LIGHT = "#fff0f2";
const RED_HOVER = "#c90025";

// ─── Fuzzy lecturer matching ──────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeName(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  ta.forEach(t => { if (tb.has(t)) hits++; });
  return hits / Math.min(ta.size, tb.size);
}

function bigramSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const n = normalizeName(s);
    const bg = new Set<string>();
    for (let i = 0; i < n.length - 1; i++) bg.add(n.slice(i, i + 2));
    return bg;
  };
  const ba = bigrams(a), bb = bigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;
  let inter = 0;
  ba.forEach(bg => { if (bb.has(bg)) inter++; });
  return (2 * inter) / (ba.size + bb.size);
}

function lecturerMatchesUser(sheetLecturer: string, sessionName: string): boolean {
  if (!sheetLecturer || !sessionName) return false;
  const overlap = tokenOverlap(sheetLecturer, sessionName);
  const bigram  = bigramSimilarity(sheetLecturer, sessionName);
  const score   = Math.max(overlap, bigram);
  return score >= 0.45;
}

// ─── Helper Components ────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children, footer }: { 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode; 
  footer: React.ReactNode 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Bottom-sheet on mobile, centered modal on sm+ */}
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 sm:py-4 bg-gray-50 border-t border-gray-100">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
};

const FormField = ({ label, required, children }: { 
  label: string; 
  required?: boolean; 
  children: React.ReactNode 
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all";

const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  disabled = false,
  className = ""
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: "primary" | "secondary" | "ghost" | "danger"; 
  disabled?: boolean;
  className?: string;
}) => {
  const base = "inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#E4002B] text-white hover:bg-[#C70026]",
    secondary: "bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-[#E4002B]/20 hover:text-[#E4002B]",
    ghost: "text-gray-600 hover:bg-gray-100",
    danger: "text-red-600 hover:bg-red-50"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const IconButton = ({ 
  icon: Icon, 
  onClick, 
  variant = "default",
  className = ""
}: { 
  icon: React.ElementType; 
  onClick?: (e?: React.MouseEvent) => void; 
  variant?: "default" | "danger";
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`p-1.5 sm:p-2 rounded-xl transition-colors ${variant === "danger" ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"} ${className}`}
  >
    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
  </button>
);

const Badge = ({ 
  children, 
  variant = "default" 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "red" | "green" | "amber" | "blue" | "gray";
}) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    red: "bg-[#e4002b]/10 text-[#e4002b]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-50 text-gray-600"
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) => (
  <div className="text-center py-10 sm:py-12 px-4">
    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
    </div>
    <p className="font-medium text-gray-900 mb-1 text-sm">{title}</p>
    <p className="text-xs sm:text-sm text-gray-400 mb-4">{description}</p>
    {action}
  </div>
);

// ─── Status badge helper ──────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = {
    Completed: { cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    Ongoing:   { cls: "bg-amber-50 text-amber-700",   dot: "bg-amber-500" },
    Scheduled: { cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  }[status] ?? { cls: "bg-gray-100 text-gray-500", dot: "bg-gray-400" };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClassesPage() {
  const { data: session } = useSession();

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
  const [excludedSheets, setExcludedSheets] = useState<{ sheetName: string; lecturer: string }[]>([]);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    studentNumber: "", name: "", program: "", nationality: "", schoolStatus: "Active",
  });
  const [modalLoading, setModalLoading] = useState(false);

  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (showAddStudentModal) {
      setNewStudent({ studentNumber: "", name: "", program: "", nationality: "", schoolStatus: "Active" });
    }
  }, [showAddStudentModal]);

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
    if (!confirm(`Delete ALL ${unitClasses.length} classes for ${unitCode}? This cannot be undone.`)) return;
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
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
      setShowAddStudentModal(false);
    } catch (err) { alert('Failed to add: ' + (err instanceof Error ? err.message : 'Unknown error')); }
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
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to update'); }
      const updatedStudent = await response.json();
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, students: c.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) } : c));
      setSelectedClass(prev => prev ? { ...prev, students: prev.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) } : null);
      setShowEditStudentModal(false);
      setEditingStudent(null);
    } catch (err) { alert('Failed to update: ' + (err instanceof Error ? err.message : 'Unknown error')); }
    finally { setModalLoading(false); }
  };

  const deleteStudent = async (studentId: string) => {
    if (!selectedClass || !studentId) return;
    if (!confirm('Remove this student from the class?')) return;
    try {
      const response = await fetch(`/api/lecturer/unit/${selectedClass.id}/students/${studentId}`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to remove'); }
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c));
      setSelectedClass(prev => prev ? { ...prev, students: prev.students.filter(s => s.id !== studentId) } : null);
    } catch (err) { alert('Failed to remove: ' + (err instanceof Error ? err.message : 'Unknown error')); }
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
    const termYear = parseInt((term || '').split('_')[0], 10) || new Date().getFullYear();
    const dateRow: any[] = allData[5] ?? [];
    const sessionDates: string[] = [];
    for (const cell of dateRow) {
      const val = String(cell ?? '').trim();
      const m = val.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (m) {
        const mm = +m[1], dd = +m[2];
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          sessionDates.push(new Date(termYear, mm - 1, dd).toISOString());
        }
      }
    }
    const coreHeaders = ["Sl.No", "Student Number", "Empty", "Student Name", "Program", "Registered Course", "Nationality", "School Status"];
    const studentData = allData.slice(7)
      .map((row: any[]) => { const p = [...row]; while (p.length < 8) p.push(''); return p.slice(0, 8); })
      .filter((row: any[]) => { const s = String(row[1]).trim(); return row[1] != null && s !== '' && !/^\D/.test(s); });
    return { sheetName, metadata: { term, unitCode, unitName, classType, group, day, time, location, lecturer }, sessionDates, students: studentData, columns: coreHeaders };
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

        const userName = session?.user?.name ?? '';
        const matchedSheets: ParsedSheet[] = [];
        const skippedSheets: { sheetName: string; lecturer: string }[] = [];

        for (const sheet of allSheets) {
          const sheetLecturer = sheet.metadata.lecturer ?? '';
          if (!userName || lecturerMatchesUser(sheetLecturer, userName)) {
            matchedSheets.push(sheet);
          } else {
            skippedSheets.push({ sheetName: sheet.sheetName, lecturer: sheetLecturer });
          }
        }

        if (matchedSheets.length === 0) {
          alert(
            `No sheets matched your name (${userName || 'unknown'}).\n\n` +
            `Lecturers found in this file:\n` +
            skippedSheets.map(s => `  • ${s.sheetName}: ${s.lecturer || 'none listed'}`).join('\n') +
            `\n\nLoading all ${allSheets.length} sheet(s) anyway so you can review them.`
          );
          setParsedSheets(allSheets);
          setExcludedSheets([]);
        } else {
          setParsedSheets(matchedSheets);
          setExcludedSheets(skippedSheets);
        }

        setUploadColumns(allSheets[0].columns);
        setUploadPreview((matchedSheets.length > 0 ? matchedSheets : allSheets)[0].students);
        setUploadFile(file);
        setUploadStep(2);
        const find = (patterns: string[]) => allSheets[0].columns.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))) || "";
        setColumnMapping({ studentId: find(["student number"]), name: find(["student name"]), program: find(["program"]) });
      } catch (err) { console.error('Excel parse error:', err); alert('Error parsing Excel file.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(active); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]); }, [session]);

  // ── Batch import ───────────────────────────────────────────────────────────

  const confirmImport = async () => {
    if (!columnMapping.studentId || !columnMapping.name) { alert('Please map at least Student ID and Name columns'); return; }
    if (!uploadFile || parsedSheets.length === 0) return;
    setLoading(true);

    try {
      const batchPayload = parsedSheets.map(sheet => {
        const { metadata, sessionDates, students: studentData, columns } = sheet;
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
              studentId, name,
              programName: programCol >= 0 ? row[programCol]?.toString().trim() || null : null,
              nationality: nationalityCol >= 0 ? row[nationalityCol]?.toString().trim() || null : null,
              schoolStatus: statusCol >= 0 ? row[statusCol]?.toString().trim() || null : null,
            };
          })
          .filter(Boolean);

        return {
          unit: {
            code: metadata.unitCode || 'UNKNOWN',
            name: metadata.unitName || 'Imported Unit',
            semester: metadata.term || '2026_MAR_S1',
            sessionType: metadata.classType || '',
            groupNo: metadata.group || '',
            day: metadata.day || '',
            time: metadata.time || '',
            location: metadata.location || '',
            sessionDates: sessionDates.length > 0 ? sessionDates : undefined,
          },
          students,
        };
      });

      const response = await fetch('/api/lecturer/import/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Batch import failed');
      }

      const result = await response.json();

      const refreshed = await fetch('/api/lecturer/unit');
      if (!refreshed.ok) throw new Error('Failed to refresh class list');
      const data = await refreshed.json();
      setClasses(data);
      setExpandedUnits(new Set<string>(data.map((c: ClassData) => c.unitCode)));

      setUploadFile(null); setUploadPreview([]); setUploadColumns([]);
      setColumnMapping({ studentId: '', name: '', program: '' });
      setParsedSheets([]); setExcludedSheets([]); setUploadStep(1);
      setViewMode('list');

      alert(`Import complete!\n${result.totalCreated} new students created\n${result.totalEnrolled} enrollments added across ${result.sheets.length} class${result.sheets.length !== 1 ? 'es' : ''}`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Import failed: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading && viewMode === 'list') return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin text-[#e4002b]" />
        <span className="text-sm font-medium">Loading classes...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="p-6 sm:p-8 text-center max-w-md w-full">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Error Loading Classes</h3>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    </div>
  );

  // ── Views ──────────────────────────────────────────────────────────────────

  const renderListView = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">Classes</h1>
          <p className="mt-2 text-sm text-gray-500">Manage units, groups, and enrollments</p>
        </div>
        <Button onClick={() => setViewMode("upload")} className="shrink-0">
          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Upload Master List</span>
          <span className="sm:hidden">Upload</span>
        </Button>
      </div>

      {/* Stats — 2×2 on mobile */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Units", value: units.length, icon: BookOpen, color: "blue" },
          { label: "Classes", value: stats.classCount, icon: BarChart3, color: "blue" },
          { label: "Students", value: stats.totalStudents, icon: Users, color: "green", sub: "unique" },
          { label: "At Risk", value: stats.atRiskStudents, icon: ShieldAlert, color: "red" },
        ].map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 truncate">{stat.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${stat.color === 'red' ? 'text-[#e4002b]' : stat.color === 'green' ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {stat.value}
                </p>
                {stat.sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{stat.sub}</p>}
              </div>
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${stat.color === 'red' ? 'bg-red-50' : stat.color === 'green' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color === 'red' ? 'text-[#e4002b]' : stat.color === 'green' ? 'text-emerald-600' : 'text-gray-600'}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search units or class types..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      {/* Units */}
      <div className="space-y-2 sm:space-y-3">
        {units.length === 0 ? (
          <Card className="py-12 sm:py-16">
            <EmptyState 
              icon={FolderOpen} 
              title="No classes yet" 
              description="Upload a Swinburne master attendance form to get started."
              action={<Button onClick={() => setViewMode("upload")}><Upload className="w-3.5 h-3.5" /> Upload List</Button>}
            />
          </Card>
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
              <Card key={unit.unitCode} className="overflow-hidden">
                {/* Unit Header */}
                <div className="flex items-center gap-2 px-3 sm:px-5 py-3 sm:py-4 hover:bg-gray-50/60 transition-colors">
                  <button className="flex items-center gap-3 flex-1 text-left min-w-0" onClick={() => toggleUnit(unit.unitCode)}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#e4002b] flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                      {unit.unitCode.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{unit.unitCode}</span>
                        <Badge variant="gray">{filtered.length} class{filtered.length !== 1 ? 'es' : ''}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{unit.unitName}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 mr-1">
                      <Users className="w-3 h-3" />{unit.totalStudents}
                    </span>
                    <IconButton icon={Trash2} onClick={(e) => { e?.stopPropagation(); deleteAllClassesForUnit(unit.unitCode, unit.classes); }} variant="danger" />
                    <IconButton icon={isExpanded ? ChevronUp : ChevronDown} onClick={() => toggleUnit(unit.unitCode)} />
                  </div>
                </div>

                {/* Classes Grid */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                      {filtered.map(cls => {
                        const avg = cls.sessions.length > 0
                          ? Math.round(cls.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / cls.sessions.length)
                          : null;
                        const sessionLabel = cls.classType === 'LECTURE' ? 'Lecture' : cls.classType === 'LAB' ? 'Lab' : cls.classType === 'TUTORIAL' ? 'Tutorial' : cls.classType || 'Class';
                        
                        return (
                          <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSelectedClass(cls); setViewMode("detail"); }}>
                            <div className="h-1 bg-[#e4002b]" />
                            <div className="p-3 sm:p-4">
                              <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                                <div className="min-w-0">
                                  <Badge variant="red">{sessionLabel}{cls.group ? ` · ${cls.group}` : ''}</Badge>
                                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mt-1.5 line-clamp-1">{cls.unitName}</h3>
                                </div>
                              </div>

                              <div className="space-y-1 mb-3 sm:mb-4">
                                {(cls.day || cls.time) && (
                                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
                                    <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="truncate">{[cls.day, cls.time].filter(Boolean).join(', ')}</span>
                                  </div>
                                )}
                                {cls.location && (
                                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
                                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="truncate">{cls.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
                                  <Users className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>{cls.students.length} students</span>
                                </div>
                              </div>

                              {avg !== null && (
                                <div className="pt-2.5 sm:pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                                    <span className="text-gray-400">Attendance</span>
                                    <span className={`font-semibold ${avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-amber-500' : 'text-[#e4002b]'}`}>{avg}%</span>
                                  </div>
                                  <div className="h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${avg >= 80 ? 'bg-emerald-500' : avg >= 60 ? 'bg-amber-400' : 'bg-[#e4002b]'}`} style={{ width: `${avg}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderUploadView = () => (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <button
          onClick={() => { setViewMode("list"); setUploadStep(1); setUploadFile(null); setUploadPreview([]); setParsedSheets([]); setExcludedSheets([]); }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-3 sm:mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Classes
        </button>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">Upload Master List</h1>
        <p className="mt-2 text-sm text-gray-500">Import from Swinburne attendance form</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl sm:rounded-[2rem] shadow-sm px-6 py-4">
        {[{ n: 1, label: 'Upload' }, { n: 2, label: 'Map columns' }].map(({ n, label }, i) => (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${uploadStep >= n ? 'bg-[#e4002b] text-white' : 'bg-gray-100 text-gray-400'}`}>
                {uploadStep > n ? <Check className="w-3 h-3" /> : n}
              </span>
              <span className={`text-xs sm:text-sm font-medium ${uploadStep >= n ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i === 0 && <div className="flex-1 h-px bg-gray-100"><div className={`h-full bg-[#e4002b] transition-all duration-500 ${uploadStep >= 2 ? 'w-full' : 'w-0'}`} /></div>}
          </React.Fragment>
        ))}
      </div>

      <Card className="overflow-hidden">
        {uploadStep === 1 ? (
          <div className="p-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${isDragging ? 'border-[#e4002b] bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              onDragEnter={e => handleDrag(e, true)} onDragLeave={e => handleDrag(e, false)}
              onDragOver={e => e.preventDefault()} onDrop={handleDrop}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-[#e4002b]" />
              </div>
              <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Drop Excel file here</p>
              <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6">Each sheet = one class group</p>
              <input type="file" accept=".xlsx,.xls" id="file-upload" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-4 py-3 bg-[#E4002B] text-sm font-semibold rounded-2xl text-white hover:bg-[#C70026] cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Choose File
              </label>
              <p className="text-xs text-gray-300 mt-3 sm:mt-4">.xlsx, .xls · up to 10 MB</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 sm:space-y-6">
            {/* Matched sheets */}
            {parsedSheets.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#e4002b]" />
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
                    {parsedSheets.length} sheet{parsedSheets.length !== 1 ? 's' : ''} matched — <span className="text-[#e4002b]">{parsedSheets[0].metadata.unitCode}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  {parsedSheets.map((sheet, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-[10px] sm:text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{sheet.sheetName}</span>
                        <Badge variant="red">{sheet.metadata.classType}{sheet.metadata.group ? ` ${sheet.metadata.group}` : ''}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 flex-wrap">
                        {sheet.metadata.day && <span>{sheet.metadata.day}</span>}
                        {sheet.metadata.location && <span>{sheet.metadata.location}</span>}
                        <span className="font-medium text-gray-600">{sheet.students.length} students</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Excluded sheets */}
            {excludedSheets.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
                    {excludedSheets.length} sheet{excludedSheets.length !== 1 ? 's' : ''} excluded
                  </p>
                </div>
                <div className="space-y-1.5">
                  {excludedSheets.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] sm:text-xs bg-white rounded-lg px-3 py-2 border border-amber-100 gap-2">
                      <span className="font-medium text-gray-600 shrink-0">{s.sheetName}</span>
                      <span className="text-gray-400 truncate">{s.lecturer || 'No lecturer listed'}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] sm:text-xs text-amber-600 mt-2">These classes are taught by a different lecturer and will not be imported.</p>
              </div>
            )}

            {/* Column mapping */}
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Map Columns</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-3 sm:mb-4">Applies to all matched sheets</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: "Student ID", key: "studentId", required: true },
                  { label: "Name", key: "name", required: true },
                  { label: "Program", key: "program", required: false }
                ].map(({ label, key, required }) => (
                  <div key={key}>
                    <label className="text-[10px] sm:text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                      {label} {required && <span className="text-[#e4002b]">*</span>}
                    </label>
                    <select
                      value={(columnMapping as any)[key]}
                      onChange={e => setColumnMapping(p => ({ ...p, [key]: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Select column...</option>
                      {uploadColumns.map((col, i) => <option key={i} value={col}>{col}</option>)}
                    </select>
                    {(columnMapping as any)[key] && (
                      <p className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 mt-1">
                        <Check className="w-3 h-3" /> Mapped
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview — hidden on very small, shown on sm+ */}
            <div className="hidden sm:block">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview (First Matched Sheet)</h3>
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

            <div className="flex items-center justify-end gap-2 sm:gap-3 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setUploadStep(1)}>Back</Button>
              <Button onClick={confirmImport} disabled={!columnMapping.studentId || !columnMapping.name || loading}>
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Import {parsedSheets.length} Class{parsedSheets.length !== 1 ? 'es' : ''}</>}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderDetailView = () => {
    if (!selectedClass) return null;
    const avg = selectedClass.sessions.length > 0
      ? Math.round(selectedClass.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / selectedClass.sessions.length)
      : null;
    const sessionLabel = selectedClass.classType === 'LECTURE' ? 'Lecture' : selectedClass.classType === 'LAB' ? 'Lab' : selectedClass.classType === 'TUTORIAL' ? 'Tutorial' : selectedClass.classType || 'Class';

    return (
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
        <button onClick={() => setViewMode("list")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Classes
        </button>

        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-[#e4002b]" />
          <div className="p-6">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="red">{selectedClass.unitCode}</Badge>
              <Badge variant="gray">{sessionLabel}{selectedClass.group ? ` · ${selectedClass.group}` : ''}</Badge>
            </div>

            {/* Unit name */}
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 mb-3 leading-snug">{selectedClass.unitName}</h1>

            {/* Meta info — wraps to 2 cols on mobile */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500">
              {(selectedClass.day || selectedClass.time) && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{[selectedClass.day, selectedClass.time].filter(Boolean).join(', ')}</span>
                </span>
              )}
              {selectedClass.location && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{selectedClass.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {selectedClass.students.length} students
              </span>
              {avg !== null && (
                <span className={`flex items-center gap-1.5 font-medium ${avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-amber-500' : 'text-[#e4002b]'}`}>
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />{avg}% avg
                </span>
              )}
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
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 text-xs sm:text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-[#e4002b]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs ${activeTab === tab.id ? 'bg-red-50 text-[#e4002b]' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e4002b]" />}
              </button>
            ))}
          </div>
        </Card>

        {/* Content */}
        <Card>
          {activeTab === "students" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Students</h3>
                <Button onClick={() => setShowAddStudentModal(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Student
                </Button>
              </div>
              
              {selectedClass.students.length > 0 ? (
                <>
                  {/* Mobile: card list */}
                  <div className="sm:hidden space-y-2">
                    {selectedClass.students.map(student => {
                      const status = student.schoolStatus || "Active";
                      const statusConfig = {
                        Active: { variant: 'green' as const, icon: CheckCircle2 },
                        Inactive: { variant: 'gray' as const, icon: X },
                        Suspended: { variant: 'amber' as const, icon: AlertCircle }
                      };
                      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Active;

                      return (
                        <div key={student.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-red-100 hover:bg-red-50/10 transition-colors group">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-medium text-gray-900 text-xs truncate">{student.name}</span>
                              <Badge variant={config.variant}>
                                <config.icon className="w-2.5 h-2.5 mr-0.5" />
                                {status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                              <span className="font-mono">{student.studentNumber}</span>
                              {student.program && <span className="truncate max-w-[120px]">{student.program}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <IconButton icon={Edit2} onClick={() => { setEditingStudent(student); setShowEditStudentModal(true); }} />
                            <IconButton icon={Trash2} onClick={() => deleteStudent(student.id)} variant="danger" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden sm:block overflow-x-auto -mx-6">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100">
                        <tr className="text-left">
                          {["ID", "Name", "Program", "Nationality", "Status", ""].map((h, i) => (
                            <th key={i} className={`px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedClass.students.map(student => {
                          const status = student.schoolStatus || "Active";
                          const statusConfig = {
                            Active: { variant: 'green' as const, icon: CheckCircle2 },
                            Inactive: { variant: 'gray' as const, icon: X },
                            Suspended: { variant: 'amber' as const, icon: AlertCircle }
                          };
                          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Active;
                          
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/60 group">
                              <td className="px-6 py-3.5 font-mono text-xs text-gray-500">{student.studentNumber}</td>
                              <td className="px-6 py-3.5 font-medium text-gray-900">{student.name}</td>
                              <td className="px-6 py-3.5 text-gray-500 text-xs max-w-[180px] truncate">{student.program || '—'}</td>
                              <td className="px-6 py-3.5 text-gray-500 text-xs">{student.nationality || '—'}</td>
                              <td className="px-6 py-3.5">
                                <Badge variant={config.variant}>
                                  <config.icon className="w-3 h-3 mr-1" />{status}
                                </Badge>
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <IconButton icon={Edit2} onClick={() => { setEditingStudent(student); setShowEditStudentModal(true); }} />
                                  <IconButton icon={Trash2} onClick={() => deleteStudent(student.id)} variant="danger" />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <EmptyState 
                  icon={Users} 
                  title="No students" 
                  description="Add students manually or upload an Excel file"
                  action={<Button onClick={() => setShowAddStudentModal(true)}><Plus className="w-3.5 h-3.5" /> Add Student</Button>}
                />
              )}
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 sm:mb-5 text-sm sm:text-base">Attendance Sessions</h3>
              {selectedClass.sessions.length > 0 ? (
                <div className="space-y-2">
                  {selectedClass.sessions.map(sess => (
                    <div key={sess.id} className="flex items-center gap-3 p-3 sm:p-4 border border-gray-100 rounded-xl hover:border-red-100 hover:bg-red-50/10 transition-colors">
                      {/* Icon */}
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${sess.status === 'Completed' ? 'bg-emerald-50' : sess.status === 'Ongoing' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        <Calendar className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${sess.status === 'Completed' ? 'text-emerald-500' : sess.status === 'Ongoing' ? 'text-amber-500' : 'text-gray-400'}`} />
                      </div>

                      {/* Date + counts */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-xs sm:text-sm">{sess.date}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-gray-400">
                          <span className="flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{sess.presentCount}</span>
                          <span className="flex items-center gap-0.5"><X className="w-3 h-3 text-red-400" />{sess.absentCount}</span>
                        </div>
                      </div>

                      {/* Percentage + status — stacked on mobile */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs sm:text-sm font-bold ${sess.attendancePercentage >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {sess.attendancePercentage}%
                        </span>
                        <StatusBadge status={sess.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={Calendar} 
                  title="No sessions" 
                  description="Attendance sessions appear here once recorded"
                />
              )}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">

      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="hover:text-gray-600 cursor-default">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Classes</span>
      </nav>

      {viewMode === "list" && renderListView()}
      {viewMode === "upload" && renderUploadView()}
      {viewMode === "detail" && renderDetailView()}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <Modal title="Add Student" onClose={() => setShowAddStudentModal(false)} footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddStudentModal(false)} disabled={modalLoading}>Cancel</Button>
            <Button onClick={addStudent} disabled={!newStudent.studentNumber || !newStudent.name || modalLoading}>
              {modalLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : "Add Student"}
            </Button>
          </>
        }>
          <FormField label="Student ID" required>
            <input type="text" value={newStudent.studentNumber} onChange={e => setNewStudent(p => ({ ...p, studentNumber: e.target.value }))} className={inputCls} placeholder="e.g. 102345678" />
          </FormField>
          <FormField label="Full Name" required>
            <input type="text" value={newStudent.name} onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. John Doe" />
          </FormField>
          <FormField label="Program">
            <input type="text" value={newStudent.program} onChange={e => setNewStudent(p => ({ ...p, program: e.target.value }))} className={inputCls} placeholder="e.g. Computer Science" />
          </FormField>
          <FormField label="Nationality">
            <input type="text" value={newStudent.nationality} onChange={e => setNewStudent(p => ({ ...p, nationality: e.target.value }))} className={inputCls} placeholder="e.g. Malaysian" />
          </FormField>
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
            <Button variant="ghost" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }} disabled={modalLoading}>Cancel</Button>
            <Button onClick={editStudent} disabled={!editingStudent.name || modalLoading}>
              {modalLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </>
        }>
          <FormField label="Student ID">
            <input type="text" value={editingStudent.studentNumber} disabled className={`${inputCls} bg-gray-50 text-gray-400`} />
          </FormField>
          <FormField label="Full Name" required>
            <input type="text" value={editingStudent.name} onChange={e => setEditingStudent(p => p ? { ...p, name: e.target.value } : null)} className={inputCls} />
          </FormField>
          <FormField label="Program">
            <input type="text" value={editingStudent.program || ''} onChange={e => setEditingStudent(p => p ? { ...p, program: e.target.value } : null)} className={inputCls} />
          </FormField>
          <FormField label="Nationality">
            <input type="text" value={editingStudent.nationality || ''} onChange={e => setEditingStudent(p => p ? { ...p, nationality: e.target.value } : null)} className={inputCls} />
          </FormField>
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