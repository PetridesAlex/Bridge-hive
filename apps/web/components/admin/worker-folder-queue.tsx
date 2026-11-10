import { ArrowRight, FolderOpen, Mail, Phone, Search } from 'lucide-react';
import Link from 'next/link';

import { ApplicationStatusBadge } from '@/components/admin/status-badges';
import { applicationStatusLabel } from '@/lib/admin/labels';
import {
  workerFolderCopy,
  type WorkerFolderQueueCard,
  type WorkerFolderQueueParams,
} from '@/lib/admin/worker-folder-queue';
import { formatDateTime, roleLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  VERIFICATION_APPLICATION_STATUS_CODES,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  payoutSummaryLabel,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';

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
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium leading-5 text-bh-text">
        {value}
      </dd>
    </div>
  );
}

export function WorkerFolderQueue({
  basePath,
  title,
  subtitle,
  eyebrow = 'Verification',
  cards,
  total,
  totalPages,
  page,
  sort,
  queryString,
  params,
  showContact = true,
  ctaLabel,
}: {
  basePath: '/admin/credentials' | '/admin/applications';
  title: string;
  subtitle: string;
  eyebrow?: string;
  cards: WorkerFolderQueueCard[];
  total: number;
  totalPages: number;
  page: number;
  sort: string;
  queryString: string;
  params: WorkerFolderQueueParams;
  showContact?: boolean;
  ctaLabel?: string;
}) {
  const copy = workerFolderCopy('en');
  const actionLabel = ctaLabel ?? copy.openCta;
  const clearHref = basePath;

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
              {eyebrow}
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text sm:text-[2.15rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-bh-text-secondary">
              {subtitle}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-subtle/80 px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <span className="h-1.5 w-1.5 rounded-full bg-bh-teal shadow-[0_0_0_3px_rgba(22,166,182,0.2)]" />
            {total} worker{total === 1 ? '' : 's'}
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
            Refine worker folders
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
                placeholder="Name, email, worker ID, or reference"
                className={cn(FIELD, 'pl-10')}
                aria-label="Search workers"
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
              aria-label="Worker role"
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
              {copy.reviewStatus}
            </span>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className={FIELD}
              aria-label="Review status"
            >
              <option value="">All statuses</option>
              <option value="awaiting_documents">Incomplete — awaiting documents</option>
              <option value="partially_uploaded">Incomplete — partial</option>
              <option value="ready_for_review">Submitted — ready for review</option>
              <option value="under_review">{copy.pendingReview}</option>
              <option value="corrections_required">Needs correction</option>
              <option value="approved_marketplace">Approved</option>
              {VERIFICATION_APPLICATION_STATUS_CODES.filter(
                (code) =>
                  ![
                    'awaiting_documents',
                    'partially_uploaded',
                    'ready_for_review',
                    'under_review',
                    'corrections_required',
                    'approved_marketplace',
                  ].includes(code),
              ).map((code) => (
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
              aria-label="Payout status"
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
            <select
              name="sort"
              defaultValue={sort}
              className={FIELD}
              aria-label="Sort folders"
            >
              <option value="submitted_at">Newest submissions</option>
              <option value="oldest_waiting">Oldest pending review</option>
              <option value="last_activity">Last activity</option>
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
              href={clearHref}
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
          <FolderOpen
            className="relative mx-auto h-10 w-10 text-bh-text-muted"
            aria-hidden
          />
          <h3 className="relative mt-4 text-lg font-semibold tracking-tight text-bh-text">
            {copy.noWorkersMatch}
          </h3>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-bh-text-secondary">
            {copy.emptyHint}
          </p>
          <Link
            href={clearHref}
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
            const needsAttention = card.awaitingReviewCount > 0;
            const contactBits = [
              showContact && card.email ? card.email : null,
              showContact && card.phone ? card.phone : null,
            ].filter(Boolean) as string[];

            return (
              <article
                key={card.workerId}
                className="group/card relative overflow-hidden rounded-2xl border border-bh-border/70 bg-bh-surface/95 shadow-[0_6px_24px_rgba(7,29,48,0.04)] transition duration-500 ease-out hover:-translate-y-0.5 hover:border-bh-teal/35 hover:shadow-[0_18px_40px_rgba(7,29,48,0.09)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-75 bg-gradient-to-b from-bh-sidebar via-bh-teal to-bh-honey opacity-70 transition duration-500 group-hover/card:scale-y-100 group-hover/card:opacity-100"
                />
                <div className="flex flex-col gap-5 p-5 pl-6 sm:p-6 sm:pl-7 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bh-sidebar text-[12px] font-semibold tracking-[0.08em] text-white shadow-[0_6px_16px_rgba(7,29,48,0.18)] transition duration-500 group-hover/card:scale-[1.03] group-hover/card:shadow-[0_10px_22px_rgba(7,29,48,0.22)]"
                      aria-hidden
                    >
                      {workerMark(card.fullName ?? 'Worker')}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h3 className="break-words text-[1.05rem] font-semibold tracking-tight text-bh-text">
                          {card.fullName ?? 'Worker'}
                        </h3>
                        <ApplicationStatusBadge
                          status={card.applicationStatus}
                          className="!shadow-none"
                        />
                        {needsAttention ? (
                          <span className="text-[11px] font-semibold tracking-wide text-bh-honey-strong">
                            · {copy.needsAttention}
                          </span>
                        ) : null}
                      </div>

                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-bh-text-secondary">
                        <span className="font-medium text-bh-text">
                          {roleText}
                        </span>
                        <span className="text-bh-border-strong" aria-hidden>
                          ·
                        </span>
                        <span className="font-mono text-[11px] tracking-[0.1em] text-bh-text-muted">
                          {card.applicationRef}
                        </span>
                      </p>

                      {showContact ? (
                        contactBits.length > 0 ? (
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bh-text-muted">
                            {card.email ? (
                              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                                <Mail
                                  className="h-3 w-3 shrink-0 opacity-70"
                                  aria-hidden
                                />
                                <span className="truncate">{card.email}</span>
                              </span>
                            ) : null}
                            {card.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone
                                  className="h-3 w-3 shrink-0 opacity-70"
                                  aria-hidden
                                />
                                <span className="whitespace-nowrap">
                                  {card.phone}
                                </span>
                              </span>
                            ) : null}
                          </p>
                        ) : (
                          <p className="text-xs text-bh-text-muted">
                            No contact on file
                          </p>
                        )
                      ) : null}
                    </div>
                  </div>

                  <Link
                    href={`/admin/applications/${card.workerId}?from=${encodeURIComponent(basePath)}`}
                    className="group/cta inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-bh-sidebar px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.16)] transition duration-300 hover:bg-bh-sidebar-raised hover:shadow-[0_12px_24px_rgba(7,29,48,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal motion-reduce:transition-none sm:w-auto lg:self-center"
                  >
                    <span>{actionLabel}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition duration-300 group-hover/cta:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>

                <dl className="grid gap-4 border-t border-bh-border/60 bg-gradient-to-b from-bh-subtle/40 to-transparent px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
                  <QueueStat
                    label="Requirements"
                    value={`${card.submittedFileCount}/${card.requiredTotal} submitted`}
                  />
                  <QueueStat
                    label="Review"
                    value={`${card.awaitingReviewCount} awaiting · ${card.approvedCount} approved`}
                  />
                  <QueueStat
                    label="Payout"
                    value={payoutSummaryLabel(card.payoutStatus as never)}
                  />
                  <QueueStat
                    label="Activity"
                    value={
                      card.lastActivityAt
                        ? formatDateTime(card.lastActivityAt)
                        : card.submittedAt
                          ? formatDateTime(card.submittedAt)
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
            <span className="text-bh-text-muted"> · {total} workers</span>
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="inline-flex h-9 items-center rounded-full border border-bh-border bg-white px-3.5 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:bg-bh-subtle"
                href={`${basePath}?${queryString}${queryString ? '&' : ''}page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                className="inline-flex h-9 items-center rounded-full bg-bh-sidebar px-3.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
                href={`${basePath}?${queryString}${queryString ? '&' : ''}page=${page + 1}`}
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
