'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    await signIn('azure-ad', { callbackUrl: '/auth/redirect' });
    // loading stays true — the page will navigate away on success
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
        <div className="relative z-10 fade-up-2 flex gap-4">
          {[
            { val: '1,284', label: 'Students' },
            { val: '84%', label: 'Avg Attendance', red: true },
            { val: '36', label: 'Active Courses' },
          ].map((s) => (
            <div key={s.label}
              className="bg-white/[0.06] border border-white/10 rounded-2xl px-6 py-5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-default">
              <div className="text-white text-3xl font-black tracking-tight">
                {s.red
                  ? <><span className="text-[#E4002B]">{s.val.replace('%', '')}</span>%</>
                  : s.val}
              </div>
              <div className="text-white/50 text-xs uppercase tracking-widest mt-2 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>


      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full lg:w-[560px] flex-shrink-0 bg-white flex flex-col items-center justify-center px-8 sm:px-16 py-16 relative">

        <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(228,0,43,0.3), transparent)' }} />

        <div className="w-full max-w-md fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-[#E4002B] rounded-lg flex items-center justify-center text-white font-black text-sm">AS</div>
            <div className="font-black text-lg tracking-tight">Attend<span className="text-[#E4002B]">Sync</span></div>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-3">Welcome back</h1>
          <p className="text-gray-400 text-base mb-12 leading-relaxed">Sign in with your Swinburne Microsoft account to continue.</p>

          {/* Microsoft Sign In Button */}
          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold rounded-xl text-base transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Redirecting to Microsoft...
              </>
            ) : (
              <>
                {/* Official Microsoft logo squares */}
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                Sign in with Microsoft
              </>
            )}
          </button>

          {/* Info box */}
          <div className="mt-5 bg-gray-50 border border-gray-100 rounded-xl p-4 flex gap-3">
            <ShieldCheck size={18} className="text-[#E4002B] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="text-gray-600 font-bold block mb-0.5">Secure Sign-In</span>
              You will be redirected to Microsoft&apos;s authentication page. Sign in with your university account — the same one you use for Teams and Outlook.
            </p>
          </div>

          <p className="text-center text-xs text-gray-300 mt-10">
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
