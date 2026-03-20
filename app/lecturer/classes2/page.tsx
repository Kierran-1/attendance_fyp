
'use client';

import { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  Plus, 
  Upload, 
  Search, 
  Eye, 
  Play, 
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
  GraduationCap
} from "lucide-react";

// Types
interface Student {
  id: string;
  studentNumber: string;
  name: string;
  email: string;
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
  classCode: string;
  className: string;
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

type ViewMode = "list" | "create" | "upload" | "detail";

const INITIAL_CLASSES: ClassData[] = [
  {
    id: "1",
    classCode: "COS40005",
    className: "Final Year Project",
    day: "Monday",
    time: "09:00 - 11:00",
    location: "B201",
    createdAt: "2026-03-01",
    students: [
      { id: "1", studentNumber: "102345678", name: "Ahmad Hakim", email: "ahmad.h@student.swin.edu.my", program: "Bachelor of Computer Science" },
      { id: "2", studentNumber: "102345679", name: "Priya Nair", email: "priya.n@student.swin.edu.my", program: "Bachelor of Computer Science" },
      { id: "3", studentNumber: "102345680", name: "Lee Wei Jian", email: "lee.wj@student.swin.edu.my", program: "Bachelor of Data Science" },
    ],
    sessions: [
      { id: "s1", date: "2026-03-10", attendancePercentage: 85, status: "Completed", presentCount: 3, absentCount: 0, lateCount: 0, sickCount: 0 },
      { id: "s2", date: "2026-03-17", attendancePercentage: 67, status: "Completed", presentCount: 2, absentCount: 1, lateCount: 0, sickCount: 0 },
    ]
  },
  {
    id: "2",
    classCode: "COS20031",
    className: "Database Design Project",
    day: "Tuesday",
    time: "13:00 - 15:00",
    location: "G603",
    createdAt: "2026-03-01",
    students: [],
    sessions: []
  }
];

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>(INITIAL_CLASSES);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "sessions" | "summary">("students");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [createForm, setCreateForm] = useState({
    classCode: "",
    className: "",
    day: "Monday",
    time: "",
    location: ""
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploadColumns, setUploadColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    studentId: "",
    name: "",
    email: "",
    program: ""
  });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  
  const [parsedMetadata, setParsedMetadata] = useState<{
    term?: string;
    unitCode?: string;
    unitName?: string;
    classType?: string;
    group?: string;
    day?: string;
    time?: string;
    room?: string;
    lecturer?: string;
  }>({});

  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      c.classCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.className.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

  const stats = useMemo(() => {
    const totalStudents = classes.reduce((acc, c) => acc + c.students.length, 0);
    const totalSessions = classes.reduce((acc, c) => acc + c.sessions.length, 0);
    const atRiskStudents = classes.reduce((acc, c) => {
      const avgAttendance = c.sessions.length > 0
        ? c.sessions.reduce((s, sess) => s + sess.attendancePercentage, 0) / c.sessions.length
        : 100;
      return acc + (avgAttendance < 80 ? c.students.length : 0);
    }, 0);
    
    return { totalStudents, totalSessions, atRiskStudents, classCount: classes.length };
  }, [classes]);

