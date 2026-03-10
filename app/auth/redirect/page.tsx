'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  LECTURER: '/lecturer/dashboard',
  STUDENT: '/student/dashboard',
};

export default function AuthRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/auth/login');
      return;
    }

    const destination = ROLE_ROUTES[session.user.role] ?? '/auth/login';
    router.replace(destination);
  }, [session, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-[#E4002B] rounded-xl flex items-center justify-center text-white font-black text-lg">
          AS
        </div>
        <Loader2 size={24} className="animate-spin text-[#E4002B]" />
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  );
}
