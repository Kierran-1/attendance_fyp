"use client"

import { useEffect } from "react"
import Link from "next/link"

type MenuItem = {
  name: string
  href: string
}

type SidebarProps = {
  panelTitle: string
  menu: MenuItem[]
}

export default function Sidebar({ panelTitle, menu }: SidebarProps) {
  useEffect(() => {
    import("preline").then(() => {
      (window as any).HSStaticMethods?.autoInit()
    })
  }, [])

  return (
    <div
      id="hs-sidebar"
      className="p-4 hs-overlay w-64 h-screen fixed top-0 left-0 bg-white border-r border-gray-200 -translate-x-full lg:translate-x-0 transition-transform duration-300 z-50"
    >
      <div className="flex flex-col h-full">

        {/* Header */}
        {/* Header */}
          <header className="grid grid-cols-[auto_1fr] items-center p-4 border-b border-gray-200 gap-x-2 gap-y-1">
            {/* Logo column spanning two rows */}
            <div className="row-span-2 flex items-center">
              <img
                src="https://via.placeholder.com/32"
                alt="Logo"
                className="w-8 h-8 rounded"
              />
            </div>

            {/* AttendSync (row 1, column 2) */}
            <span className="font-semibold text-xl text-gray-700">AttendSync</span>

            {/* Lecture Panel (row 2, column 2) */}
            <span className="text-sm text-gray-500">Lecturer Panel</span>

            {/* Close button on mobile */}
            <button
              type="button"
              className="lg:hidden p-1 text-gray-500 hover:bg-gray-100 rounded justify-self-end row-span-2"
              data-hs-overlay="#hs-sidebar"
            >
              ✕
            </button>
          </header>

        {/* Menu */}
        <nav className="pt-4 px-2 flex-1 overflow-y-auto">
          <ul className="space-y-2">

            {menu.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-x-3 py-2 px-3 text-base text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  {item.name}
                </Link>
              </li>
            ))}

          </ul>
        </nav>

          {/* Footer Dropdown */}
          <footer className="p-2 border-t border-gray-200">
            <div className="hs-dropdown relative w-full">
              <button
                className="flex items-center w-full gap-x-2 py-2 px-2.5 text-gray-700 rounded hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded="false"
              >
                <img
                  src="https://images.unsplash.com/photo-1734122415415-88cb1d7d5dc0?q=80&w=320&h=320&auto=format&fit=facearea&facepad=3"
                  alt="Avatar"
                  className="w-6 h-6 rounded-full"
                />
                Mia Hudson
                <svg className="ms-auto w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="hs-dropdown-menu hidden w-48 bg-white border border-gray-200 rounded shadow mt-1">
                <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">My account</a>
                <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Settings</a>
                <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Billing</a>
                <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Sign out</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
  )
}