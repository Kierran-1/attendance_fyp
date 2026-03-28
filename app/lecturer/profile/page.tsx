'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Edit3,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

/*
 * Later integration:
 * - load real lecturer info from Microsoft / backend
 * - save updates to database
 * - connect password/security actions to real auth flow
 */
export default function LecturerProfilePage() {
  const [profile, setProfile] = useState({
    fullName: 'Dr. Mary Lee',
    staffId: 'STAFF001',
    email: 'marylee@swinburne.edu.my',
    phone: '+60 13-888 1234',
    faculty: 'Faculty of Engineering, Computing and Science',
    role: 'Lecturer',
    officeLocation: 'Swinburne Sarawak Campus',
    bio: 'Lecturer account profile for attendance tracking, class management, reporting, and student communication workflows.',
  });

  const [saved, setSaved] = useState(false);

  const profileStats = useMemo(
    () => ({
      totalUnits: 4,
      activeStudents: 157,
      sessionsHandled: 28,
      alertsSent: 6,
    }),
    []
  );

  const handleChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        'lecturerProfileFrontend',
        JSON.stringify(profile)
      );
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 1800);
    } catch (error) {
      console.error('Failed to save lecturer profile:', error);
      window.alert('Saving profile failed in browser storage.');
    }
  };

  const handleChangePassword = () => {
    window.alert('Password update is frontend-only for now.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            My Account
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            View lecturer account details, update profile information, and review
            access-related settings for the attendance system.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lecturer/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Units Managed"
          value={profileStats.totalUnits}
          note="Tracked lecturer units"
          valueClassName="text-gray-900"
          icon={<BookOpen size={18} className="text-gray-300" />}
        />

        <SummaryCard
          label="Students"
          value={profileStats.activeStudents}
          note="Students across current classes"
          valueClassName="text-gray-900"
          icon={<UserCircle2 size={18} className="text-gray-300" />}
        />

        <SummaryCard
          label="Sessions Handled"
          value={profileStats.sessionsHandled}
          note="Attendance sessions handled"
          valueClassName="text-green-600"
          icon={<CalendarDays size={18} className="text-green-500" />}
        />

        <SummaryCard
          label="Alerts Sent"
          value={profileStats.alertsSent}
          note="Lecturer messages prepared"
          valueClassName="text-[#E4002B]"
          icon={<ShieldCheck size={18} className="text-[#E4002B]" />}
        />
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-[#E4002B]">
                <UserCircle2 size={56} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-tight text-gray-900">
                {profile.fullName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{profile.staffId}</p>

              <div className="mt-4 inline-flex rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-[#E4002B]">
                {profile.role}
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <InfoPanel
                icon={<Mail size={14} />}
                label="Email"
                value={profile.email}
              />
              <InfoPanel
                icon={<Phone size={14} />}
                label="Phone"
                value={profile.phone}
              />
              <InfoPanel
                icon={<BookOpen size={14} />}
                label="Faculty"
                value={profile.faculty}
              />
              <InfoPanel
                icon={<ShieldCheck size={14} />}
                label="Role Access"
                value="Lecturer portal privileges active"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#E4002B]" />
              <h3 className="text-base font-bold text-gray-900">
                Role-Based Access
              </h3>
            </div>

            <p className="text-sm leading-7 text-gray-700">
              This lecturer account is intended for attendance session control,
              class management, roster upload, report viewing, and student alert
              communication. This helps demonstrate the project’s role-based system
              requirement between lecturer and student users.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={18} className="text-[#E4002B]" />
              <h3 className="text-base font-bold text-gray-900">
                Security Actions
              </h3>
            </div>

            <p className="mb-4 text-sm leading-7 text-gray-600">
              Password and account security actions are shown here as frontend UI
              first, and can later be connected to the real authentication flow.
            </p>

            <button
              type="button"
              onClick={handleChangePassword}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
            >
              <KeyRound size={16} />
              Change Password
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-[#E4002B]">
              <Edit3 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
                Profile Details
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
                Update Lecturer Information
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-500">
                Edit the lecturer profile layout here first. Later, this can be
                connected to Microsoft identity data and the project database.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Full Name"
              value={profile.fullName}
              onChange={(value) => handleChange('fullName', value)}
            />

            <FormField
              label="Staff ID"
              value={profile.staffId}
              onChange={(value) => handleChange('staffId', value)}
            />

            <div className="sm:col-span-2">
              <FormField
                label="Email Address"
                value={profile.email}
                onChange={(value) => handleChange('email', value)}
                type="email"
              />
            </div>

            <FormField
              label="Phone Number"
              value={profile.phone}
              onChange={(value) => handleChange('phone', value)}
            />

            <FormField
              label="Role"
              value={profile.role}
              onChange={(value) => handleChange('role', value)}
            />

            <div className="sm:col-span-2">
              <FormField
                label="Faculty"
                value={profile.faculty}
                onChange={(value) => handleChange('faculty', value)}
              />
            </div>

            <div className="sm:col-span-2">
              <FormField
                label="Office / Campus Location"
                value={profile.officeLocation}
                onChange={(value) => handleChange('officeLocation', value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Profile Description
              </label>
              <textarea
                rows={5}
                value={profile.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
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
                <CheckCircle2 size={16} />
                Profile saved in UI
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  valueClassName,
  icon,
}: {
  label: string;
  value: string | number;
  note: string;
  valueClassName: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
          {label}
        </p>
        {icon}
      </div>
      <p className={`text-4xl font-black tracking-tight ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function InfoPanel({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
      />
    </div>
  );
}