  const handleCreateClass = () => {
    if (!createForm.classCode || !createForm.className) return;
    
    const newClass: ClassData = {
      id: Date.now().toString(),
      classCode: createForm.classCode,
      className: createForm.className,
      day: createForm.day,
      time: createForm.time || "TBA",
      location: createForm.location || "TBA",
      students: [],
      sessions: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setClasses(prev => [...prev, newClass]);
    setCreateForm({ classCode: "", className: "", day: "Monday", time: "", location: "" });
    setViewMode("list");
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[];
        
        if (allData.length < 8) {
          alert('File does not contain enough rows. Expected Swinburne attendance format.');
          return;
        }

        const row4 = allData[3] || [];
        const row4Text = row4.join(' ');
        
        const termMatch = row4Text.match(/Term\\s*:\\s*([^,]+)/i);
        const term = termMatch ? termMatch[1].trim() : '';
        
        const unitMatch = row4Text.match(/Unit\\s*:\\s*([^-]+)-\\s*(.+)/i);
        const unitCode = unitMatch ? unitMatch[1].trim() : '';
        const unitName = unitMatch ? unitMatch[2].trim() : '';
        
        const row5 = allData[4] || [];
        const row5Text = row5.join(', ');
        
        const classDetails = row5Text.split(',').map((s: string) => s.trim());
        const classType = classDetails[0] || '';
        const group = classDetails[1] || '';
        const day = classDetails[2] || '';
        const time = classDetails[3] || '';
        const room = classDetails[4] || '';
        const lecturer = classDetails[5] || '';

        const headerRow = allData[5] || [];
        const headers = headerRow.map((h: any, idx: number) => {
          if (h && h.toString().trim()) return h.toString().trim();
          if (idx === 1) return 'Student Number';
          if (idx === 3) return 'Student Name';
          return `Column${idx + 1}`;
        });

        const studentData = allData.slice(7, 12);

        setParsedMetadata({
          term,
          unitCode,
          unitName,
          classType,
          group,
          day,
          time,
          room,
          lecturer
        });
        
        setUploadColumns(headers);
        setUploadPreview(studentData);
        setUploadFile(file);
        setUploadStep(2);
        
        const findColumn = (patterns: string[]) => {
          return headers.find(h => patterns.some(p => h?.toLowerCase().includes(p.toLowerCase()))) || "";
        };
        
        setColumnMapping({
          studentId: findColumn(["student number", "studentnumber", "student_id", "studentid", "id"]),
          name: findColumn(["student name", "studentname", "name", "fullname"]),
          email: findColumn(["email", "e-mail", "mail"]) || "",
          program: findColumn(["program", "course", "degree"]) || ""
        });
        
      } catch (error) {
        console.error('Error parsing Excel:', error);
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
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const confirmImport = () => {
    if (!columnMapping.studentId || !columnMapping.name) {
      alert('Please map at least Student ID and Name columns');
      return;
    }
    
    if (!uploadFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[];
        
        const studentData = allData.slice(7);
        const headers = uploadColumns;
        
        const newStudents: Student[] = studentData
          .filter((row: any) => row && row.length > 0)
          .map((row: any, idx: number) => {
            const studentNumber = row[headers.indexOf(columnMapping.studentId)]?.toString() || "";
            const name = row[headers.indexOf(columnMapping.name)]?.toString() || "";
            
            if (!studentNumber || !name) return null;
            
            return {
              id: Date.now().toString() + idx,
              studentNumber,
              name,
              email: columnMapping.email ? row[headers.indexOf(columnMapping.email)]?.toString() || "" : "",
              program: columnMapping.program ? row[headers.indexOf(columnMapping.program)]?.toString() || "" : "",
              nationality: row[headers.findIndex((h: string) => h.toLowerCase().includes('nationality'))]?.toString() || "",
              schoolStatus: row[headers.findIndex((h: string) => h.toLowerCase().includes('school status'))]?.toString() || ""
            };
          })
          .filter((s: Student | null): s is Student => s !== null);
        
        const newClass: ClassData = {
          id: Date.now().toString(),
          classCode: parsedMetadata.unitCode || "IMPORTED",
          className: parsedMetadata.unitName || "Imported Class",
          day: parsedMetadata.day || "TBA",
          time: parsedMetadata.time || "TBA",
          location: parsedMetadata.room || "TBA",
          lecturer: parsedMetadata.lecturer,
          classType: parsedMetadata.classType,
          group: parsedMetadata.group,
          term: parsedMetadata.term,
          students: newStudents,
          sessions: [],
          createdAt: new Date().toISOString().split('T')[0]
        };
        
        setClasses(prev => [...prev, newClass]);
        
        setUploadFile(null);
        setUploadPreview([]);
        setUploadColumns([]);
        setColumnMapping({ studentId: "", name: "", email: "", program: "" });
        setParsedMetadata({});
        setUploadStep(1);
        setViewMode("list");
        
      } catch (error) {
        console.error('Error importing:', error);
        alert('Error importing students');
      }
    };
    reader.readAsBinaryString(uploadFile);
  };

  const removeStudent = (studentId: string) => {
    if (!selectedClass) return;
    setClasses(prev => prev.map(c => 
      c.id === selectedClass.id 
        ? { ...c, students: c.students.filter(s => s.id !== studentId) }
        : c
    ));
    setSelectedClass(prev => prev ? { ...prev, students: prev.students.filter(s => s.id !== studentId) } : null);
  };

  const createSession = () => {
    if (!selectedClass) return;
    const newSession: Session = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      attendancePercentage: 0,
      status: "Scheduled",
      presentCount: 0,
      absentCount: selectedClass.students.length,
      lateCount: 0,
      sickCount: 0
    };
    
    setClasses(prev => prev.map(c => 
      c.id === selectedClass.id 
        ? { ...c, sessions: [...c.sessions, newSession] }
        : c
    ));
    setSelectedClass(prev => prev ? { ...prev, sessions: [...prev.sessions, newSession] } : null);
  };

