'use client';

<<<<<<< HEAD
import { useEffect, useRef, type ReactNode } from 'react';
=======
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
>>>>>>> 09cb0c9c7ab08b15a527a9c554f1b1b4e5b70292
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
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

  // Decide where the profile link should point based on current panel.
  const isStudentPanel = pathname.startsWith('/student');
  const profileHref = isStudentPanel ? '/student/profile' : '/lecturer/profile';

  const currentUserName = session?.user?.name ?? 'Loading...';
  const currentUserEmail = session?.user?.email ?? '';

  // Show one initial in the avatar circle when no image is available.
  const userInitial = useMemo(() => {
    return (session?.user?.name?.trim()?.[0] ?? '?').toUpperCase();
  }, [session?.user?.name]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    // Close the mobile drawer whenever the route changes.
    onClose();
    setAccountMenuOpen(false);
  }, [pathname, onClose]);

  useEffect(() => {
    // Stop body scrolling while the mobile sidebar is open.
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
    // Close the account dropdown when the user clicks outside it.
    function handleOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current) return;

      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

<<<<<<< HEAD
  // Close the mobile sidebar only after an actual route change.
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      onClose();
      previousPathname.current = pathname;
    }
  }, [pathname, onClose]);
=======
  function handleSidebarClick(event: ReactMouseEvent<HTMLDivElement>) {
    // Prevent clicks inside the drawer from bubbling to the mobile backdrop.
    event.stopPropagation();
  }
>>>>>>> 09cb0c9c7ab08b15a527a9c554f1b1b4e5b70292

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[2px] transition-all duration-300 lg:hidden ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar drawer */}
      <aside
        id="app-sidebar"
        aria-label={`${panelTitle} sidebar`}
        className={`fixed inset-y-0 left-0 z-[90] flex w-[17.5rem] flex-col border-r border-white/60 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={handleSidebarClick}
      >
        {/* Top branding section */}
        <div className="border-b border-slate-200/80 px-4 pb-4 pt-4">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#E4002B]">
              <PanelLeftOpen size={13} />
              Menu
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#E4002B]"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-rose-50/40 to-slate-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E4002B] text-lg font-black text-white shadow-[0_16px_34px_rgba(228,0,43,0.25)]">
                AS
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight text-slate-900">
                  Attend<span className="text-[#E4002B]">Sync</span>
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {panelTitle}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main navigation area */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {menu.map((section) => (
              <section key={section.heading}>
                <div className="px-3 pb-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {section.heading}
                  </p>
                </div>

                <ul className="space-y-1.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all ${
                            active
                              ? 'border border-rose-100 bg-rose-50 text-[#E4002B] shadow-sm'
                              : 'border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          {/* Keep icon styling consistent for active and hover states */}
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                              active
                                ? 'bg-white text-[#E4002B] shadow-sm'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#E4002B]'
                            }`}
                          >
                            {item.icon}
                          </span>

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

        {/* Footer user account section */}
        <div className="border-t border-slate-200/80 p-3">
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-rose-100 hover:bg-rose-50/40"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="User avatar"
                  className="h-11 w-11 rounded-2xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E4002B] text-sm font-black text-white shadow-[0_12px_24px_rgba(228,0,43,0.20)]">
                  {userInitial}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {currentUserName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {currentUserEmail || panelTitle}
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-400 transition-transform ${
                  accountMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Small dropdown for profile and sign out */}
            <div
              className={`absolute bottom-[calc(100%+0.6rem)] left-0 right-0 z-10 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] transition-all ${
                accountMenuOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0'
              }`}
            >
              <Link
                href={profileHref}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <UserCircle2 size={16} />
                My profile
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
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