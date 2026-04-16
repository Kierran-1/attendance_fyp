'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Sidebar from '../components/sidebar';
import TopNavbar from '../components/navbar';
import { studentMenu } from '../config/studentMenu';

export default function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Redirect unauthenticated users back to login.
    if (!session) {
      router.replace('/auth/login');
      return;
    }

    // Redirect non-student users away from student routes.
    if (session.user.role !== 'STUDENT') {
      router.replace('/auth/redirect');
    }
  }, [session, status, router]);

  const isAuthorisedStudent =
    status === 'authenticated' && session?.user?.role === 'STUDENT';

  if (status === 'loading' || !isAuthorisedStudent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[2rem] border border-white/70 bg-white/90 px-8 py-10 text-center shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4002B] text-lg font-black text-white shadow-[0_18px_34px_rgba(228,0,43,0.24)]">
            AS
          </div>

          <Loader2 size={26} className="animate-spin text-[#E4002B]" />

          <div className="space-y-1">
            <p className="text-base font-bold text-slate-900">
              Preparing student workspace
            </p>
            <p className="text-sm text-slate-500">
              Checking your sign-in session and student access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        panelTitle={studentMenu.panelTitle}
        menu={studentMenu.sections}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="flex min-h-screen flex-col lg:ml-[17.5rem]">
        <TopNavbar onMenuClick={toggleSidebar} />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
            {/* Small route status strip to make the shell feel more polished */}
            <div className="rounded-[1.65rem] border border-white/80 bg-white/85 px-4 py-3 text-sm text-slate-500 shadow-sm backdrop-blur-xl">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900">
                    {session.user.name ?? 'Student'}
                  </span>
                  {session.user.email ? (
                    <span className="truncate"> · {session.user.email}</span>
                  ) : null}
                </div>

                <div className="text-[#E4002B]">
                  {pathname === '/student/dashboard'
                    ? 'Student dashboard ready'
                    : 'Student route protected'}
                </div>
              </div>
            </div>

            {/* Main white surface shared by all student pages */}
            <div className="rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-5 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}