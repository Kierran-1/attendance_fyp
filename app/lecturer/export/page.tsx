'use client';

import { ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function LecturerExportPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 sm:space-y-8">

      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="hover:text-gray-600 cursor-default">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Export</span>
      </nav>

      <header className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
          Welcome back, <span className="text-red-600">{session?.user?.name?.split(' ')[0] ?? 'Lecturer'}</span>
        </h1>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        {[
          { label: 'Overall Attendance', value: '—' },
          { label: 'Enrolled Courses', value: '—' },
          { label: 'Classes This Week', value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-4 sm:p-8 shadow-sm">
        <h2 className="text-base font-black text-gray-900 mb-4">Recent Attendance</h2>
        <p className="text-sm text-gray-400">No attendance records yet.</p>
      </div>

    </div>
  );
}
