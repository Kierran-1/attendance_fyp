'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { QRCodeSVG } from 'qrcode.react';
import {
  Camera,
  ScanLine,
  Users,
  Clock,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  Download,
  History,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  MoreVertical,
  RefreshCw,
  QrCode,
  Smartphone
} from 'lucide-react';

// Types
interface Unit {
  id: string;
  code: string;
  name: string;
  classes: ClassSession[];
}

interface ClassSession {
  id: string;
  type: 'Lecture' | 'Tutorial' | 'Lab';
  group: string;
  day: string;
  time: string;
  room: string;
  duration: number; // in minutes
}

interface CheckedInStudent {
  id: string;
  sessionId: string;
  studentName: string;
  studentId: string;
  checkInTime: string;
  status: 'Present' | 'Late' | 'Absent' | 'Cancelled';
  method: 'QR' | 'Manual' | 'Face' | 'BT';
}

interface SessionHistory {
  id: string;
  unitCode: string;
  classType: string;
  date: string;
  time: string;
  attendanceRate: number;
  totalStudents: number;
  presentCount: number;
  status: 'Completed' | 'Upcoming' | 'In Progress';
}

interface DashboardStats {
  overallRate: number;
  weeklyTrend: number[];
  atRiskStudents: AtRiskStudent[];
  classComparison: ClassComparison[];
}

interface AtRiskStudent {
  id: string;
  name: string;
  studentId: string;
  attendanceRate: number;
  missedClasses: number;
}

interface ClassComparison {
  unitCode: string;
  attendanceRate: number;
}

// Mock Data
const MOCK_UNITS: Unit[] = [
  {
    id: '1',
    code: 'COS20007',
    name: 'Object Oriented Programming',
    classes: [
      { id: 'c1', type: 'Lecture', group: 'Lecture 1', day: 'Monday', time: '09:00 - 11:00', room: 'BA301', duration: 120 },
      { id: 'c2', type: 'Tutorial', group: 'Tut 1', day: 'Tuesday', time: '14:00 - 16:00', room: 'BA202', duration: 120 },
      { id: 'c3', type: 'Lab', group: 'Lab 1', day: 'Wednesday', time: '10:00 - 12:00', room: 'LAB-A', duration: 120 },
      { id: 'c4', type: 'Lab', group: 'Lab 2', day: 'Thursday', time: '14:00 - 16:00', room: 'LAB-B', duration: 120 },
    ],
  },
  {
    id: '2',
    code: 'COS30041',
    name: 'Web Development',
    classes: [
      { id: 'c5', type: 'Lecture', group: 'Lecture 1', day: 'Tuesday', time: '09:00 - 11:00', room: 'BA401', duration: 120 },
      { id: 'c6', type: 'Tutorial', group: 'Tut 1', day: 'Wednesday', time: '14:00 - 16:00', room: 'BA302', duration: 120 },
    ],
  },
];

const MOCK_HISTORY: SessionHistory[] = [
  { id: 'h1', unitCode: 'COS20007', classType: 'Lecture', date: '2026-03-20', time: '09:00 - 11:00', attendanceRate: 85, totalStudents: 40, presentCount: 34, status: 'Completed' },
  { id: 'h2', unitCode: 'COS20007', classType: 'Tutorial', date: '2026-03-21', time: '14:00 - 16:00', attendanceRate: 78, totalStudents: 20, presentCount: 15, status: 'Completed' },
  { id: 'h3', unitCode: 'COS30041', classType: 'Lecture', date: '2026-03-25', time: '09:00 - 11:00', attendanceRate: 92, totalStudents: 35, presentCount: 32, status: 'Completed' },
  { id: 'h4', unitCode: 'COS20007', classType: 'Lab', date: '2026-03-27', time: '10:00 - 12:00', attendanceRate: 0, totalStudents: 15, presentCount: 0, status: 'Upcoming' },
];

const MOCK_DASHBOARD: DashboardStats = {
  overallRate: 84,
  weeklyTrend: [82, 85, 78, 88, 84, 86, 84],
  atRiskStudents: [
    { id: 's1', name: 'John Smith', studentId: '101234', attendanceRate: 45, missedClasses: 11 },
    { id: 's2', name: 'Sarah Lee', studentId: '101235', attendanceRate: 60, missedClasses: 8 },
    { id: 's3', name: 'Mike Johnson', studentId: '101236', attendanceRate: 68, missedClasses: 6 },
  ],
  classComparison: [
    { unitCode: 'COS20007', attendanceRate: 82 },
    { unitCode: 'COS30041', attendanceRate: 88 },
    { unitCode: 'COS10009', attendanceRate: 79 },
  ],
};

