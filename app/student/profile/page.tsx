'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  IdCard,
  Mail,
  Phone,
  School,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

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
    if (status === 'authenticated' && session?.user) {
      loadStudentProfile();
    }
  }, [status, session]);

  async function loadStudentProfile() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/student/profile', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load student profile.');
      }

      const data = await res.json();

      setProfileData({
        fullName: session?.user?.name || '',
        studentId: data.studentId || session?.user?.email?.split('@')[0] || '',
        email: session?.user?.email || '',
        phone: data.phone || 'Not available',
        program: data.program || 'Not synced yet',
        faculty: data.faculty || 'Not synced yet',
        intake: data.intake || 'Not synced yet',
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile information.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Student Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            My Profile
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View your account details and synced academic profile.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      )}

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Role
            </p>
            <UserCircle2 size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">Student</p>
          <p className="mt-2 text-xs text-gray-500">Current portal access role</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Student ID
            </p>
            <IdCard size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            {loading ? 'Loading...' : profileData.studentId}
          </p>
          <p className="mt-2 text-xs text-gray-500">Microsoft-linked identifier</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Program
            </p>
            <School size={18} className="text-gray-300" />
          </div>
          <p className="text-xl font-black tracking-tight text-gray-900">
            {loading ? 'Loading...' : profileData.program}
          </p>
          <p className="mt-2 text-xs text-gray-500">Synced academic data</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Account Status
            </p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-green-600">Active</p>
          <p className="mt-2 text-xs text-gray-500">Authenticated and available</p>
        </div>
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Profile identity card */}
        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-[#E4002B]">
                <UserCircle2 size={56} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-tight text-gray-900">
                {loading ? 'Loading...' : profileData.fullName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {loading ? 'Loading...' : profileData.studentId}
              </p>

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
                <p className="text-sm font-semibold text-gray-800">
                  {loading ? 'Loading...' : profileData.email}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Phone size={14} />
                  Phone
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {loading ? 'Loading...' : profileData.phone}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <School size={14} />
                  Program
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {loading ? 'Loading...' : profileData.program}
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
              These details are used to support student attendance visibility and account
              identification.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <UserCircle2 size={14} />
                Full Name
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.fullName}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <IdCard size={14} />
                Student ID
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.studentId}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <Calendar size={14} />
                Intake
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.intake}
              </p>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <Mail size={14} />
                Email Address
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.email}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <School size={14} />
                Program
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.program}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <Building2 size={14} />
                Faculty
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.faculty}
              </p>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                <Phone size={14} />
                Phone Number
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Loading...' : profileData.phone}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}