'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CalendarDays, Menu, PanelTopClose } from 'lucide-react';
import { lecturerMenu } from '../config/lecturerMenu';
import { studentMenu } from '../config/studentMenu';

type TopNavbarProps = {
  onMenuClick: () => void;
};

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const pathname = usePathname();

  // Use the correct menu config so the page title matches the current route.
  const isStudentPanel = pathname.startsWith('/student');
  const activeMenu = isStudentPanel ? studentMenu : lecturerMenu;
  const alertsHref = isStudentPanel ? '/student/alerts' : '/lecturer/alerts';

  function getPageTitle() {
    for (const section of activeMenu.sections) {
      for (const item of section.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return item.name;
        }
      }
    }

    return isStudentPanel ? 'Student Panel' : 'Lecturer Panel';
  }

  const pageTitle = getPageTitle();

  const today = new Date().toLocaleDateString('en-MY', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-[70] border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="flex h-[4.6rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#E4002B] lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E4002B] sm:text-[11px]">
                <PanelTopClose size={11} />
                {isStudentPanel ? 'Student Panel' : 'Lecturer Panel'}
              </span>
            </div>

            <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-[1.35rem]">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop date display */}
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm md:flex">
            <CalendarDays size={15} className="text-[#E4002B]" />
            <span className="whitespace-nowrap">{today}</span>
          </div>

          {/* Alerts shortcut */}
          <Link
            href={alertsHref}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#E4002B]"
            aria-label="Open alerts"
          >
            <Bell size={18} />

            {/* Red dot keeps the alert button visually noticeable */}
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#E4002B] ring-2 ring-white" />
          </Link>
        </div>
      </div>
    </header>
  );
}