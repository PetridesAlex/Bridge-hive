import { ArrowRight, FolderOpen, Mail, Phone, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
  'h-11 w-full appearance-none rounded-xl border border-bh-border/80 bg-white px-3.5 text-sm font-medium text-bh-text shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition duration-300 hover:border-bh-border-strong focus:border-bh-teal focus:bg-white focus:ring-2 focus:ring-bh-teal/20';

const LABEL =
  'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted';

function workerMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function PremiumButton({
  children,
  className,
  type = 'button',
}: {
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className={cn(
        'group/btn relative inline-flex h-11 items-center justify-center overflow-hidden rounded-full bg-bh-sidebar px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(7,29,48,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-bh-sidebar-raised hover:shadow-[0_14px_28px_rgba(7,29,48,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bh-btn-flow bg-[linear-gradient(110deg,transparent_20%,rgba(22,166,182,0.28)_45%,rgba(224,170,24,0.22)_55%,transparent_75%)] opacity-80"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent bh-btn-shine"
      />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
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
  const filtersActive = Boolean(
    params.q || params.role || params.status || params.payout || sort !== 'submitted_at',
  );

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

      <form className="group/filters overflow-hidden rounded-[1.25rem] border border-bh-border/80 bg-bh-surface/95 shadow-[0_10px_32px_rgba(7,29,48,0.05)] transition duration-500 hover:border-bh-teal/30 hover:shadow-[0_16px_40px_rgba(7,29,48,0.08)] motion-reduce:transition-none">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bh-border/70 bg-gradient-to-b from-bh-subtle/60 to-transparent px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-bh-border/80 bg-white text-bh-sidebar shadow-sm">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                Filters
              </p>
              <p className="text-sm font-semibold tracking-tight text-bh-text">
                Refine the queue
              </p>
            </div>
          </div>
          {filtersActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-teal/25 bg-bh-teal-soft/50 px-2.5 py-1 text-[11px] font-semibold text-bh-teal-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-bh-teal" />
              Filters active
            </span>
          ) : (
            <span className="text-[11px] font-medium text-bh-text-muted">
              Showing all folders
            </span>
          )}
        </div>

        <div className="grid gap-3.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-12 lg:gap-3">
          <label className="sm:col-span-2 lg:col-span-4">
            <span className={LABEL}>Search</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted transition group-focus-within/filters:text-bh-teal"
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
          <label className="lg:col-span-2">
            <span className={LABEL}>Role</span>
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
          <label className="lg:col-span-2">
            <span className={LABEL}>{copy.reviewStatus}</span>
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
          <label className="lg:col-span-2">
            <span className={LABEL}>Payout</span>
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
          <label className="lg:col-span-2">
            <span className={LABEL}>Sort</span>
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

          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-12">
            <PremiumButton type="submit">
              Apply filters
              <ArrowRight className="h-3.5 w-3.5 transition duration-300 group-hover/btn:translate-x-0.5" />
            </PremiumButton>
            <Link
              href={clearHref}
              className="inline-flex h-11 items-center justify-center rounded-full border border-bh-border/80 bg-white px-5 text-sm font-semibold text-bh-text-secondary shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle hover:text-bh-text motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
        <section className="overflow-hidden rounded-[1.25rem] border border-bh-border/80 bg-bh-surface shadow-[0_10px_32px_rgba(7,29,48,0.05)]">
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-teal via-bh-sidebar to-bh-honey"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bh-border/70 bg-gradient-to-b from-bh-subtle/70 to-bh-surface px-5 py-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-honey-strong">
                Worker folders
              </p>
              <p className="mt-0.5 text-sm text-bh-text-secondary">
                Open a row to review credentials and payout readiness
              </p>
            </div>
            <span className="text-[11px] font-semibold text-bh-text-muted">
              {total} result{total === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-bh-border/80 bg-bh-subtle/55 text-[10px] uppercase tracking-[0.14em] text-bh-text-muted">
                  <th className="px-5 py-3 font-semibold">Worker</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Requirements</th>
                  <th className="px-3 py-3 font-semibold">Review</th>
                  <th className="px-3 py-3 font-semibold">Payout</th>
                  <th className="px-3 py-3 font-semibold">Activity</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card, index) => {
                  const roleText = card.workerRole
                    ? roleLabel(card.workerRole as WorkerRole)
                    : 'Role not set';
                  const needsAttention = card.awaitingReviewCount > 0;
                  const activity =
                    card.lastActivityAt
                      ? formatDateTime(card.lastActivityAt)
                      : card.submittedAt
                        ? formatDateTime(card.submittedAt)
                        : '—';
                  const folderHref = `/admin/applications/${card.workerId}?from=${encodeURIComponent(basePath)}`;

                  return (
                    <tr
                      key={card.workerId}
                      className={cn(
                        'group/row border-b border-bh-border/60 transition duration-300 last:border-0 hover:bg-bh-teal-soft/20 motion-reduce:transition-none',
                        needsAttention && 'bg-bh-honey-soft/20',
                        index === 0 && 'border-t-0',
                      )}
                    >
                      <td className="px-5 py-4 align-middle">
                        <Link
                          href={folderHref}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bh-sidebar text-[11px] font-semibold tracking-[0.08em] text-white shadow-[0_6px_14px_rgba(7,29,48,0.18)] transition duration-300 group-hover/row:scale-[1.04] group-hover/row:shadow-[0_10px_20px_rgba(7,29,48,0.24)]"
                          >
                            {workerMark(card.fullName ?? 'Worker')}
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-[15px] font-semibold tracking-tight text-bh-text transition-colors group-hover/row:text-bh-teal-strong">
                                {card.fullName ?? 'Worker'}
                              </span>
                              <ApplicationStatusBadge
                                status={card.applicationStatus}
                                className="!shadow-none"
                              />
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-bh-text-muted">
                              <span className="font-mono tracking-[0.08em]">
                                {card.applicationRef}
                              </span>
                              {showContact && card.email ? (
                                <>
                                  <span aria-hidden>·</span>
                                  <span className="inline-flex min-w-0 items-center gap-1">
                                    <Mail className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                    <span className="truncate">{card.email}</span>
                                  </span>
                                </>
                              ) : null}
                              {showContact && card.phone ? (
                                <>
                                  <span aria-hidden>·</span>
                                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                    <Phone className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                    {card.phone}
                                  </span>
                                </>
                              ) : null}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-4 align-middle">
                        <span className="text-sm font-medium text-bh-text">
                          {roleText}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-middle">
                        <span className="tabular-nums text-sm font-semibold text-bh-text">
                          {card.submittedFileCount}/{card.requiredTotal}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-bh-text-muted">
                          submitted
                        </span>
                      </td>
                      <td className="px-3 py-4 align-middle">
                        <span className="text-sm font-semibold text-bh-text">
                          {card.awaitingReviewCount} awaiting
                        </span>
                        <span className="mt-0.5 block text-[11px] text-bh-text-muted">
                          {card.approvedCount} approved
                          {needsAttention ? ` · ${copy.needsAttention}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-middle">
                        <span className="text-sm font-medium text-bh-text">
                          {payoutSummaryLabel(card.payoutStatus as never)}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-middle">
                        <span className="whitespace-nowrap text-sm text-bh-text-secondary">
                          {activity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <Link
                          href={folderHref}
                          className="group/cta relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-bh-sidebar px-3.5 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(7,29,48,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-bh-sidebar-raised hover:shadow-[0_12px_22px_rgba(7,29,48,0.24)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bh-btn-flow bg-[linear-gradient(110deg,transparent_20%,rgba(22,166,182,0.28)_45%,rgba(224,170,24,0.2)_55%,transparent_75%)] opacity-70"
                          />
                          <span className="relative z-10">{actionLabel}</span>
                          <ArrowRight
                            className="relative z-10 h-3.5 w-3.5 transition duration-300 group-hover/cta:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
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
                className="group/btn relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-bh-sidebar px-3.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-bh-sidebar-raised motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                href={`${basePath}?${queryString}${queryString ? '&' : ''}page=${page + 1}`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bh-btn-flow bg-[linear-gradient(110deg,transparent_20%,rgba(22,166,182,0.28)_45%,rgba(224,170,24,0.2)_55%,transparent_75%)] opacity-70"
                />
                <span className="relative z-10">Next</span>
                <ArrowRight className="relative z-10 h-3.5 w-3.5 transition group-hover/btn:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
