import { ArrowRight, Mail, Phone, Search } from 'lucide-react';
import Link from 'next/link';

import { ApplicationStatusBadge } from '@/components/admin/status-badges';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  applicationStatusLabel,
  serializeApplicationQueueCard,
} from '@/lib/admin/labels';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import {
  VERIFICATION_APPLICATION_STATUS_CODES,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  isWorkerRole,
  payoutSummaryLabel,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';

const PAGE_SIZE = 20;

const FIELD =
  'h-11 w-full rounded-xl border border-bh-border/90 bg-bh-subtle/50 px-3.5 text-sm font-medium text-bh-text outline-none transition focus:border-bh-teal focus:bg-white focus:ring-2 focus:ring-bh-teal/20';

function workerMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function QueueStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bh-surface px-4 py-3.5 sm:px-5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-5 text-bh-text">
        {value}
      </dd>
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
    p_role: params.role && isWorkerRole(params.role) ? params.role : undefined,
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

  return (
    <div className="space-y-6 bh-fade-up">
      <header className="relative overflow-hidden rounded-[1.35rem] border border-bh-border/90 bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
        <div
          aria-hidden
          className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_240px_at_0%_0%,rgba(22,166,182,0.08),transparent_55%),radial-gradient(560px_220px_at_100%_0%,rgba(224,170,24,0.08),transparent_50%)]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
              Verification
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text sm:text-[2.15rem]">
              Verification applications
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-bh-text-secondary">
              One application per worker. Review the full package from a single
              workspace.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-subtle/80 px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <span className="h-1.5 w-1.5 rounded-full bg-bh-teal shadow-[0_0_0_3px_rgba(22,166,182,0.2)]" />
            {total} in queue
          </span>
        </div>
      </header>

      <form className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-sidebar-raised to-bh-teal"
        />
        <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/70 to-bh-surface px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
            Filters
          </p>
          <p className="mt-1 text-sm font-semibold tracking-tight text-bh-text">
            Refine the verification queue
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm lg:col-span-2">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Search
            </span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
                aria-hidden
              />
              <input
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Name, email, phone, or reference"
                className={cn(FIELD, 'pl-10')}
              />
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Role
            </span>
            <select
              name="role"
              defaultValue={params.role ?? ''}
              className={FIELD}
            >
              <option value="">All roles</option>
              {WORKER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {WORKER_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Application status
            </span>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className={FIELD}
            >
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
            <select
              name="payout"
              defaultValue={params.payout ?? ''}
              className={FIELD}
            >
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
            <select name="sort" defaultValue={sort} className={FIELD}>
              <option value="last_activity">Last activity</option>
              <option value="submitted_at">Newest submission</option>
              <option value="oldest_waiting">Oldest waiting</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 lg:col-span-5">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-bh-sidebar px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
            >
              Apply filters
            </button>
            <Link
              href="/admin/applications"
              className="inline-flex h-11 items-center justify-center rounded-full border border-bh-border bg-white px-5 text-sm font-semibold text-bh-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle hover:text-bh-text"
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      {cards.length === 0 ? (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface px-6 py-14 text-center shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-bh-teal/10 blur-2xl"
          />
          <h3 className="relative text-lg font-semibold tracking-tight text-bh-text">
            No applications match
          </h3>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-bh-text-secondary">
            Try clearing filters or wait for workers to complete Account Setup.
          </p>
          <Link
            href="/admin/applications"
            className="relative mt-6 inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:bg-bh-subtle"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const roleText = card.workerRole
              ? roleLabel(card.workerRole as WorkerRole)
              : 'Role not set';

            return (
              <article
                key={card.workerId}
                className="group/card overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-bh-border-strong hover:shadow-[0_14px_36px_rgba(7,29,48,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-sm font-semibold tracking-wide text-white shadow-[0_4px_12px_rgba(7,29,48,0.22)] ring-1 ring-black/5"
                      aria-hidden
                    >
                      {workerMark(card.fullName ?? 'Worker')}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold tracking-tight text-bh-text sm:text-[1.05rem]">
                          {card.fullName ?? 'Worker'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <ApplicationStatusBadge
                            status={card.applicationStatus}
                          />
                          <span className="inline-flex rounded-full border border-bh-border/80 bg-bh-subtle/80 px-2.5 py-1 text-[11px] font-semibold text-bh-text-secondary">
                            {roleText}
                          </span>
                          <span className="inline-flex rounded-full border border-bh-border/80 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.08em] text-bh-text-muted">
                            Ref {card.applicationRef}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        {card.email ? (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-bh-border/80 bg-white px-2.5 py-1.5 text-xs font-medium text-bh-text shadow-sm">
                            <Mail
                              className="h-3.5 w-3.5 shrink-0 text-bh-teal-strong"
                              aria-hidden
                            />
                            <span className="break-all">{card.email}</span>
                          </span>
                        ) : null}
                        {card.phone ? (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-bh-border/80 bg-white px-2.5 py-1.5 text-xs font-medium text-bh-text shadow-sm">
                            <Phone
                              className="h-3.5 w-3.5 shrink-0 text-bh-honey-strong"
                              aria-hidden
                            />
                            <span className="whitespace-nowrap">
                              {card.phone}
                            </span>
                          </span>
                        ) : null}
                        {!card.email && !card.phone ? (
                          <span className="text-xs font-medium text-bh-text-muted">
                            No contact on file
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/applications/${card.workerId}`}
                    className="group relative inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 self-stretch overflow-hidden rounded-full bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,42,67,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(11,42,67,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto lg:self-center"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative">Review application</span>
                    <span
                      aria-hidden
                      className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-white/30"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </div>

                <dl className="grid gap-px border-t border-bh-border/80 bg-bh-border/80 sm:grid-cols-2 lg:grid-cols-3">
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
                  <QueueStat
                    label="Status"
                    value={card.applicationStatusLabel}
                  />
                  <QueueStat
                    label="Submitted"
                    value={
                      card.submittedAt ? formatDateTime(card.submittedAt) : '—'
                    }
                  />
                  <QueueStat
                    label="Last activity"
                    value={
                      card.lastActivityAt
                        ? formatDateTime(card.lastActivityAt)
                        : '—'
                    }
                  />
                </dl>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border/90 bg-bh-surface px-4 py-3.5 text-sm shadow-[0_6px_20px_rgba(7,29,48,0.04)] sm:px-5">
          <p className="font-medium text-bh-text-secondary">
            Page {page} of {totalPages}
            <span className="text-bh-text-muted"> · {total} applications</span>
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="inline-flex h-9 items-center rounded-full border border-bh-border bg-white px-3.5 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:bg-bh-subtle"
                href={`/admin/applications?${qs.toString()}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                className="inline-flex h-9 items-center rounded-full bg-bh-sidebar px-3.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
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
