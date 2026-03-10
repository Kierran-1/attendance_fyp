'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  { value: 'student', label: 'Student', icon: '🎓', desc: 'Mark attendance via QR or facial recognition' },
  { value: 'lecturer', label: 'Lecturer', icon: '📊', desc: 'Monitor attendance and generate reports' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: '',
    fullName: '',
    studentId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step === 1 && !form.role) { setError('Please select your role.'); return; }
    if (step === 2) {
      if (!form.fullName || !form.studentId || !form.email) { setError('Please fill in all fields.'); return; }
      if (!form.email.endsWith('@students.swinburne.edu.my') && !form.email.endsWith('@swinburne.edu.my')) {
        setError('Please use your Swinburne university email (@students.swinburne.edu.my or @swinburne.edu.my).'); return;
      }
    }
    if (step === 3) {
      if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
      setLoading(true);
      // TODO: Replace with real Supabase registration
      setTimeout(() => {
        router.push('/auth/login');
        setLoading(false);
      }, 1200);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-1 bg-[#0f0f0f] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 auth-grid" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.18) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-16 -right-16 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.10) 0%, transparent 65%)' }} />

        {/* Brand */}
        <div className="relative z-10 fade-up">
          <div className="w-12 h-12 bg-[#E4002B] rounded-xl flex items-center justify-center text-white font-black text-lg mb-4"
            style={{ boxShadow: '0 0 40px rgba(228,0,43,0.4)' }}>
            AS
          </div>
          <div className="text-white text-2xl font-black tracking-tight">
            Attend<span className="text-[#E4002B]">Sync</span>
          </div>
          <div className="text-white/40 text-sm mt-1">Swinburne University of Technology Sarawak</div>
        </div>

        {/* Steps guide */}
        <div className="relative z-10 fade-up-1 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-6">Registration Steps</p>
          {[
            { n: 1, title: 'Choose Your Role', desc: 'Student or Lecturer' },
            { n: 2, title: 'Your Details', desc: 'Name, ID and email' },
            { n: 3, title: 'Set Password', desc: 'Secure your account' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                step > s.n
                  ? 'bg-[#E4002B] text-white'
                  : step === s.n
                    ? 'bg-[#E4002B] text-white shadow-[0_0_20px_rgba(228,0,43,0.5)]'
                    : 'bg-white/10 text-white/30'
              }`}>
                {step > s.n ? '✓' : s.n}
              </div>
              <div>
                <div className={`text-sm font-bold transition-colors ${step >= s.n ? 'text-white' : 'text-white/30'}`}>
                  {s.title}
                </div>
                <div className="text-white/30 text-xs">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 fade-up-2">
          <p className="text-white/20 text-sm italic leading-relaxed max-w-xs">
            &ldquo;Attendance tracking made effortless — so lecturers can focus on teaching, not admin.&rdquo;
          </p>
        </div>

        {/* Ticker */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.07] py-3 z-10">
          <div className="ticker-wrap">
            <div className="ticker-inner text-[11px] text-white/25 font-medium">
              {[
                'COS40005 — Session Active',
                'COS20019 — 42 students checked in',
                'COS30049 — Attendance window open',
                'COS10009 — Starting in 15 min',
                'COS40005 — Session Active',
                'COS20019 — 42 students checked in',
                'COS30049 — Attendance window open',
                'COS10009 — Starting in 15 min',
              ].map((item, i) => (
                <span key={i} className="mx-6">
                  <span className="text-[#E4002B]/70 mr-2">●</span>{item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full lg:w-[500px] flex-shrink-0 bg-white flex flex-col items-center justify-center px-8 sm:px-14 py-16 relative">
        <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(228,0,43,0.3), transparent)' }} />

        <div className="w-full max-w-sm fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#E4002B] rounded-lg flex items-center justify-center text-white font-black text-sm">AS</div>
            <div className="font-black text-lg tracking-tight">Attend<span className="text-[#E4002B]">Sync</span></div>
          </div>

          {/* Step indicator (mobile) */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-[#E4002B]' : 'bg-gray-100'}`} />
            ))}
          </div>

          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1">Create account</h1>
          <p className="text-gray-400 text-sm mb-8">
            Step {step} of 3 —{' '}
            {step === 1 ? 'Choose your role' : step === 2 ? 'Your details' : 'Set your password'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleNext} className="space-y-4">

            {/* STEP 1: Role selection */}
            {step === 1 && (
              <div className="space-y-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => update('role', role.value)}
                    className={`w-full flex items-center gap-4 p-4 border-[1.5px] rounded-xl text-left transition-all ${
                      form.role === role.value
                        ? 'border-[#E4002B] bg-[#FFF0F2]'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl">{role.icon}</span>
                    <div>
                      <div className={`font-bold text-sm ${form.role === role.value ? 'text-[#E4002B]' : 'text-gray-800'}`}>
                        {role.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{role.desc}</div>
                    </div>
                    <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      form.role === role.value ? 'border-[#E4002B] bg-[#E4002B]' : 'border-gray-200'
                    }`}>
                      {form.role === role.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: Details */}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">👤</span>
                    <input
                      type="text" required value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      placeholder="e.g. Ahmad bin Zulkifli"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#E4002B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    {form.role === 'student' ? 'Student ID' : 'Staff ID'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">🪪</span>
                    <input
                      type="text" required value={form.studentId}
                      onChange={(e) => update('studentId', e.target.value)}
                      placeholder={form.role === 'student' ? 'e.g. 103214789' : 'e.g. STF00123'}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#E4002B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">University Email</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">✉️</span>
                    <input
                      type="email" required value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="yourname@swinburne.edu.my"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#E4002B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)]"
                    />
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: Password */}
            {step === 3 && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">🔒</span>
                    <input
                      type="password" required value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#E4002B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)]"
                    />
                  </div>
                  {/* Password strength */}
                  {form.password && (
                    <div className="flex gap-1 mt-2">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          form.password.length >= i * 3
                            ? form.password.length >= 10 ? 'bg-green-400' : 'bg-[#E4002B]'
                            : 'bg-gray-100'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">🔒</span>
                    <input
                      type="password" required value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)] ${
                        form.confirmPassword && form.confirmPassword !== form.password
                          ? 'border-red-300 focus:border-red-400'
                          : form.confirmPassword && form.confirmPassword === form.password
                            ? 'border-green-300 focus:border-green-400'
                            : 'border-gray-100 focus:border-[#E4002B]'
                      }`}
                    />
                    {form.confirmPassword && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">
                        {form.confirmPassword === form.password ? '✅' : '❌'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                  <div><span className="font-bold text-gray-700">Name:</span> {form.fullName}</div>
                  <div><span className="font-bold text-gray-700">ID:</span> {form.studentId}</div>
                  <div><span className="font-bold text-gray-700">Email:</span> {form.email}</div>
                  <div><span className="font-bold text-gray-700">Role:</span> {form.role.charAt(0).toUpperCase() + form.role.slice(1)}</div>
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-5 py-3 border-[1.5px] border-gray-100 rounded-xl text-sm font-bold text-gray-400 hover:border-gray-200 hover:text-gray-600 transition-all">
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 bg-[#E4002B] hover:bg-[#B8001F] text-white font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(228,0,43,0.35)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden">
                <span className="relative z-10">
                  {loading ? 'Creating account...' : step === 3 ? 'Create Account →' : 'Continue →'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#E4002B] font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
