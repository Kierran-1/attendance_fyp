'use client';

import { useSession } from 'next-auth/react';
import { BookOpen, CalendarCheck, TrendingUp, AlertTriangle, Clock, CheckCircle2, XCircle, FileText, ChevronRight } from 'lucide-react';

// ── Dummy data (replace with real Supabase/API calls later) ──
const studentProfile = {
  id: '103214789',
  program: 'Bachelor of Computer Science',
  programCode: 'BCS',
  nationality: 'Malaysian',
  semester: '2',
  term: '1',
};

const enrolledCourses = [
  { code: 'COS40005', name: 'Final Year Project', day: 'Monday', time: '9:00 AM – 11:00 AM', room: 'B201', attended: 11, total: 12, color: 'bg-red-500' },
  { code: 'COS20019', name: 'Web Technology', day: 'Tuesday', time: '11:00 AM – 1:00 PM', room: 'A104', attended: 9, total: 12, color: 'bg-indigo-500' },
  { code: 'COS30049', name: 'Computing Technology', day: 'Wednesday', time: '2:00 PM – 4:00 PM', room: 'C302', attended: 10, total: 12, color: 'bg-teal-500' },
  { code: 'COS10009', name: 'Intro to Programming', day: 'Friday', time: '4:00 PM – 6:00 PM', room: 'B105', attended: 8, total: 12, color: 'bg-pink-500' },
];

const recentAttendance = [
  { date: 'Mon, 24 Feb 2026', code: 'COS40005', name: 'Final Year Project', time: '9:00 AM', status: 'Present', timeIn: '8:58 AM' },
  { date: 'Tue, 25 Feb 2026', code: 'COS20019', name: 'Web Technology', time: '11:00 AM', status: 'Present', timeIn: '11:02 AM' },
  { date: 'Wed, 26 Feb 2026', code: 'COS30049', name: 'Computing Technology', time: '2:00 PM', status: 'Absent', timeIn: null },
  { date: 'Fri, 28 Feb 2026', code: 'COS10009', name: 'Intro to Programming', time: '4:00 PM', status: 'Late', timeIn: '4:18 AM' },
  { date: 'Mon, 3 Mar 2026', code: 'COS40005', name: 'Final Year Project', time: '9:00 AM', status: 'Sick Leave', timeIn: null },
];

// ── Helpers ──
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Present':   return { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100', icon: <CheckCircle2 size={14} /> };
    case 'Absent':    return { bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-100',   icon: <XCircle size={14} /> };
    case 'Late':      return { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100', icon: <Clock size={14} /> };
    case 'Sick Leave':return { bg: 'bg-blue-50',   text: 'text-blue-500',   border: 'border-blue-100',  icon: <FileText size={14} /> };
    default:          return { bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-100',  icon: null };
  }
};

const getPct = (attended: number, total: number) => Math.round((attended / total) * 100);

const getPctColor = (pct: number) => {
  if (pct >= 80) return 'text-green-600';
  if (pct >= 70) return 'text-amber-500';
  return 'text-red-500';
};

const getPctBarColor = (pct: number) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 70) return 'bg-amber-400';
  return 'bg-red-500';
};

const overallPct = Math.round(
  enrolledCourses.reduce((sum, c) => sum + getPct(c.attended, c.total), 0) / enrolledCourses.length
);

