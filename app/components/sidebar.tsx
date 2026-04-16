'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

type MenuItem = {
  name: string;
  href: string;
  icon: ReactNode;
};

type MenuSection = {
  heading: string;
  items: MenuItem[];
};

type SidebarProps = {
  panelTitle: string;
  menu: MenuSection[];
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({
  panelTitle,
  menu,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const previousPathname = useRef(pathname);

  // Determine current role panel by route prefix.
  const isStudentPanel = pathname.startsWith('/student');
  const profileHref = isStudentPanel ? '/student/profile' : '/lecturer/profile';

  // Active menu state for sidebar highlighting.
  const isActive = (href: string) => pathname.startsWith(href);

  useEffect(() => {
    import('preline').then(() => {
      (window as any).HSStaticMethods?.autoInit();
    });
  }, []);

  // Close the mobile sidebar only after an actual route change.
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      onClose();
      previousPathname.current = pathname;
    }
  }, [pathname, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        id="hs-sidebar"
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white p-4 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-gray-200 p-4">
            <div className="flex-shrink-0">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E4002B] text-lg font-black text-white"
                style={{ boxShadow: '0 0 40px rgba(228,0,43,0.1)' }}
              >
                AS
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <div className="text-xl font-black tracking-tight text-black">
                Attend<span className="text-[#E4002B]">Sync</span>
              </div>
              <span className="text-xs text-gray-500">{panelTitle}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          {/* Navigation menu */}
          <nav className="flex-1 overflow-y-auto px-2 pt-4">
            <ul className="space-y-6">
              {menu.map((section) => (
                <li key={section.heading}>
                  <span className="pr-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {section.heading}
                  </span>

                  <ul className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.href);

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-x-3 rounded-lg px-3 py-2 text-base transition-colors ${
                              active
                                ? 'bg-[#E4002B]/10 font-medium text-[#E4002B]'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className={active ? 'text-[#E4002B]' : 'text-gray-500'}>
                              {item.icon}
                            </span>
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <footer className="border-t border-gray-200 p-2">
            <div className="hs-dropdown relative w-full">
              <button
                className="flex w-full items-center gap-x-2 rounded px-2.5 py-2 text-gray-700 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded="false"
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E4002B] text-xs font-bold text-white">
                    {session?.user?.name?.[0] ?? '?'}
                  </div>
                )}

                <span className="truncate text-sm">
                  {session?.user?.name ?? 'Loading...'}
                </span>

                <svg
                  className="ms-auto h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <div className="hs-dropdown-menu mt-1 hidden w-48 rounded border border-gray-200 bg-white shadow">
                <Link
                  href={profileHref}
                  className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-100"
                >
                  My account
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  className="w-full rounded px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}