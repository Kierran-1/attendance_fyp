'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // TODO: Replace with real Supabase auth
    setTimeout(() => {
      const emailValid = email.endsWith('@students.swinburne.edu.my') || email.endsWith('@swinburne.edu.my');
      if (!emailValid) { setError('Please use your Swinburne university email.'); setLoading(false); return; }
      if (email.includes('admin')) {
        router.push('/admin/dashboard');
      } else if (email.includes('lecturer') || email.includes('dr')) {
        router.push('/lecturer/dashboard');
      } else {
        router.push('/student/checkin');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-1 bg-[#0f0f0f] flex-col justify-between p-12 relative overflow-hidden">

        {/* Animated grid */}
        <div className="absolute inset-0 auth-grid" />

        {/* Glow blobs */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.18) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-16 -right-16 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.10) 0%, transparent 65%)' }} />

        {/* Brand */}
        <div className="relative z-10 fade-up">
          <div
            className="w-12 h-12 bg-[#E4002B] rounded-xl flex items-center justify-center text-white font-black text-lg mb-4"
            style={{ boxShadow: '0 0 40px rgba(228,0,43,0.4)' }}>
            AS
          </div>
          <div className="text-white text-2xl font-black tracking-tight">
            Attend<span className="text-[#E4002B]">Sync</span>
          </div>
          <div className="text-white/40 text-sm mt-1">Swinburne University of Technology Sarawak</div>
        </div>

        {/* Headline */}
        <div className="relative z-10 fade-up-1">
          <h2 className="text-5xl font-black text-white leading-tight tracking-tighter mb-4">
            Attendance,<br />on{' '}
            <span className="text-[#E4002B]">autopilot.</span>
          </h2>
          <p className="text-white/40 text-base leading-relaxed max-w-sm">
            Smart recognition and real-time sync for every class.
            No more roll calls. No more delays. Just scan and go.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 fade-up-2 flex gap-3">
          {[
            { val: '1,284', label: 'Students' },
            { val: '84%', label: 'Avg Attendance', red: true },
            { val: '36', label: 'Active Courses' },
          ].map((s) => (
            <div key={s.label}
              className="bg-white/[0.06] border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm hover:bg-white/10 transition-all cursor-default">
              <div className="text-white text-2xl font-black tracking-tight">
                {s.red
                  ? <><span className="text-[#E4002B]">{s.val.replace('%', '')}</span>%</>
                  : s.val}
              </div>
              <div className="text-white/40 text-[11px] uppercase tracking-widest mt-1 font-medium">{s.label}</div>
            </div>
          ))}
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
      <div className="w-full lg:w-[480px] flex-shrink-0 bg-white flex flex-col items-center justify-center px-8 sm:px-14 py-16 relative">

        {/* Left border glow */}
        <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(228,0,43,0.3), transparent)' }} />

        <div className="w-full max-w-sm fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#E4002B] rounded-lg flex items-center justify-center text-white font-black text-sm">AS</div>
            <div className="font-black text-lg tracking-tight">Attend<span className="text-[#E4002B]">Sync</span></div>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-8">Sign in with your Swinburne credentials</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                University Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">✉️</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@swinburne.edu.my"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#E4002B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  Password
                </label>
                <a href="#" className="text-[11px] text-[#E4002B] font-semibold hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">🔒</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-[#E4002B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(228,0,43,0.07)]"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#E4002B] hover:bg-[#B8001F] text-white font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(228,0,43,0.35)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In →'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-medium">or continue as</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Role quick access */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '🎓', label: 'Student', href: '/student/checkin' },
              { icon: '📊', label: 'Lecturer', href: '/lecturer/dashboard' },
              { icon: '⚙️', label: 'Admin', href: '/admin/dashboard' },
            ].map((role) => (
              <Link key={role.label} href={role.href}
                className="flex flex-col items-center gap-1.5 py-3 px-2 border-[1.5px] border-gray-100 rounded-xl bg-gray-50 text-gray-400 text-xs font-bold hover:border-[#E4002B] hover:text-[#E4002B] hover:bg-[#FFF0F2] transition-all hover:-translate-y-0.5">
                <span className="text-xl">{role.icon}</span>
                {role.label}
              </Link>
            ))}
          </div>

          {/* Register link */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-[#E4002B] font-bold hover:underline">
              Register here
            </Link>
          </p>
          <p className="text-center text-[11px] text-gray-300 mt-3">
            Need help?{' '}
            <a href="mailto:it@swinburne.edu.my" className="text-[#E4002B] font-semibold hover:underline">
              Contact IT Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
