'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  IdCard,
  Mail,
  School,
  UserCircle2,
  AlertCircle,
  Phone,
  BookOpen,
  Building2,
  Calendar,
} from 'lucide-react';

export default function StudentProfilePage() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    fullName: '', // From Microsoft
    studentId: '', // From Microsoft
    email: '', // From Microsoft
    phone: '',
    program: '',
    faculty: '',
    intake: '',
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load ALL student data from Microsoft Authenticator
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadStudentDataFromMicrosoft();
    }
  }, [status, session]);

  const loadStudentDataFromMicrosoft = async () => {
    try {
      // Fetch all student data from database (synced with Microsoft account)
      const res = await fetch('/api/student/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({
          ...prev,
          fullName: session?.user?.name || '',
          studentId: session?.user?.email?.split('@')[0] || '', // From Microsoft email
          email: session?.user?.email || '',
          phone: data.phone || '',
          program: data.program || '',
          faculty: data.faculty || '',
          intake: data.intake || '',
        }));
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
  };

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
            View your account details and update basic profile information.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Role
            </p>
            <UserCircle2 size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-gray-900">
            Student
          </p>
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
            {formData.studentId}
          </p>
          <p className="mt-2 text-xs text-gray-500">From Microsoft Authenticator</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Program
            </p>
            <School size={18} className="text-gray-300" />
          </div>
          <p className="text-xl font-black tracking-tight text-gray-900">
            BCS
          </p>
          <p className="mt-2 text-xs text-gray-500">Academic program overview</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Account Status
            </p>
            <ShieldCheck size={18} className="text-gray-300" />
          </div>
          <p className="text-2xl font-black tracking-tight text-green-600">
            Active
          </p>
          <p className="mt-2 text-xs text-gray-500">Profile currently available</p>
        </div>
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Profile card */}
        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-[#E4002B]">
                <UserCircle2 size={56} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-tight text-gray-900">
                {formData.fullName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{formData.studentId}</p>

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
                  {formData.email}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <Phone size={14} />
                  Phone
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {formData.phone}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  <School size={14} />
                  Program
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {formData.program}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm">
            <p className="text-sm font-bold text-[#E4002B]">🔒 Microsoft Authenticator Data</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              All student information is fetched from <strong>Microsoft Authenticator</strong>. Your <strong>Student ID</strong>, <strong>Full Name</strong>, and <strong>Email Address</strong> are synchronized and protected. Other fields can be edited for your profile.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
              Profile Details
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
              Update Basic Information
            </h2>
            <p className="mt-2 text-sm leading-7 text-gray-500">
              Edit the fields below to preview the student profile form layout.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Full Name <span className="text-xs text-gray-400">(from Microsoft)</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">This field is synced from Microsoft Authenticator and cannot be changed.</p>
            </div>

            <div>
              <label
                htmlFor="studentId"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Student ID <span className="text-xs text-gray-400">(from Microsoft)</span>
              </label>
              <input
                id="studentId"
                type="text"
                value={formData.studentId}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">This field is synced from Microsoft Authenticator and cannot be changed.</p>
            </div>

            <div>
              <label
                htmlFor="intake"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Intake Year
              </label>
              <input
                id="intake"
                type="text"
                value={formData.intake}
                onChange={(e) => handleChange('intake', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email Address <span className="text-xs text-gray-400">(from Microsoft)</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">This field is synced from Microsoft Authenticator and cannot be changed.</p>
            </div>

            <div>
              <label
                htmlFor="program"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Program <span className="text-xs text-gray-400">(from Authenticator)</span>
              </label>
              <input
                id="program"
                type="text"
                value={formData.program}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Synced from Microsoft Authenticator and database.</p>
            </div>

            <div>
              <label
                htmlFor="faculty"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Faculty <span className="text-xs text-gray-400">(from Authenticator)</span>
              </label>
              <input
                id="faculty"
                type="text"
                value={formData.faculty}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Synced from Microsoft Authenticator and database.</p>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Phone Number <span className="text-xs text-gray-400">(from Authenticator)</span>
              </label>
              <input
                id="phone"
                type="text"
                value={formData.phone}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Synced from Microsoft Authenticator and database.</p>
            </div>

            <div>
              <label
                htmlFor="intake"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Intake Year <span className="text-xs text-gray-400">(from Authenticator)</span>
              </label>
              <input
                id="intake"
                type="text"
                value={formData.intake}
                disabled
                className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Synced from Microsoft Authenticator and database.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {error && (
              <div className="w-full inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 mb-4">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
              <ShieldCheck size={16} />
              All fields are synced from Microsoft Authenticator
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}