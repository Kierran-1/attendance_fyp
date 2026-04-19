'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  ChevronDown,
  LogOut,
  PanelLeftOpen,
  UserCircle2,
  X,
} from 'lucide-react';

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

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const isStudentPanel = pathname.startsWith('/student');
  const profileHref = isStudentPanel ? '/student/profile' : '/lecturer/profile';

  const currentUserName = session?.user?.name ?? 'Loading...';
  const currentUserEmail = session?.user?.email ?? '';

  const userInitial = useMemo(() => {
    return (session?.user?.name?.trim()?.[0] ?? '?').toUpperCase();
  }, [session?.user?.name]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      onClose();
      setAccountMenuOpen(false);
      previousPathname.current = pathname;
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current) return;

      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleSidebarClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <>
      {/* Mobile backdrop overlay - semi-transparent background when sidebar is open */}
      <div
        className={`fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[2px] transition-all duration-300 lg:hidden ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main sidebar container */}
      <aside
        id="app-sidebar"
        aria-label={`${panelTitle} sidebar`}
        className={`fixed inset-y-0 left-0 z-[90] flex w-[17.5rem] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={handleSidebarClick}
      >
        {/* Header section with logo and mobile close button */}
        <div className="border-b border-slate-200 px-4 py-4">
          {/* Mobile only: Menu label and close button */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div className="text-sm font-bold text-slate-600 uppercase tracking-[0.22em]">
              <PanelLeftOpen size={16} className="inline mr-2" />
              Menu
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:text-slate-900"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Logo and app name - minimal design */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E4002B] text-sm font-bold text-white">
              AS
            </div>
            
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                Attend<span className="text-[#E4002B]">Sync</span>
              </p>
              <p className="text-xs text-slate-500">
                {panelTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation menu - main content area */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {/* Render each menu section */}
            {menu.map((section) => (
              <section key={section.heading}>
                {/* Section heading */}
                <div className="px-3 pb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {section.heading}
                  </p>
                </div>

                {/* Menu items for this section */}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-rose-50 text-[#E4002B]'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {/* Icon container - remains consistent regardless of active state */}
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition-colors group-hover:text-slate-700">
                            {item.icon}
                          </span>

                          {/* Menu item label */}
                          <span className="truncate">{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>

        {/* Account section - user info and menu */}
        <div className="border-t border-slate-200 p-3">
          <div ref={accountMenuRef} className="relative">
            {/* Account button with user info */}
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100"
            >
              {/* User avatar - shows image or initial */}
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="User avatar"
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E4002B] text-xs font-bold text-white">
                  {userInitial}
                </div>
              )}

              {/* User name and email/role */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {currentUserName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {currentUserEmail || panelTitle}
                </p>
              </div>

              {/* Chevron indicator for dropdown state */}
              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-400 transition-transform ${
                  accountMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown menu - profile and logout options */}
            <div
              className={`absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-10 rounded-lg border border-slate-200 bg-white p-1 transition-all ${
                accountMenuOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0'
              }`}
            >
              <Link
                href={profileHref}
                className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <UserCircle2 size={16} />
                My profile
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}