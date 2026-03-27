"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

type MenuItem = {
  name: string
  href: string
  icon: string
}

type MenuSection = {
  heading: string
  items: MenuItem[]
}

type SidebarProps = {
  panelTitle: string
  menu: MenuSection[]
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ panelTitle, menu, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    return pathname.startsWith(href)
  }

  useEffect(() => {
    import("preline").then(() => {
      (window as any).HSStaticMethods?.autoInit()
    })
  }, [])

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    onClose()
  }, [pathname])

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        id="hs-sidebar"
        className={`
          p-4 w-64 h-screen fixed top-0 left-0 bg-white border-r border-gray-200 
          transition-transform duration-300 z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center gap-3 p-4 border-b border-gray-200">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div 
                className="w-12 h-12 bg-[#E4002B] rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ boxShadow: '0 0 40px rgba(228,0,43,0.1)' }}
              >
                AS
              </div>
            </div>
            {/* Title Stack */}
            <div className="flex flex-col leading-tight">
              <div className="text-black text-xl font-black tracking-tight">
                Attend<span className="text-[#E4002B]">Sync</span>
              </div>
              <span className="text-xs text-gray-500">
                {panelTitle}
              </span>
            </div>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden ml-auto p-1 text-gray-500 hover:bg-gray-100 rounded"
              aria-label="Close sidebar"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                fill="none" 
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {/* Menu */}
          <nav className="pt-4 px-2 flex-1 overflow-y-auto">
            <ul className="space-y-6">
              {menu.map((section) => (
                <li key={section.heading}>
                  {/* Section Heading */}
                  <span className="pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {section.heading}
                  </span>
                  {/* Section Items */}
                  <ul className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-x-3 py-2 px-3 text-base rounded-lg transition-colors ${
                              active
                                ? "bg-[#E4002B]/10 text-[#E4002B] font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <span
                              className={active ? "text-[#E4002B]" : "text-gray-500"}
                              dangerouslySetInnerHTML={{ __html: item.icon }}
                            />
                            {item.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
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
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#E4002B] flex items-center justify-center text-white text-xs font-bold">
                    {session?.user?.name?.[0] ?? "?"}
                  </div>
                )}

                <span className="truncate text-sm">
                  {session?.user?.name ?? "Loading..."}
                </span>

                <svg
                  className="ms-auto w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="hs-dropdown-menu hidden w-48 bg-white border border-gray-200 rounded shadow mt-1">
                <a  href="/lecturer/profile" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  My account
                </a>

                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Sign out
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}