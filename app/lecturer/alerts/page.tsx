'use client';

import { useSession } from 'next-auth/react';

export default function LecturerDashboard() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {session?.user?.name?.split(' ')[0] ?? 'Student'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{session?.user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Overall Attendance</p>
          <p className="text-3xl font-black text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Enrolled Courses</p>
          <p className="text-3xl font-black text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Classes This Week</p>
          <p className="text-3xl font-black text-gray-800">—</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-700 mb-4">Recent Attendance</h2>
        <p className="text-sm text-gray-400">No attendance records yet.</p>
      </div>
    </div>
  );
}
