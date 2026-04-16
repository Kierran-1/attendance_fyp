'use client';

import { useState, type ReactNode } from 'react';
import Sidebar from '../components/sidebar';
import TopNavbar from '../components/navbar';
import { lecturerMenu } from '../config/lecturerMenu';

export default function LecturerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        panelTitle={lecturerMenu.panelTitle}
        menu={lecturerMenu.sections}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="flex min-h-screen flex-col lg:ml-[17.5rem]">
        <TopNavbar onMenuClick={toggleSidebar} />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-5 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}