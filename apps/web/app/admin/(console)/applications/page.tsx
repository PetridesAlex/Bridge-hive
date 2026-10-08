import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  applicationStatusLabel,
  serializeApplicationQueueCard,
} from '@/lib/admin/labels';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  VERIFICATION_APPLICATION_STATUS_CODES,
  payoutSummaryLabel,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';

const PAGE_SIZE = 20;

function workerMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function QueueStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bh-surface px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-bh-text">{value}</dd>
    </div>
  );
}

export default async function VerificationApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    payout?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewWorkers) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view verification applications."
      />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const sort =
    params.sort === 'submitted_at' || params.sort === 'oldest_waiting'
      ? params.sort
      : 'last_activity';

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_verification_applications', {
    p_search: params.q?.trim() || undefined,
    p_role:
      params.role === 'registered_nurse' || params.role === 'ward_assistant'
        ? params.role
        : undefined,
    p_application_status: params.status?.trim() || undefined,
    p_payout_status:
      params.payout === 'pending' ||
      params.payout === 'verified' ||
      params.payout === 'rejected' ||
      params.payout === 'failed' ||
      params.payout === 'suspended'
        ? params.payout
        : undefined,
    p_sort: sort,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    return (
      <EmptyState
        title="Unable to load applications"
        description="Refresh the page or try again shortly."
      />
    );
  }

  const rows = (data ?? []) as Array<{
    worker_id: string;
    application_ref: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    worker_role: string | null;
    application_status: string;
    required_total: number;
    awaiting_review_count: number;
    approved_count: number;
    rejected_count: number;
    submitted_file_count: number;
    payout_status: string | null;
    submitted_at: string | null;
    last_activity_at: string | null;
    total_count: number;
  }>;

  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const cards = rows.map(serializeApplicationQueueCard);

  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.role) qs.set('role', params.role);
  if (params.status) qs.set('status', params.status);
  if (params.payout) qs.set('payout', params.payout);
  if (params.sort) qs.set('sort', params.sort);

  const fieldClass =
    'h-11 w-full rounded-xl border border-bh-border bg-white px-3 text-sm text-bh-text outline-none focus-visible:border-bh-sidebar focus-visible:ring-2 focus-visible:ring-bh-honey/40';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
          Verification
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-bh-text">
          Verification applications
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-bh-text-secondary">
          One application per worker. Review the full package from a single workspace.
        </p>
      </div>

      <form className="grid gap-4 rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_8px_28px_rgba(7,29,48,0.05)] sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm lg:col-span-2">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Search
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Name, email, phone, or reference"
            className={fieldClass}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Role
          </span>
          <select name="role" defaultValue={params.role ?? ''} className={fieldClass}>
            <option value="">All roles</option>
            <option value="registered_nurse">Registered nurse</option>
            <option value="ward_assistant">Ward assistant</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Application status
          </span>
          <select name="status" defaultValue={params.status ?? ''} className={fieldClass}>
            <option value="">All statuses</option>
            {VERIFICATION_APPLICATION_STATUS_CODES.map((code) => (
              <option key={code} value={code}>
                {applicationStatusLabel(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Payout status
          </span>
          <select name="payout" defaultValue={params.payout ?? ''} className={fieldClass}>
            <option value="">All payouts</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
            Sort
          </span>
          <select name="sort" defaultValue={sort} className={fieldClass}>
            <option value="last_activity">Last activity</option>
            <option value="submitted_at">Newest submission</option>
            <option value="oldest_waiting">Oldest waiting</option>
          </select>
        </label>
        <div className="flex items-end lg:col-span-5">
          <button
            type="submit"
            className="h-11 rounded-full bg-bh-sidebar px-5 text-sm font-medium text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)]"
          >
            Apply filters
          </button>
        </div>
      </form>

      {cards.length === 0 ? (
        <EmptyState
          title="No applications match"
          description="Try clearing filters or wait for workers to complete Account Setup."
        />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <article
              key={card.workerId}
              className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]"
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-sm font-semibold tracking-wide text-white"
                    aria-hidden
                  >
                    {workerMark(card.fullName ?? 'Worker')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold tracking-tight text-bh-text">
                        {card.fullName ?? 'Worker'}
                      </h3>
                      <span className="rounded-full bg-bh-honey-soft px-2.5 py-1 text-[11px] font-semibold text-bh-text">
                        {card.applicationStatusLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-bh-text-secondary">
                      {card.workerRole
                        ? roleLabel(card.workerRole as WorkerRole)
                        : 'Role not set'}
                      {' · '}
                      Ref {card.applicationRef}
                    </p>
                    <p className="mt-1 truncate text-xs text-bh-text-muted">
                      {[card.email, card.phone].filter(Boolean).join(' · ') ||
                        'No contact on file'}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/applications/${card.workerId}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-bh-sidebar px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)]"
                >
                  Review application
                </Link>
              </div>
              <dl className="grid gap-px border-t border-bh-border bg-bh-border sm:grid-cols-2 lg:grid-cols-3">
                <QueueStat
                  label="Documents"
                  value={`${card.submittedFileCount} of ${card.requiredTotal} required submitted`}
                />
                <QueueStat
                  label="Review progress"
                  value={`${card.awaitingReviewCount} awaiting · ${card.approvedCount} approved · ${card.rejectedCount} rejected`}
                />
                <QueueStat
                  label="Payout account"
                  value={payoutSummaryLabel(card.payoutStatus as never)}
                />
                <QueueStat label="Status" value={card.applicationStatusLabel} />
                <QueueStat
                  label="Submitted"
                  value={card.submittedAt ? formatDateTime(card.submittedAt) : '—'}
                />
                <QueueStat
                  label="Last activity"
                  value={
                    card.lastActivityAt ? formatDateTime(card.lastActivityAt) : '—'
                  }
                />
              </dl>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages} · {total} applications
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="rounded-md border border-slate-300 px-3 py-1.5"
                href={`/admin/applications?${qs.toString()}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                className="rounded-md border border-slate-300 px-3 py-1.5"
                href={`/admin/applications?${qs.toString()}&page=${page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
