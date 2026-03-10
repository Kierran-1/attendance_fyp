'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-1 bg-[#0f0f0f] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 auth-grid" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.18) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-16 -right-16 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.10) 0%, transparent 65%)' }} />

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

        <div className="relative z-10 fade-up-1">
          <h2 className="text-5xl font-black text-white leading-tight tracking-tighter mb-4">
            No sign-up<br />
            <span className="text-[#E4002B]">required.</span>
          </h2>
          <p className="text-white/40 text-base leading-relaxed max-w-sm">
            Your account is automatically set up using your Swinburne Microsoft credentials.
            Just sign in and you&apos;re ready to go.
          </p>
        </div>

        <div className="relative z-10 fade-up-2 flex gap-3">
          {[
            { val: '1,284', label: 'Students' },
            { val: '84%', label: 'Avg Attendance', red: true },
            { val: '36', label: 'Active Courses' },
          ].map((s) => (
            <div key={s.label}
              className="bg-white/[0.06] border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm cursor-default">
              <div className="text-white text-2xl font-black tracking-tight">
                {s.red ? <><span className="text-[#E4002B]">{s.val.replace('%', '')}</span>%</> : s.val}
              </div>
              <div className="text-white/40 text-[11px] uppercase tracking-widest mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.07] py-3 z-10">
          <div className="ticker-wrap">
            <div className="ticker-inner text-[11px] text-white/25 font-medium">
              {['COS40005 — Session Active', 'COS20019 — 42 students checked in',
                'COS30049 — Attendance window open', 'COS10009 — Starting in 15 min',
                'COS40005 — Session Active', 'COS20019 — 42 students checked in',
                'COS30049 — Attendance window open', 'COS10009 — Starting in 15 min',
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
        <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(228,0,43,0.3), transparent)' }} />

        <div className="w-full max-w-sm fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-[#E4002B] rounded-lg flex items-center justify-center text-white font-black text-sm">AS</div>
            <div className="font-black text-lg tracking-tight">Attend<span className="text-[#E4002B]">Sync</span></div>
          </div>

          <div className="w-14 h-14 bg-[#FFF0F2] rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={26} className="text-[#E4002B]" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">No account needed</h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            AttendSync uses your existing Swinburne Microsoft account —
            the same one you use for Teams, Outlook, and student portals.
            There&apos;s nothing to register.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {[
              { n: 1, title: 'Go to Sign In', desc: 'Click the button below to go to the login page' },
              { n: 2, title: 'Sign in with Microsoft', desc: 'Use your @students.swinburne.edu.my or @swinburne.edu.my account' },
              { n: 3, title: "You're in", desc: 'Your profile and courses load automatically from Active Directory' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="w-7 h-7 bg-[#E4002B] text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                  {s.n}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    {s.title}
                    {s.n === 3 && <CheckCircle2 size={14} className="text-green-500" />}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
            <ArrowRight size={16} />
          </Link>

          <p className="text-center text-[11px] text-gray-300 mt-6">
            Having trouble?{' '}
            <a href="mailto:it@swinburne.edu.my" className="text-[#E4002B] font-semibold hover:underline">
              Contact IT Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
