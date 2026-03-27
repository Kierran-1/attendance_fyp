import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Laptop,
  Shield,
  Smartphone,
  BarChart3,
  Clock3,
} from 'lucide-react';

/* Public page */
export default function HomePage() {
  const highlights = [
    {
      icon: Smartphone,
      title: 'Mobile-Friendly Check-In',
      description:
        'Students can access the system on phones, tablets, and laptops through a browser-based PWA experience.',
    },
    {
      icon: Clock3,
      title: 'Faster Attendance Flow',
      description:
        'Reduce manual roll calls and long queues at the start of tutorials, labs, and lectures.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Visibility',
      description:
        'Attendance records can later be synced to dashboards and reports for teaching staff.',
    },
    {
      icon: Shield,
      title: 'Secure University Access',
      description:
        'Sign-in is designed for Swinburne Microsoft accounts with role-based access for students and staff.',
    },
  ];

  const featurePoints = [
    'Microsoft account sign-in',
    'Responsive student and lecturer panels',
    'QR-based attendance workflow',
    'Export-ready reporting support',
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* =========================================================
          HERO SECTION
          ========================================================= */}
      <section className="relative overflow-hidden border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-red-50">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-red-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-pink-100/40 blur-3xl" />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-12 sm:px-8 lg:flex-row lg:items-center lg:px-12 lg:py-20">
          {/* Left content */}
          <div className="relative z-10 flex-1">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4002B] text-xl font-black text-white shadow-lg shadow-rose-200">
                AS
              </div>

              <div>
                <p className="text-2xl font-black tracking-tight sm:text-3xl">
                  Attend<span className="text-[#E4002B]">Sync</span>
                </p>
                <p className="text-sm text-gray-500">
                  Automated Attendance Taking System
                </p>
              </div>
            </div>

            <div className="mb-4 inline-flex items-center rounded-full border border-rose-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-rose-700 shadow-sm backdrop-blur">
              Swinburne University of Technology Sarawak Campus
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Smarter attendance,
              <span className="block text-[#E4002B]">faster check-ins.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
              AttendSync is a Progressive Web App developed to simplify class attendance tracking using secure login, QR code check-ins, and support for real-time synchronization.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E4002B] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-[#C70026]"
              >
                Sign in with Microsoft
                <ArrowRight size={18} />
              </Link>

              <a
                href="#about-system"
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-rose-300 hover:bg-rose-50"
              >
                About the System
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {featurePoints.map((point) => (
                <div
                  key={point}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-[#E4002B]" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right content / public-safe preview card */}
          <div className="relative z-10 flex-1">
            <div className="mx-auto max-w-xl rounded-[28px] border border-rose-100 bg-white p-4 shadow-2xl shadow-rose-100/70">
              <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-gradient-to-br from-[#111111] to-[#1F1F1F] p-6 text-white">
                {/* Top bar */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E4002B] text-sm font-black text-white">
                      AS
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        Attend<span className="text-[#E4002B]">Sync</span>
                      </p>
                      <p className="text-xs text-white/60">
                        PWA access across devices
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mock cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Link
                    href="/lecturer/dashboard"
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-[#E4002B]/40 hover:bg-white/10"
                  >
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Laptop size={16} className="text-[#FF9AAA]" />
                      Lecturer Access
                    </div>
                    <p className="text-sm leading-6 text-white/70">
                      Manage sessions, monitor attendance, and prepare reports.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#FF9AAA]">
                      View lecturer pages
                      <ArrowRight size={16} />
                    </div>
                  </Link>

                  <Link
                    href="/student/dashboard"
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-[#E4002B]/40 hover:bg-white/10"
                  >
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Smartphone size={16} className="text-[#FF9AAA]" />
                      Student Access
                    </div>
                    <p className="text-sm leading-6 text-white/70">
                      View classes, generate QR codes, and check attendance history.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#FF9AAA]">
                      View student pages
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          ABOUT SECTION
          ========================================================= */}
      <section id="about-system" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#E4002B]">
              About the System
            </p>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              An introduction to the attendance system
            </h2>
            <p className="mt-4 text-base leading-8 text-gray-600">
              This platform is intended to improve attendance taking efficiency,
              especially for larger classes, by providing a structured digital flow
              for secure check-in, attendance tracking, and lecturer-side monitoring.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#E4002B]">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA SECTION
          ========================================================= */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="rounded-[32px] bg-[#111111] px-6 py-10 text-white shadow-2xl shadow-rose-100 sm:px-10 lg:px-12 lg:py-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#FF9AAA]">
                  Get Started
                </p>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Sign in to continue
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/70 sm:text-base">
                  Students and staff can sign in with their Swinburne Microsoft
                  account to access role-based features in the prototype.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E4002B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#C70026]"
                >
                  Sign in with Microsoft
                  <ArrowRight size={18} />
                </Link>

                <a
                  href="#about-system"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Read More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}