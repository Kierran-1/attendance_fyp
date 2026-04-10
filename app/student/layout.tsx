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

    if (!session) {
      router.replace('/auth/login');
      return;
    }

    if (session.user.role !== 'STUDENT') {
      router.replace('/auth/redirect');
    }
  }, [session, status, router]);

  const isAuthorisedStudent =
    status === 'authenticated' && session?.user?.role === 'STUDENT';

  if (status === 'loading' || !isAuthorisedStudent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-white px-8 py-10 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4002B] text-lg font-black text-white">
            AS
          </div>

          <Loader2 size={26} className="animate-spin text-[#E4002B]" />

          <div className="space-y-1">
            <p className="text-base font-bold text-gray-900">
              Preparing student workspace
            </p>
            <p className="text-sm text-gray-500">
              Checking your sign-in session and student access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar
        panelTitle={studentMenu.panelTitle}
        menu={studentMenu.sections}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="flex min-h-screen flex-col lg:ml-64">
        <TopNavbar onMenuClick={toggleSidebar} />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-4 hidden rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm md:block">
              Signed in as{' '}
              <span className="font-semibold text-gray-900">
                {session.user.name ?? 'Student'}
              </span>
              {session.user.email ? (
                <>
                  {' '}·{' '}
                  <span className="text-gray-600">{session.user.email}</span>
                </>
              ) : null}
              {pathname !== '/student/dashboard' ? (
                <>
                  {' '}·{' '}
                  <span className="text-[#E4002B]">Student route protected</span>
                </>
              ) : null}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}