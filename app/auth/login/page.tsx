'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/auth/redirect';
  const error = searchParams.get('error');

  const handleMicrosoftLogin = async () => {
    setLoading(true);

    // Uses the existing Azure AD / Microsoft provider already set up in the project.
    // After successful login, user will continue to the redirect page.
    await signIn('azure-ad', { callbackUrl });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-2xl shadow-rose-100/60 lg:grid-cols-2">
          {/* =========================================================
              LEFT PANEL
              ========================================================= */}
          <section className="relative hidden overflow-hidden bg-[#111111] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 auth-grid" />
            <div
              className="absolute -left-24 top-0 h-72 w-72 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(228,0,43,0.20) 0%, transparent 70%)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 h-80 w-80 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(228,0,43,0.12) 0%, transparent 70%)',
              }}
            />

            {/* Brand */}
            <div className="relative z-10 fade-up">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>

              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4002B] text-lg font-black text-white shadow-lg shadow-rose-500/20">
                  AS
                </div>

                <div>
                  <p className="text-2xl font-black tracking-tight">
                    Attend<span className="text-[#E4002B]">Sync</span>
                  </p>
                  <p className="text-sm text-white/55">
                    Swinburne Sarawak Attendance System
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                Secure Sign-In
              </div>
            </div>

            {/* Public-facing message */}
            <div className="relative z-10 fade-up-1">
              <h1 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                Access your
                <span className="block text-[#E4002B]">AttendSync portal.</span>
              </h1>

              <p className="mt-5 max-w-md text-base leading-8 text-white/65">
                Sign in using your Swinburne Microsoft account to continue to the
                system.
              </p>
            </div>

            {/* Minimal public-safe note */}
            <div className="relative z-10 fade-up-2 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">Access Note</p>
              <p className="mt-2 text-sm leading-7 text-white/65">
                This page is for account access only. Protected system features are
                available after sign-in.
              </p>
            </div>
          </section>

          {/* =========================================================
              RIGHT PANEL
              ========================================================= */}
          <section className="flex min-h-[700px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
            <div className="mx-auto w-full max-w-md fade-up">
              {/* Mobile brand */}
              <div className="mb-10 flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E4002B] text-sm font-black text-white">
                  AS
                </div>
                <div>
                  <p className="text-lg font-black tracking-tight">
                    Attend<span className="text-[#E4002B]">Sync</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Swinburne Sarawak Attendance System
                  </p>
                </div>
              </div>

              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800 lg:hidden"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>

              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#E4002B]">
                Login
              </p>

              <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 text-base leading-8 text-gray-600">
                Sign in with your Swinburne Microsoft account.
              </p>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Sign-in failed during the Microsoft callback. Please try again.
                </div>
              )}

              {/* Microsoft Sign In */}
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2B2B2B] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#1B1B1B] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Redirecting to Microsoft...
                  </>
                ) : (
                  <>
                    {/* Microsoft logo */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 21 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </button>

              {/* Public-safe helper note */}
              <div className="mt-5 flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 flex-shrink-0 text-[#E4002B]"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">Secure Sign-In</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    You will be redirected to Microsoft to authenticate with your
                    university account.
                  </p>
                </div>
              </div>

              {/* Very short footer note */}
              <p className="mt-8 text-center text-xs text-gray-400">
                Need help signing in? Contact IT support.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}