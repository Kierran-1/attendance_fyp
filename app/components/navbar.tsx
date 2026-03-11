"use client"

import { usePathname } from "next/navigation"
import { lecturerMenu } from "../config/lecturerMenu"

export default function TopNavbar() {

  const pathname = usePathname()

  const getPageTitle = () => {
    for (const section of lecturerMenu.sections) {
      for (const item of section.items) {
        if (pathname.startsWith(item.href)) {
          return item.name
        }
      }
    }
    return "Dashboard"
  }

  const pageTitle = getPageTitle()

  const today = new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <header className="sticky top-0 z-40 bg-[#F8F8F8] border-b border-gray-200 h-16 flex items-center justify-between px-8 lg:ml-64">

      {/* LEFT — PAGE TITLE */}
      <h1 className="text-lg font-semibold text-gray-800">
        {pageTitle}
      </h1>


      {/* RIGHT — DATE + NOTIFICATION */}
      <div className="flex items-center gap-6">

        <span className="text-sm text-gray-500">
          {today}
        </span>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
            />
          </svg>

          {/* Notification Dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>

        </button>

      </div>

    </header>
  )
}