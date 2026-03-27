'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  IdCard,
  Mail,
  Phone,
  Save,
  School,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

/**
 * Later integration:
 * - load real student data from backend / Supabase
 * - save changes through server-side update logic
 */

export default function StudentProfilePage() {
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    studentId: '102788856',
    email: '102788856@students.swinburne.edu.my',
    phone: '+60 12-345 6789',
    program: 'Bachelor of Computer Science',
    faculty: 'Faculty of Engineering, Computing and Science',
    intake: '2023',
  });

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
  };

  const handleCopyStudentId = async () => {
    try {
      await navigator.clipboard.writeText(formData.studentId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleSave = () => {
    /**
     * Frontend-first save action only.
     * Later replace with real API / server action.
     */
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
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

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
          >
            <Save size={16} />
            Save Changes
          </button>
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
          <div className="flex items-center gap-2">
            <p className="text-2xl font-black tracking-tight text-gray-900">
              {formData.studentId}
            </p>
            <button
              type="button"
              onClick={handleCopyStudentId}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
            >
              <Copy size={12} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">University student account</p>
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
            <p className="text-sm font-bold text-[#E4002B]">Student Note</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              This page is currently frontend-first. The save button is only a UI
              action for now. Later, connect it to real database update logic.
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
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label
                htmlFor="studentId"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={formData.studentId}
                onChange={(e) => handleChange('studentId', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
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
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label
                htmlFor="program"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Program
              </label>
              <input
                id="program"
                type="text"
                value={formData.program}
                onChange={(e) => handleChange('program', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="faculty"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Faculty
              </label>
              <input
                id="faculty"
                type="text"
                value={formData.faculty}
                onChange={(e) => handleChange('faculty', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
            >
              <Save size={16} />
              Save Changes
            </button>

            {saved && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                <Check size={16} />
                Changes saved
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}