'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';

type ExistingSubmission = { id: string; status: string } | null;

type AbsentSession = {
  attendanceRecordId: string;
  unitCode: string;
  unitName: string;
  sessionName: string;
  sessionDate: string | null;
  sessionDay: string | null;
  sessionWeek: number | null;
  existingSubmission: ExistingSubmission;
};

type Submission = {
  id: string;
  fileName: string;
  fileUrl: string;
  reason: string | null;
  status: string;
  lecturerComment: string | null;
  reviewedAt: string | null;
  uploadedAt: string;
  unitCode: string;
  unitName: string;
  sessionName: string;
  sessionDate: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return 'Date not set';
  return new Date(iso).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatSessionLabel(s: AbsentSession) {
  const date = s.sessionDate ? formatDate(s.sessionDate) : (s.sessionDay ?? 'Unknown date');
  const week = s.sessionWeek ? ` · Week ${s.sessionWeek}` : '';
  return `${s.unitCode} — ${s.sessionName}${week} · ${date}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'border-amber-100 bg-amber-50 text-amber-700',
    APPROVED: 'border-green-100 bg-green-50 text-green-700',
    REJECTED: 'border-red-100 bg-red-50 text-red-600',
  };
  const icon =
    status === 'APPROVED' ? (
      <CheckCircle2 size={12} />
    ) : status === 'REJECTED' ? (
      <XCircle size={12} />
    ) : (
      <Clock3 size={12} />
    );

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${map[status] ?? 'border-gray-100 bg-gray-50 text-gray-500'}`}
    >
      {icon}
      {status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : 'Pending'}
    </span>
  );
}

export default function StudentAbsencePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [absentSessions, setAbsentSessions] = useState<AbsentSession[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/student/absence', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load absence data.');
      const data = await res.json();
      setAbsentSessions(data.absentSessions ?? []);
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to load absence data right now.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!selectedRecordId) {
      setFormError('Please select a session.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please provide a reason for your absence.');
      return;
    }
    if (!file) {
      setFormError('Please upload a supporting document.');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('attendanceRecordId', selectedRecordId);
      fd.append('reason', reason.trim());
      fd.append('file', file);

      const res = await fetch('/api/student/absence', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        setFormError(json.error ?? 'Submission failed. Please try again.');
        return;
      }

      setSuccessMsg('Your absence document has been submitted and is pending review.');
      setSelectedRecordId('');
      setReason('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (err) {
      console.error(err);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => ({
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'PENDING').length,
    approved: submissions.filter((s) => s.status === 'APPROVED').length,
    rejected: submissions.filter((s) => s.status === 'REJECTED').length,
  }), [submissions]);

  const availableSessions = absentSessions.filter(
    (s) => !s.existingSubmission || s.existingSubmission.status === 'REJECTED'
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="cursor-default hover:text-gray-600">Student</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Absence Documents</span>
      </nav>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
            Absence Documents
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Submit supporting documents for sessions you were absent from. Your lecturer will review and approve or reject each request.
          </p>
        </div>
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </section>

      {error ? (
        <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </section>
      ) : null}

      {successMsg ? (
        <section className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>{successMsg}</p>
        </section>
      ) : null}

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Total Submitted</p>
            <FileText size={18} className="text-gray-300" />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900">{loading ? '—' : stats.total}</p>
          <p className="mt-2 text-xs text-gray-500">All absence requests</p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Pending</p>
            <Clock3 size={18} className="text-amber-400" />
          </div>
          <p className="text-4xl font-black tracking-tight text-amber-600">{loading ? '—' : stats.pending}</p>
          <p className="mt-2 text-xs text-gray-500">Awaiting lecturer review</p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Approved</p>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-green-600">{loading ? '—' : stats.approved}</p>
          <p className="mt-2 text-xs text-gray-500">Absence accepted</p>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Rejected</p>
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-4xl font-black tracking-tight text-red-600">{loading ? '—' : stats.rejected}</p>
          <p className="mt-2 text-xs text-gray-500">Document not accepted</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        {/* Submission Form */}
        <section className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black text-gray-900">Submit New Request</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select an absent session, describe your reason, and attach your document.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin text-[#E4002B]" />
              Loading sessions...
            </div>
          ) : availableSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
              <FileText size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No absent sessions to submit for</p>
              <p className="mt-1 text-xs text-gray-400">
                Only sessions marked Absent are eligible. Pending or already-submitted sessions will not appear here.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {formError}
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Absent Session <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#E4002B] focus:bg-white focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Select a session...</option>
                  {availableSessions.map((s) => (
                    <option key={s.attendanceRecordId} value={s.attendanceRecordId}>
                      {formatSessionLabel(s)}
                      {s.existingSubmission?.status === 'REJECTED' ? ' (re-submit)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Reason for Absence <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Briefly explain why you were absent (e.g. medical appointment, family emergency)..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#E4002B] focus:bg-white focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Supporting Document <span className="text-red-500">*</span>
                </label>
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center transition hover:border-[#E4002B]/40 hover:bg-rose-50/30"
                >
                  <Upload size={24} className="text-gray-300" />
                  {file ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Click to upload</p>
                      <p className="text-xs text-gray-400">PDF, JPG, PNG or WEBP · Max 10 MB</p>
                    </div>
                  )}
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C70026] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Submit Request
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Submissions History */}
        <section className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-50 px-6 py-5">
            <h2 className="text-lg font-black text-gray-900">My Submissions</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${submissions.length} submission${submissions.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin text-[#E4002B]" />
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-semibold text-gray-600">No submissions yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Use the form to submit your first absence request.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {submissions.map((s) => (
                <div key={s.id} className="px-6 py-5 transition hover:bg-gray-50/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                          {s.unitCode}
                        </span>
                        <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                          {s.sessionName}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-sm font-bold text-gray-900">{s.unitName}</p>
                      <p className="text-xs text-gray-500">Session date: {formatDate(s.sessionDate)}</p>
                      {s.reason ? (
                        <p className="max-w-xs text-xs text-gray-500 line-clamp-2">
                          <span className="font-semibold text-gray-700">Reason:</span> {s.reason}
                        </p>
                      ) : null}
                      {s.lecturerComment ? (
                        <p className="max-w-xs text-xs text-gray-600">
                          <span className="font-semibold">Lecturer note:</span> {s.lecturerComment}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      <p className="text-xs text-gray-400">
                        Submitted {formatDate(s.uploadedAt)}
                      </p>
                      {s.reviewedAt ? (
                        <p className="text-xs text-gray-400">
                          Reviewed {formatDate(s.reviewedAt)}
                        </p>
                      ) : null}
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
                      >
                        <FileText size={14} />
                        {s.fileName || 'View Document'}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