  const deleteClass = (classId: string) => {
    if (confirm("Are you sure you want to delete this class?")) {
      setClasses(prev => prev.filter(c => c.id !== classId));
      if (selectedClass?.id === classId) {
        setSelectedClass(null);
        setViewMode("list");
      }
    }
  };

  const renderListView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Classes</span>
            <span className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="w-4 h-4 text-blue-600" /></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.classCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Students</span>
            <span className="p-2 bg-green-50 rounded-lg"><Users className="w-4 h-4 text-green-600" /></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Sessions Held</span>
            <span className="p-2 bg-purple-50 rounded-lg"><Calendar className="w-4 h-4 text-purple-600" /></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">At Risk</span>
            <span className="p-2 bg-red-50 rounded-lg"><AlertCircle className="w-4 h-4 text-red-600" /></span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.atRiskStudents}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setViewMode("upload")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Excel
          </button>
          <button
            onClick={() => setViewMode("create")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((cls) => {
          const avgAttendance = cls.sessions.length > 0
            ? Math.round(cls.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / cls.sessions.length)
            : 0;
          
          return (
            <div 
              key={cls.id} 
              className="group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">{cls.classCode}</p>
                      {cls.classType && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {cls.classType}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">{cls.className}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => deleteClass(cls.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{cls.day}, {cls.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{cls.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{cls.students.length} Students</span>
                  </div>
                  {cls.lecturer && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <span>{cls.lecturer}</span>
                    </div>
                  )}
                </div>

                {cls.sessions.length > 0 && (
                  <div className="mb-4 pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Avg Attendance</span>
                      <span className={`font-semibold ${avgAttendance >= 80 ? 'text-green-600' : avgAttendance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {avgAttendance}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${avgAttendance >= 80 ? 'bg-green-500' : avgAttendance >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${avgAttendance}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setSelectedClass(cls); setViewMode("detail"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => {/* Navigate to attendance page */}}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCreateView = () => (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-6 border-b">
          <button 
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Classes
          </button>
          <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
          <p className="text-sm text-gray-500 mt-1">Set up a new class for attendance tracking</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Class Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g., COS40005"
                value={createForm.classCode}
                onChange={(e) => setCreateForm(prev => ({ ...prev, classCode: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Class Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g., Final Year Project"
                value={createForm.className}
                onChange={(e) => setCreateForm(prev => ({ ...prev, className: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Day</label>
              <select
                value={createForm.day}
                onChange={(e) => setCreateForm(prev => ({ ...prev, day: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm bg-white"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Time</label>
              <input
                type="text"
                placeholder="e.g., 09:00 - 11:00"
                value={createForm.time}
                onChange={(e) => setCreateForm(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Location (Optional)</label>
            <input
              type="text"
              placeholder="e.g., B201, G603"
              value={createForm.location}
              onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={() => setViewMode("list")}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateClass}
            disabled={!createForm.classCode || !createForm.className}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Create Class
          </button>
        </div>
      </div>
    </div>
  );

  const renderUploadView = () => (
    <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-6 border-b">
          <button 
            onClick={() => {
              setViewMode("list");
              setUploadStep(1);
              setUploadFile(null);
              setUploadPreview([]);
              setParsedMetadata({});
            }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Classes
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${uploadStep >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
              <span className={`text-sm font-medium ${uploadStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>Upload</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200">
              <div className={`h-full bg-red-600 transition-all duration-300 ${uploadStep >= 2 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${uploadStep >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</span>
              <span className={`text-sm font-medium ${uploadStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>Map Columns</span>
            </div>
          </div>
        </div>

        {uploadStep === 1 ? (
          <div className="p-8">
            <div 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              onDragEnter={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Swinburne Attendance Form</h3>
              <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
                Upload the official Swinburne attendance Excel file.
              </p>
              <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">
                The system will automatically extract class information from rows 4-5 and student data from row 8 onwards.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>
              <p className="text-xs text-gray-400 mt-4">Supports .xlsx, .xls • Max 10MB</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {Object.keys(parsedMetadata).length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Detected Class Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {parsedMetadata.unitCode && (
                    <div>
                      <span className="text-blue-600 text-xs uppercase">Unit Code</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.unitCode}</p>
                    </div>
                  )}
                  {parsedMetadata.unitName && (
                    <div className="col-span-2">
                      <span className="text-blue-600 text-xs uppercase">Unit Name</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.unitName}</p>
                    </div>
                  )}
                  {parsedMetadata.classType && (
                    <div>
                      <span className="text-blue-600 text-xs uppercase">Type</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.classType}</p>
                    </div>
                  )}
                  {parsedMetadata.group && (
                    <div>
                      <span className="text-blue-600 text-xs uppercase">Group</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.group}</p>
                    </div>
                  )}
                  {parsedMetadata.day && (
                    <div>
                      <span className="text-blue-600 text-xs uppercase">Day</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.day}</p>
                    </div>
                  )}
                  {parsedMetadata.time && (
                    <div>
                      <span className="text-blue-600 text-xs uppercase">Time</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.time}</p>
                    </div>
                  )}
                  {parsedMetadata.room && (
                    <div>
                      <span className="text-blue-600 text-xs uppercase">Room</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.room}</p>
                    </div>
                  )}
                  {parsedMetadata.lecturer && (
                    <div className="col-span-2">
                      <span className="text-blue-600 text-xs uppercase">Lecturer</span>
                      <p className="font-semibold text-blue-900">{parsedMetadata.lecturer}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Excel Columns</h3>
              <p className="text-sm text-gray-500">Verify the column mappings for student data. The system has auto-detected based on the Swinburne format.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.studentId}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                >
                  <option value="">Select column...</option>
                  {uploadColumns.map((col, idx) => (
                    <option key={idx} value={col}>{col}</option>
                  ))}
                </select>
                {columnMapping.studentId && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Mapped</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.name}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                >
                  <option value="">Select column...</option>
                  {uploadColumns.map((col, idx) => (
                    <option key={idx} value={col}>{col}</option>
                  ))}
                </select>
                {columnMapping.name && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Mapped</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Program (Optional)</label>
                <select
                  value={columnMapping.program}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, program: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                >
                  <option value="">Select column...</option>
                  {uploadColumns.map((col, idx) => (
                    <option key={idx} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email (Optional)</label>
                <select
                  value={columnMapping.email}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                >
                  <option value="">Select column...</option>
                  {uploadColumns.map((col, idx) => (
                    <option key={idx} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Student Data Preview (First 5 rows)</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {uploadColumns.slice(0, 8).map((col, idx) => (
                        <th key={idx} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uploadPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {uploadColumns.slice(0, 8).map((_, colIdx) => (
                          <td key={colIdx} className="px-4 py-2 text-gray-600 whitespace-nowrap">
                            {row[colIdx]?.toString() || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUploadStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={confirmImport}
                disabled={!columnMapping.studentId || !columnMapping.name}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDetailView = () => {
    if (!selectedClass) return null;
    
    const avgAttendance = selectedClass.sessions.length > 0
      ? Math.round(selectedClass.sessions.reduce((a, s) => a + s.attendancePercentage, 0) / selectedClass.sessions.length)
      : 0;
    
    const atRiskCount = selectedClass.students.filter(s => {
      const studentAvg = selectedClass.sessions.length > 0 ? avgAttendance : 100;
      return studentAvg < 80;
    }).length;

    return (
      <div className="animate-in slide-in-from-right-4 duration-300">
        <div className="bg-white rounded-xl border shadow-sm mb-6 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />
          <div className="p-6">
            <button 
              onClick={() => setViewMode("list")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Classes
            </button>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    {selectedClass.classCode}
                  </span>
                  {selectedClass.classType && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {selectedClass.classType} • Group {selectedClass.group}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{selectedClass.createdAt}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedClass.className}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {selectedClass.day}, {selectedClass.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {selectedClass.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {selectedClass.students.length} Students
                  </span>
                  {selectedClass.lecturer && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      {selectedClass.lecturer}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode("upload")}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Upload Students
                </button>
                <button
                  onClick={() => {/* Navigate to attendance */}}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Play className="w-4 h-4" />
                  Start Attendance
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex border-t">
            {[
              { id: "students", label: "Students", icon: Users, count: selectedClass.students.length },
              { id: "sessions", label: "Sessions", icon: Calendar, count: selectedClass.sessions.length },
              { id: "summary", label: "Summary", icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm min-h-[400px]">
          {activeTab === "students" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Student List</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Student
                </button>
              </div>
              
              {selectedClass.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Student ID</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Program</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Nationality</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedClass.students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3 font-mono text-gray-600">{student.studentNumber}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                          <td className="px-4 py-3 text-gray-600">{student.email || "-"}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{student.program || "-"}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{student.nationality || "-"}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => removeStudent(student.id)}
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
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-gray-900 font-medium mb-1">No students yet</h4>
                  <p className="text-sm text-gray-500 mb-4">Upload a Swinburne attendance form to import students</p>
                  <button
                    onClick={() => setViewMode("upload")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Students
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Attendance Sessions</h3>
                <button 
                  onClick={createSession}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Session
                </button>
              </div>
              
              {selectedClass.sessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedClass.sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-red-300 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${session.status === 'Completed' ? 'bg-green-100' : session.status === 'Ongoing' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                          <Calendar className={`w-6 h-6 ${session.status === 'Completed' ? 'text-green-600' : session.status === 'Ongoing' ? 'text-amber-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{session.date}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              {session.presentCount} Present
                            </span>
                            <span className="flex items-center gap-1">
                              <X className="w-3.5 h-3.5 text-red-500" />
                              {session.absentCount} Absent
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-semibold ${session.attendancePercentage >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                              {session.attendancePercentage}%
                            </span>
                            <span className="text-xs text-gray-500">attendance</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                            session.status === 'Ongoing' ? 'bg-amber-100 text-amber-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-gray-900 font-medium mb-1">No sessions yet</h4>
                  <p className="text-sm text-gray-500 mb-4">Create your first attendance session</p>
                  <button
                    onClick={createSession}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Session
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Average Attendance</span>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{avgAttendance}%</p>
                  <p className="text-xs text-blue-700 mt-1">Across all sessions</p>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-red-900">At Risk Students</span>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-3xl font-bold text-red-900">{atRiskCount}</p>
                  <p className="text-xs text-red-700 mt-1">Below 80% attendance</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Total Sessions</span>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-900">{selectedClass.sessions.length}</p>
                  <p className="text-xs text-green-700 mt-1">Completed sessions</p>
                </div>
              </div>

              <div className="border rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Attendance Trend</h4>
                {selectedClass.sessions.length > 0 ? (
                  <div className="h-64 flex items-end justify-between gap-2">
                    {selectedClass.sessions.map((session, idx) => (
                      <div key={session.id} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${session.attendancePercentage >= 80 ? 'bg-green-500' : session.attendancePercentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ height: `${session.attendancePercentage * 2}px` }}
                        />
                        <span className="text-xs text-gray-500 rotate-0 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                          {session.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No session data available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {viewMode === "list" && renderListView()}
        {viewMode === "create" && renderCreateView()}
        {viewMode === "upload" && renderUploadView()}
        {viewMode === "detail" && renderDetailView()}
      </div>
    </div>
  );
}
