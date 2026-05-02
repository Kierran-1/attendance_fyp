'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

type Submission = {
  id: string;
  fileUrl: string;
  fileName: string;
  reason: string;
  status: string;
  lecturerComment: string | null;
  reviewedAt: string | null;
  uploadedAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  unitCode: string;
  unitName: string;
  sessionName: string;
  sessionDate: string | null;
  sessionDay: string | null;
  sessionWeek: number | null;
};

type ReviewState = {
  comment: string;
  submitting: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatSessionLabel(s: Submission) {
  const parts: string[] = [s.sessionName];
  if (s.sessionWeek != null) parts.push(`Wk ${s.sessionWeek}`);
  if (s.sessionDay) parts.push(s.sessionDay);
  return parts.join(' · ');
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-700">
        <CheckCircle2 size={11} />
        Approved
      </span>
    );
  if (status === 'REJECTED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
        <XCircle size={11} />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
      <Clock size={11} />
      Pending
    </span>
  );
}

export default function LecturerAbsencePage() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/lecturer/absence', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load submissions');
        setSubmissions(Array.isArray(json.submissions) ? json.submissions : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load submissions.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => ({
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'PENDING').length,
    approved: submissions.filter((s) => s.status === 'APPROVED').length,
    rejected: submissions.filter((s) => s.status === 'REJECTED').length,
  }), [submissions]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return submissions.filter((s) => {
      const matchesFilter = filter === 'ALL' || s.status === filter;
      const matchesSearch =
        !kw ||
        s.studentName.toLowerCase().includes(kw) ||
        s.studentEmail.toLowerCase().includes(kw) ||
        s.unitCode.toLowerCase().includes(kw) ||
        s.unitName.toLowerCase().includes(kw) ||
        s.sessionName.toLowerCase().includes(kw);
      return matchesFilter && matchesSearch;
    });
  }, [submissions, filter, search]);

  function getReviewState(id: string): ReviewState {
    return reviewStates[id] ?? { comment: '', submitting: false };
  }

  function setReviewComment(id: string, comment: string) {
    setReviewStates((prev) => ({
      ...prev,
      [id]: { ...getReviewState(id), comment },
    }));
  }

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    const state = getReviewState(id);
    setReviewStates((prev) => ({
      ...prev,
      [id]: { ...state, submitting: true },
    }));
    try {
      const res = await fetch(`/api/lecturer/absence/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, lecturerComment: state.comment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Review failed');
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status,
                lecturerComment: state.comment.trim() || null,
                reviewedAt: new Date().toISOString(),
              }
            : s
        )
      );
      setExpandedId(null);
      setReviewStates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Review failed. Please try again.');
      setReviewStates((prev) => ({
        ...prev,
        [id]: { ...state, submitting: false },
      }));
    }
  }

  const filterTabs: Array<{ key: typeof filter; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="cursor-default hover:text-gray-600">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Absence Requests</span>
      </nav>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
            Absence Requests
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Review medical certificates and absence documents submitted by students.
          </p>
        </div>

        <Link
          href="/lecturer/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total
            </p>
            <FileText size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">
            {loading ? '—' : stats.total}
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Pending
            </p>
            <Clock size={18} className="text-amber-400" />
          </div>
          <p className="text-4xl font-black tracking-tight text-amber-600">
            {loading ? '—' : stats.pending}
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Approved
            </p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">
            {loading ? '—' : stats.approved}
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Rejected
            </p>
            <XCircle size={18} className="text-red-400" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">
            {loading ? '—' : stats.rejected}
          </p>
        </div>
      </section>

      <section className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterTabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  filter === key
                    ? 'bg-[#E4002B] text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-[#E4002B]/20 hover:text-[#E4002B]'
                }`}
              >
                {label}
                {key !== 'ALL' ? (
                  <span className="ml-1.5 text-[11px] opacity-70">
                    ({key === 'PENDING' ? stats.pending : key === 'APPROVED' ? stats.approved : stats.rejected})
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, unit…"
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100 sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-16 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin text-red-600" />
            Loading submissions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <FileText size={32} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-bold text-gray-900">No submissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'ALL'
                ? 'No absence documents have been submitted for your sessions yet.'
                : `No ${filter.toLowerCase()} submissions.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sub) => {
              const isExpanded = expandedId === sub.id;
              const rev = getReviewState(sub.id);

              return (
                <article
                  key={sub.id}
                  className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm transition hover:border-gray-200"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#E4002B]">
                        <FileText size={18} />
                      </div>

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={sub.status} />
                          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600">
                            {sub.unitCode}
                          </span>
                        </div>

                        <p className="font-bold text-gray-900">{sub.studentName}</p>
                        <p className="text-sm text-gray-500">{sub.studentEmail}</p>

                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">{formatSessionLabel(sub)}</span>
                          {sub.sessionDate ? (
                            <span className="ml-2 text-gray-400">· {formatDate(sub.sessionDate)}</span>
                          ) : null}
                        </p>

                        <p className="text-sm text-gray-500">
                          <span className="font-semibold text-gray-700">Reason: </span>
                          {sub.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <p className="text-xs text-gray-400">
                        Submitted {formatDate(sub.uploadedAt)}
                      </p>

                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        <ExternalLink size={13} />
                        {sub.fileName || 'View Document'}
                      </a>

                      {sub.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((prev) => (prev === sub.id ? null : sub.id))
                          }
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-[#E4002B] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#C70026]"
                        >
                          {isExpanded ? 'Cancel' : 'Review'}
                        </button>
                      ) : (
                        sub.reviewedAt ? (
                          <p className="text-xs text-gray-400">
                            Reviewed {formatDate(sub.reviewedAt)}
                          </p>
                        ) : null
                      )}
                    </div>
                  </div>

                  {sub.status !== 'PENDING' && sub.lecturerComment ? (
                    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Lecturer Comment
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{sub.lecturerComment}</p>
                    </div>
                  ) : null}

                  {isExpanded && sub.status === 'PENDING' ? (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Comment (optional)
                        </label>
                        <textarea
                          rows={3}
                          value={rev.comment}
                          onChange={(e) => setReviewComment(sub.id, e.target.value)}
                          placeholder="Add a comment for the student…"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={rev.submitting}
                          onClick={() => handleReview(sub.id, 'APPROVED')}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {rev.submitting ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={rev.submitting}
                          onClick={() => handleReview(sub.id, 'REJECTED')}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {rev.submitting ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <XCircle size={15} />
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
