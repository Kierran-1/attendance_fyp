"use client"

import { useState } from "react"
import Sidebar from "../components/sidebar"
import TopNavbar from "../components/navbar"
import { studentMenu } from "../config/studentMenu"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div>
      {/* Sidebar */}
      <Sidebar
        panelTitle={studentMenu.panelTitle}
        menu={studentMenu.sections}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Right Side */}
      <div className="lg:ml-64 flex flex-col min-h-screen bg-[#F8F8F8]">
        
        {/* Top Navbar */}
        <TopNavbar onMenuClick={toggleSidebar} />

        {/* Page Content */}
        <main className="p-6 flex-1">
          {children}
        </main>

      </div>
    </div>
  )
}