export default function AttendancePage() {
  const { data: session } = useSession();

  // State
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<{
    id: string;
    unit: Unit;
    classSession: ClassSession;
    startTime: Date;
    qrToken: string;
    status: 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  } | null>(null);
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [checkedIn, setCheckedIn] = useState<CheckedInStudent[]>([]);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'history'>('dashboard');
  const [selectedHistorySession, setSelectedHistorySession] = useState<SessionHistory | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'upcoming'>('all');

  // QR Scanner refs
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Timer effect for active session
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - activeSession.startTime.getTime();
      const remaining = Math.max(0, activeSession.classSession.duration * 60 * 1000 - elapsed);
      setTimeRemaining(remaining);

      // Refresh QR every 30 seconds
      if (Math.floor(elapsed / 30000) > Math.floor((elapsed - 1000) / 30000)) {
        refreshQRToken();
      }

      if (remaining === 0) {
        endSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Generate QR token
  const generateQRToken = (
    sessionId: string,
    unit: Unit,
    classSession: ClassSession
  ) => {
    return JSON.stringify({
      sessionId,
      unitId: unit.id,
      unitCode: unit.code,
      classSessionId: classSession.id,
      createdAt: Date.now(),
    });
  };

  const refreshQRToken = () => {
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        qrToken: generateQRToken(
          activeSession.id,
          activeSession.unit,
          activeSession.classSession
        ),
      });
    }
  };

  // Session controls
  const startSession = (unit: Unit, classSession: ClassSession) => {
    const sessionId = crypto.randomUUID();

    setActiveSession({
      id: sessionId,
      unit,
      classSession,
      startTime: new Date(),
      qrToken: generateQRToken(sessionId, unit, classSession),
      status: 'ACTIVE',
    });

    setCheckedIn([]);
    setActiveTab('dashboard');
  };

  const endSession = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    readerRef.current = null;
    setScanning(false);
    setActiveSession(null);
    setTimeRemaining(0);
  };

  const cancelSession = () => {
    if (!activeSession) return;

    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this attendance session? All check-ins for this session will be marked as cancelled.'
    );

    if (!confirmCancel) return;

    const cancelledSessionId = activeSession.id;

    setCheckedIn((prev) =>
      prev.map((student) =>
        student.sessionId === cancelledSessionId
          ? { ...student, status: 'Cancelled' }
          : student
      )
    );

    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    readerRef.current = null;
    setScanning(false);
    setActiveSession(null);
    setTimeRemaining(0);

    setScanResult({
      success: true,
      message: 'Session cancelled and all related attendance records were batch cancelled.',
    });

    setTimeout(() => setScanResult(null), 3000);
  };

  // QR Scanner functions
  const startScanning = async () => {
    readerRef.current = new BrowserQRCodeReader();
    setScanning(true);
    setScanResult(null);

    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        'qr-video',
        (result) => {
          if (result) {
            handleScan(result.getText());
          }
        }
      );
    } catch {
      setScanResult({ success: false, message: 'Camera not available' });
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    readerRef.current = null;
    setScanning(false);
  };

  const handleScan = async (tokenText: string) => {
    if (!activeSession) {
      setScanResult({ success: false, message: 'No active session found' });
      return;
    }

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockStudent: CheckedInStudent = {
        id: Math.random().toString(36).substr(2, 9),
        sessionId: activeSession.id,
        studentName: `Student ${checkedIn.length + 1}`,
        studentId: `10${1000 + checkedIn.length}`,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        method: 'QR',
      };

      setCheckedIn(prev => [...prev, mockStudent]);
      setScanResult({ success: true, message: `Checked in: ${mockStudent.studentName}` });
    } catch {
      setScanResult({ success: false, message: 'Scan failed' });
    }

    setTimeout(() => setScanResult(null), 3000);
  };

  const handleManualEntry = () => {
    if (!activeSession) {
      setScanResult({ success: false, message: 'No active session found' });
      return;
    }
        if (!manualEntry.trim()) return;
    
    const mockStudent: CheckedInStudent = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: activeSession.id,
      studentName: `Student (Manual)`,
      studentId: manualEntry,
      checkInTime: new Date().toISOString(),
      status: 'Present',
      method: 'Manual',
    };

    setCheckedIn(prev => [...prev, mockStudent]);
    setScanResult({ success: true, message: `Manually checked in: ${manualEntry}` });
    setManualEntry('');
    setTimeout(() => setScanResult(null), 3000);
  };

  // Format time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  // Filtered history
  const filteredHistory = MOCK_HISTORY.filter(h => {
    if (historyFilter === 'all') return true;
    return h.status.toLowerCase() === historyFilter;
  });

  return (
    <div className="space-y-6 sm:space-y-8">

      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="hover:text-gray-600 cursor-default">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Attendance</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Units & Classes */}
          <div className="lg:col-span-3 space-y-6">
            {/* Units List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  My Units
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {MOCK_UNITS.map((unit) => (
                  <div key={unit.id}>
                    <button
                      onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
                      className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        selectedUnit === unit.id ? 'bg-red-50 border-l-4 border-red-500' : ''
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{unit.code}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{unit.name}</p>
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedUnit === unit.id ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    {/* Expanded Classes */}
                    {expandedUnit === unit.id && (
                      <div className="bg-gray-50 px-4 py-2 space-y-2">
                        {unit.classes.map((cls) => (
                          <div key={cls.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                cls.type === 'Lecture' ? 'bg-purple-100 text-purple-700' :
                                cls.type === 'Tutorial' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {cls.type}
                              </span>
                              <span className="text-xs text-gray-500">{cls.group}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{cls.day}, {cls.time}</p>
                            <p className="text-xs text-gray-500 mb-2">Room: {cls.room}</p>
                            <button
                              onClick={() => startSession(unit, cls)}
                              disabled={activeSession !== null}
                              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              Start Session
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Sessions</span>
                  <span className="text-sm font-medium text-gray-900">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Total Students</span>
                  <span className="text-sm font-medium text-gray-900">55</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Avg Attendance</span>
                  <span className="text-sm font-medium text-green-600">82%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
              <div className="flex space-x-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  { id: 'scanner', label: 'QR Scanner', icon: Camera },
                  { id: 'history', label: 'History', icon: History },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Active Session Card */}
                {activeSession ? (
                  <div className="bg-white rounded-xl shadow-lg border-2 border-red-500 overflow-hidden">
                    <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <h2 className="text-lg font-bold text-white">Active Session</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelSession}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Session
                        </button>

                        <button
                          onClick={endSession}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Square className="w-4 h-4" />
                          End Session
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* QR Code Section */}
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                          <QRCodeSVG 
                            value={activeSession.qrToken} 
                            size={200}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                          Refreshes every 30s
                        </div>
                        <button
                          onClick={refreshQRToken}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Refresh Now
                        </button>
                      </div>

                      {/* Session Info */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unit</p>
                            <p className="text-lg font-bold text-gray-900">{activeSession.unit.code}</p>
                            <p className="text-sm text-gray-600 truncate">{activeSession.unit.name}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Class Type</p>
                            <p className="text-lg font-bold text-gray-900">{activeSession.classSession.type}</p>
                            <p className="text-sm text-gray-600">{activeSession.classSession.group}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time Remaining</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-red-600" />
                            <span className="text-3xl font-mono font-bold text-gray-900">
                              {formatTime(timeRemaining)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Check-ins</p>
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-600" />
                            <span className="text-2xl font-bold text-gray-900">
                              {checkedIn.length} <span className="text-sm text-gray-500 font-normal">/ 40 enrolled</span>
                            </span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(checkedIn.length / 40) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Attendance List */}
                    <div className="border-t border-gray-200 px-6 py-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Check-ins</h3>
                      {checkedIn.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No students checked in yet...</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {checkedIn.slice(-10).map((student) => (
                            <span 
                              key={student.id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {student.studentName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Session</h3>
                    <p className="text-sm text-gray-500 mb-4">Select a unit and class from the sidebar to start a session</p>
                  </div>
                )}

                {/* Dashboard Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Overall Attendance</h3>
                      <BarChart3 className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-gray-900">{MOCK_DASHBOARD.overallRate}%</span>
                      <span className="text-sm text-green-600 mb-1">↑ 2%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">This semester</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Weekly Trend</h3>
                      <div className="flex gap-1">
                        {MOCK_DASHBOARD.weeklyTrend.map((val, i) => (
                          <div 
                            key={i}
                            className="w-2 bg-red-500 rounded-t"
                            style={{ height: `${val}px`, opacity: 0.3 + (i * 0.1) }}
                          ></div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Last 7 days</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">At-Risk Students</h3>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-red-600">{MOCK_DASHBOARD.atRiskStudents.length}</span>
                      <span className="text-sm text-gray-500 mb-1">&lt;75% attendance</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Require attention</p>
                  </div>
                </div>

                {/* At-Risk Students Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">Students Requiring Attention</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {MOCK_DASHBOARD.atRiskStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{student.name}</td>
                          <td className="px-6 py-3 text-gray-600">{student.studentId}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              student.attendanceRate < 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {student.attendanceRate}%
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{student.missedClasses} classes</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* QR Scanner Tab */}
            {activeTab === 'scanner' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ScanLine className="w-5 h-5" />
                    Manual Check-in Scanner
                  </h2>
                  
                  {!activeSession && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-800">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        No active session. Start a session from the dashboard to enable check-ins.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Camera Scanner */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">Camera Scanner</h3>
                        {!scanning ? (
                          <button
                            onClick={startScanning}
                            disabled={!activeSession}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                            Start Camera
                          </button>
                        ) : (
                          <button
                            onClick={stopScanning}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Square className="w-4 h-4" />
                            Stop
                          </button>
                        )}
                      </div>
                      
                      <div className={`relative bg-black rounded-xl overflow-hidden ${scanning ? 'block' : 'hidden'}`} style={{ aspectRatio: '4/3' }}>
                        <video id="qr-video" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-2 border-red-500 opacity-50 pointer-events-none">
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
                        </div>
                      </div>
                      
                      {!scanning && (
                        <div className="bg-gray-100 rounded-xl flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                          <div className="text-center">
                            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Camera inactive</p>
                          </div>
                        </div>
                      )}

                      {scanResult && (
                        <div className={`p-4 rounded-lg flex items-center gap-2 ${
                          scanResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {scanResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          <span className="text-sm font-medium">{scanResult.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Manual Entry */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700">Manual Entry</h3>
                      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Student ID or Email</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualEntry}
                              onChange={(e) => setManualEntry(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
                              placeholder="Enter student ID..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              disabled={!activeSession}
                            />
                            <button
                              onClick={handleManualEntry}
                              disabled={!activeSession || !manualEntry.trim()}
                              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              Check In
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4"> 
                          <p className="text-xs text-gray-500 mb-2">Quick Actions</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                              <Smartphone className="w-3 h-3" />
                              NFC Tap
                            </button>
                            <button className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                              <Users className="w-3 h-3" />
                              Bulk Entry
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Recent Manual Check-ins */}
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Recent Verifications</h4>
                        {checkedIn.filter(s => s.method === 'Manual').length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No manual entries yet</p>
                        ) : (
                          <div className="space-y-2">
                            {checkedIn.filter(s => s.method === 'Manual').slice(-3).map((student) => (
                              <div key={student.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-900">{student.studentId}</span>
                                <span className="text-xs text-gray-500">{formatDateTime(student.checkInTime)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {!selectedHistorySession ? (
                  <>
                    {/* Filters */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {(['all', 'completed', 'upcoming'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setHistoryFilter(filter)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              historyFilter === filter
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                          </button>
                        ))}
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4" />
                        Export All
                      </button>
                    </div>

                    {/* History Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredHistory.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{session.unitCode}</div>
                                <div className="text-xs text-gray-500">{session.classType}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {session.date}<br />
                                <span className="text-xs text-gray-500">{session.time}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-red-600 h-2 rounded-full"
                                      style={{ width: `${session.attendanceRate}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-700">
                                    {session.presentCount}/{session.totalStudents}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  session.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  session.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {session.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedHistorySession(session)}
                                    className="text-red-600 hover:text-red-700 text-xs font-medium"
                                  >
                                    View Details
                                  </button>
                                  <button className="text-gray-400 hover:text-gray-600">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  /* Session Detail View */
                  <div className="space-y-6">
                    <button
                      onClick={() => setSelectedHistorySession(null)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Back to History
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedHistorySession.unitCode}</h2>
                          <p className="text-sm text-gray-500">{selectedHistorySession.classType} • {selectedHistorySession.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                            <Download className="w-4 h-4" />
                            Export CSV
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                            <RefreshCw className="w-4 h-4" />
                            Sync to LMS
                          </button>
                        </div>
                      </div>

                      {/* Summary Stats */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                          { label: 'Total', value: selectedHistorySession.totalStudents, color: 'blue' },
                          { label: 'Present', value: selectedHistorySession.presentCount, color: 'green' },
                          { label: 'Absent', value: selectedHistorySession.totalStudents - selectedHistorySession.presentCount, color: 'red' },
                          { label: 'Rate', value: `${selectedHistorySession.attendanceRate}%`, color: 'purple' },
                        ].map((stat) => (
                          <div key={stat.label} className={`bg-${stat.color}-50 rounded-lg p-4 text-center`}>
                            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                            <p className={`text-xs text-${stat.color}-600 uppercase tracking-wider`}>{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Student List */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {checkedIn.length > 0 ? checkedIn.map((student) => (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{student.studentId}</td>
                                <td className="px-4 py-3 text-gray-600">{student.studentName}</td>
                                <td className="px-4 py-3 text-gray-600">{formatDateTime(student.checkInTime)}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    student.status === 'Present' ? 'bg-green-100 text-green-700' :
                                    student.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                    {student.method === 'QR' && <QrCode className="w-3 h-3" />}
                                    {student.method === 'Manual' && <Smartphone className="w-3 h-3" />}
                                    {student.method}
                                  </span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                  No attendance records for this session
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
    </div>
  );
}