'use client';

import { useState, type ReactNode } from 'react';
import Sidebar from '../components/sidebar';
import TopNavbar from '../components/navbar';
import { studentMenu } from '../config/studentMenu';

export default function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Toggle sidebar for mobile layout
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Close sidebar after route changes or overlay click
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Shared sidebar component */}
      <Sidebar
        panelTitle={studentMenu.panelTitle}
        menu={studentMenu.sections}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main content area aligned to lecturer shell */}
      <div className="flex min-h-screen flex-col lg:ml-64">
        {/* Shared top navbar */}
        <TopNavbar onMenuClick={toggleSidebar} />

        {/* Page container */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}