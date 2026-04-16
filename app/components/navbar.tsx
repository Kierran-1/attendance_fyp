'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { lecturerMenu } from '../config/lecturerMenu';
import { studentMenu } from '../config/studentMenu';

type TopNavbarProps = {
  onMenuClick: () => void;
};

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  // Detect which panel is currently active based on the route prefix
  const isStudentPanel = pathname.startsWith('/student');
  const activeMenu = isStudentPanel ? studentMenu : lecturerMenu;
  const alertsHref = isStudentPanel ? '/student/alerts' : '/lecturer/alerts';
  const isAlertsPage = pathname.startsWith(alertsHref);

  useEffect(() => {
    let cancelled = false;

    const getStoredAlertCount = () => {
      try {
        const saved = localStorage.getItem('lecturerSentAlerts');
        if (!saved) return 0;

        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    };

    const refreshAlertIndicator = async () => {
      if (isStudentPanel) {
        try {
          const [classesRes, activeRes] = await Promise.all([
            fetch('/api/student/classes', { cache: 'no-store' }),
            fetch('/api/attendance/active-session', { cache: 'no-store' }),
          ]);

          const classesJson = classesRes.ok ? await classesRes.json() : { classes: [] };
          const activeJson = activeRes.ok ? await activeRes.json() : { session: null };

          const hasLecturerAlerts = getStoredAlertCount() > 0;
          const hasUpcomingClass = Array.isArray(classesJson.classes) && classesJson.classes.length > 0;
          const hasActiveSession = Boolean(activeJson.session);
          const computedCount =
            (hasLecturerAlerts ? getStoredAlertCount() : 0) +
            (hasUpcomingClass ? 1 : 0) +
            (hasActiveSession ? 1 : 0);

          if (!cancelled) {
            setAlertCount(computedCount);
          }

          return;
        } catch {
          if (!cancelled) {
            setAlertCount(getStoredAlertCount());
          }

          return;
        }
      }

      if (!cancelled) {
        setAlertCount(getStoredAlertCount());
      }
    };

    const handleWindowFocus = () => {
      void refreshAlertIndicator();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'lecturerSentAlerts') {
        void refreshAlertIndicator();
      }
    };

    void refreshAlertIndicator();
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isStudentPanel, pathname]);

  const visibleAlertCount = isAlertsPage ? 0 : alertCount;
  const showAlertBadge = visibleAlertCount > 0;

  // Resolve the page title from the active role menu
  const getPageTitle = () => {
    for (const section of activeMenu.sections) {
      for (const item of section.items) {
        if (pathname.startsWith(item.href)) {
          return item.name;
        }
      }
    }

    // Fallback title if the page route is not listed in the menu config
    return isStudentPanel ? 'Student Panel' : 'Lecturer Panel';
  };

  const pageTitle = getPageTitle();

  // Localised current date for the header
  const today = new Date().toLocaleDateString('en-MY', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8">
      {/* Left side: mobile menu button + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 lg:hidden"
          aria-label="Open sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12h18M3 6h18M3 18h18"
            />
          </svg>
        </button>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            {isStudentPanel ? 'Student Panel' : 'Lecturer Panel'}
          </p>
          <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
        </div>
      </div>

      {/* Right side: current date + alerts button */}
      <div className="flex items-center gap-4 lg:gap-6">
        <span className="hidden text-sm text-gray-500 sm:block">{today}</span>

        <Link
          href={alertsHref}
          className={`relative rounded-lg border bg-white p-2 hover:bg-gray-50 ${
            isAlertsPage ? 'border-[#E4002B]/25' : 'border-gray-200'
          }`}
          aria-label={showAlertBadge ? `Open alerts (${visibleAlertCount} unread)` : 'Open alerts'}
        >
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

          {showAlertBadge && (
            <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#E4002B] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
              {visibleAlertCount > 9 ? '9+' : visibleAlertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}