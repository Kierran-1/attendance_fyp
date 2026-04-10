'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  IdCard,
  Loader2,
  Mail,
  Phone,
  School,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

type StudentProfileApiResponse = {
  studentId?: string;
  phone?: string;
  program?: string;
  faculty?: string;
  intake?: string;
};

type StudentProfileData = {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  program: string;
  faculty: string;
  intake: string;
};

export default function StudentProfilePage() {
  const { data: session, status } = useSession();

  const [profileData, setProfileData] = useState<StudentProfileData>({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    program: '',
    faculty: '',
    intake: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    async function loadStudentProfile() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/student/profile', {
          cache: 'no-store',
        });

        if (res.status === 403) {
          setError('This page is only available for student accounts.');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load student profile.');
        }

        const data: StudentProfileApiResponse = await res.json();

        setProfileData({
          fullName: session.user.name ?? 'Student',
          studentId: data.studentId ?? session.user.email?.split('@')[0] ?? 'Not available',
          email: session.user.email ?? 'Not available',
          phone: data.phone?.trim() ? data.phone : 'Not available',
          program: data.program?.trim() ? data.program : 'Not synced yet',
          faculty: data.faculty?.trim() ? data.faculty : 'Not synced yet',
          intake: data.intake?.trim() ? data.intake : 'Not synced yet',
        });
      } catch (err) {
        console.error('Error loading student profile:', err);
        setError('Failed to load profile information.');
      } finally {
        setLoading(false);
      }
    }

    loadStudentProfile();
  }, [session, status]);

  const isSessionLoading = status === 'loading';

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span>Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Profile</span>
      </nav>

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            My <span className="text-red-600">Profile</span>
          </h1>
          <p className="max-w-2xl text-base text-gray-500">
            View your Microsoft-linked student details and synced academic information
            used across the attendance system.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-red-100 hover:text-red-600"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      ) : null}

      {/* Summary cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Role
            </p>
            <UserCircle2 size={18} className="text-gray-300" />
          </div>
          <p className="text-3xl font-black tracking-tight text-gray-900">
            {isSessionLoading ? '—' : 'Student'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Current portal access role</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Student ID
            </p>
            <IdCard size={18} className="text-gray-300" />
          </div>
          <p className="text-3xl font-black tracking-tight text-gray-900">
            {loading || isSessionLoading ? '—' : profileData.studentId}
          </p>
          <p className="mt-2 text-xs text-gray-500">Microsoft-linked identifier</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Program
            </p>
            <School size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {loading || isSessionLoading ? '—' : profileData.program}
          </p>
          <p className="mt-2 text-xs text-gray-500">Synced academic data</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Account Status
            </p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p className="text-3xl font-black tracking-tight text-green-600">
            {isSessionLoading ? '—' : 'Active'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Authenticated and available</p>
        </div>
      </section>

      {(loading || isSessionLoading) && !error ? (
        <section className="flex items-center justify-center gap-3 rounded-[2rem] border border-gray-100 bg-white px-6 py-16 text-sm text-gray-500 shadow-sm">
          <Loader2 size={18} className="animate-spin text-red-600" />
          Loading profile...
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Identity card */}
          <div className="space-y-6">
            <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-[#E4002B]">
                  <UserCircle2 size={56} />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight text-gray-900">
                  {profileData.fullName}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{profileData.studentId}</p>

                <div className="mt-4 inline-flex rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-[#E4002B]">
                  Student Account
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    <Mail size={14} />
                    Email
                  </div>
                  <p className="break-all text-sm font-semibold text-gray-800">
                    {profileData.email}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    <Phone size={14} />
                    Phone
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {profileData.phone}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    <School size={14} />
                    Program
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {profileData.program}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed fields */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                Profile Details
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                Synced Account Information
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-500">
                These details are read-only and synced from your Microsoft-linked student
                account to support attendance visibility and identity verification.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <UserCircle2 size={14} />
                  Full Name
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {profileData.fullName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <IdCard size={14} />
                  Student ID
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {profileData.studentId}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Calendar size={14} />
                  Intake
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {profileData.intake}
                </p>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Mail size={14} />
                  Email Address
                </div>
                <p className="break-all text-sm font-semibold text-gray-900">
                  {profileData.email}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <School size={14} />
                  Program
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {profileData.program}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Building2 size={14} />
                  Faculty
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {profileData.faculty}
                </p>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Phone size={14} />
                  Phone Number
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {profileData.phone}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}