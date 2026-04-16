'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  IdCard,
  Loader2,
  Mail,
  Phone,
  School,
  ShieldCheck,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';

type StudentProfileApiResponse = {
  studentId?: string;
  phone?: string;
  program?: string;
  faculty?: string;
};

type StudentProfile = {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  program: string;
  faculty: string;
};

type DetailCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

function DetailCard({ label, value, icon: Icon }: DetailCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-rose-100 hover:bg-rose-50/40">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-white p-2 text-[#E4002B] shadow-sm">
          <Icon size={16} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
      </div>

      <p className="break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function StudentProfilePage() {
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<StudentProfile>({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    program: '',
    faculty: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    async function loadProfile() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/student/profile', {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to load profile.');
        }

        const data: StudentProfileApiResponse = await res.json();

        setProfile({
          fullName: session.user.name ?? 'Student',
          studentId:
            data.studentId ?? session.user.email?.split('@')[0] ?? 'Not available',
          email: session.user.email ?? 'Not available',
          phone: data.phone?.trim() || 'Not available',
          program: data.program?.trim() || 'Not available',
          faculty: data.faculty?.trim() || 'Not available',
        });
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile information.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session, status]);

  const initials = useMemo(() => {
    return (profile.fullName || session?.user?.name || 'S')
      .trim()
      .charAt(0)
      .toUpperCase();
  }, [profile.fullName, session?.user?.name]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <Loader2 size={18} className="animate-spin text-[#E4002B]" />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Student Portal
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            My <span className="text-[#E4002B]">Profile</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            View your student account details and synced academic information.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#E4002B] via-rose-500 to-rose-400 px-6 py-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
              Account Overview
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Student Identity
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/85">
              This information is linked to your signed-in account and used across
              the attendance system.
            </p>
          </div>

          <div className="px-6 pb-6 pt-16">
            <div className="-mt-24 flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white text-2xl font-black text-[#E4002B] shadow-[0_16px_40px_rgba(15,23,42,0.15)]">
                {initials}
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                {profile.fullName}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {profile.studentId}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <ShieldCheck size={14} />
                Active Student Account
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Email Address
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                  {profile.email}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Contact Number
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {profile.phone}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Academic Information
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Student Details
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              These details help identify your account, program, and faculty within
              the system.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailCard label="Full Name" value={profile.fullName} icon={UserCircle2} />
            <DetailCard label="Student ID" value={profile.studentId} icon={IdCard} />
            <DetailCard label="Email" value={profile.email} icon={Mail} />
            <DetailCard label="Phone" value={profile.phone} icon={Phone} />
            <DetailCard label="Program" value={profile.program} icon={School} />
            <DetailCard label="Faculty" value={profile.faculty} icon={Building2} />
          </div>
        </section>
      </div>
    </div>
  );
}