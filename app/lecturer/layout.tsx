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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <Sidebar
        panelTitle={lecturerMenu.panelTitle}
        menu={lecturerMenu.sections}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main lecturer content area */}
      <div className="flex min-h-screen flex-col lg:ml-64">
        {/* Top navigation */}
        <TopNavbar onMenuClick={toggleSidebar} />

        {/* Page content */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}