export default function StudentDashboard() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Student';

  const absentCount = recentAttendance.filter(r => r.status === 'Absent').length;

  return (
    <div className="space-y-6">

      {/* ── WELCOME + PROFILE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {studentProfile.program} · Semester {studentProfile.semester}, Term {studentProfile.term}
          </p>
        </div>

        {/* Profile pill */}
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm self-start">
          <div className="w-9 h-9 rounded-full bg-[#E4002B] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {session?.user?.name?.[0] ?? 'S'}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800 leading-tight">{session?.user?.name ?? 'Student'}</div>
            <div className="text-[11px] text-gray-400">{studentProfile.id} · {studentProfile.nationality}</div>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Overall attendance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">Overall Attendance</p>
            <TrendingUp size={16} className="text-gray-300" />
          </div>
          <p className={`text-4xl font-black tracking-tight ${getPctColor(overallPct)}`}>{overallPct}%</p>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${getPctBarColor(overallPct)}`} style={{ width: `${overallPct}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {overallPct >= 80 ? '✓ Above minimum threshold' : '⚠ Below 80% threshold'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">Enrolled Courses</p>
            <BookOpen size={16} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tight">{enrolledCourses.length}</p>
          <p className="text-[11px] text-gray-400 mt-2">This semester</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">Classes This Week</p>
            <CalendarCheck size={16} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tight">{enrolledCourses.length}</p>
          <p className="text-[11px] text-gray-400 mt-2">Mon – Fri</p>
        </div>

        <div className={`rounded-2xl border p-5 shadow-sm ${absentCount >= 3 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[11px] uppercase tracking-widest font-semibold ${absentCount >= 3 ? 'text-red-400' : 'text-gray-400'}`}>
              Absences
            </p>
            <AlertTriangle size={16} className={absentCount >= 3 ? 'text-red-400' : 'text-gray-300'} />
          </div>
          <p className={`text-4xl font-black tracking-tight ${absentCount >= 3 ? 'text-red-600' : 'text-gray-900'}`}>
            {absentCount}
          </p>
          <p className={`text-[11px] mt-2 ${absentCount >= 3 ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
            {absentCount >= 3 ? '⚠ Lecturer has been notified' : 'Recent records'}
          </p>
        </div>

      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Enrolled courses */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-800 text-sm">My Courses</h2>
            <span className="text-xs text-gray-400">{enrolledCourses.length} enrolled</span>
          </div>

          <div className="divide-y divide-gray-50">
            {enrolledCourses.map((course) => {
              const pct = getPct(course.attended, course.total);
              return (
                <div key={course.code} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${course.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-400">{course.code}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{course.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{course.day} · {course.time} · {course.room}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-black tracking-tight ${getPctColor(pct)}`}>{pct}%</p>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${getPctBarColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{course.attended}/{course.total} classes</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Upcoming + quick actions */}
        <div className="space-y-4">

          {/* Next class */}
          <div className="bg-[#E4002B] rounded-2xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Next Class</p>
            <p className="text-lg font-black tracking-tight leading-tight">COS40005</p>
            <p className="text-sm opacity-80 mt-0.5">Final Year Project</p>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs opacity-70">
              <span>📍 Room B201</span>
              <span>🕐 Mon 9:00 AM</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/student/qrcode"
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-[#FFF0F2] border border-gray-100 hover:border-[#E4002B]/20 rounded-xl text-sm font-semibold text-gray-700 hover:text-[#E4002B] transition-all group">
                <span>My QR Code</span>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-[#E4002B]" />
              </a>
              <a href="/student/attendance"
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-[#FFF0F2] border border-gray-100 hover:border-[#E4002B]/20 rounded-xl text-sm font-semibold text-gray-700 hover:text-[#E4002B] transition-all group">
                <span>View Attendance</span>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-[#E4002B]" />
              </a>
              <a href="/student/alerts"
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-[#FFF0F2] border border-gray-100 hover:border-[#E4002B]/20 rounded-xl text-sm font-semibold text-gray-700 hover:text-[#E4002B] transition-all group">
                <span>Alerts</span>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-[#E4002B]" />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── RECENT ATTENDANCE TABLE ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-800 text-sm">Recent Attendance</h2>
          <a href="/student/attendance" className="text-xs text-[#E4002B] font-semibold hover:underline">View all</a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70">
                <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Unit</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Class Time</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Time In</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentAttendance.map((record, i) => {
                const style = getStatusStyle(record.status);
                return (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-gray-600 text-xs font-medium whitespace-nowrap">{record.date}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-gray-800 text-xs">{record.code}</span>
                      <span className="text-gray-400 text-xs hidden lg:inline"> — {record.name}</span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs hidden sm:table-cell">{record.time}</td>
                    <td className="px-6 py-3.5 text-gray-500 text-xs hidden sm:table-cell font-mono">
                      {record.timeIn ?? '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
                        {style.icon}
                        {record.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
