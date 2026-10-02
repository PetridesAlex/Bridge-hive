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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Verification applications
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          One application per worker. Review the full package from a single workspace.
        </p>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm lg:col-span-2">
          <span className="mb-1 block text-slate-600">Search</span>
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Name, email, phone, or reference"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Role</span>
          <select
            name="role"
            defaultValue={params.role ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All roles</option>
            <option value="registered_nurse">Registered nurse</option>
            <option value="ward_assistant">Ward assistant</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Application status</span>
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
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
          <span className="mb-1 block text-slate-600">Payout status</span>
          <select
            name="payout"
            defaultValue={params.payout ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
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
          <span className="mb-1 block text-slate-600">Sort</span>
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="last_activity">Last activity</option>
            <option value="submitted_at">Newest submission</option>
            <option value="oldest_waiting">Oldest waiting</option>
          </select>
        </label>
        <div className="flex items-end lg:col-span-5">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
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
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.fullName ?? 'Worker'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {card.workerRole
                      ? roleLabel(card.workerRole as WorkerRole)
                      : 'Role not set'}
                    {' · '}
                    Ref {card.applicationRef}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {[card.email, card.phone].filter(Boolean).join(' · ') ||
                      'No contact on file'}
                  </p>
                </div>
                <Link
                  href={`/admin/applications/${card.workerId}`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Review application
                </Link>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Documents</dt>
                  <dd className="font-medium text-slate-900">
                    {card.submittedFileCount} of {card.requiredTotal} required
                    submitted
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Review progress</dt>
                  <dd className="font-medium text-slate-900">
                    {card.awaitingReviewCount} awaiting · {card.approvedCount}{' '}
                    approved · {card.rejectedCount} rejected
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Payout account</dt>
                  <dd className="font-medium text-slate-900">
                    {payoutSummaryLabel(card.payoutStatus as never)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium text-slate-900">
                    {card.applicationStatusLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Submitted</dt>
                  <dd>{card.submittedAt ? formatDateTime(card.submittedAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last activity</dt>
                  <dd>
                    {card.lastActivityAt
                      ? formatDateTime(card.lastActivityAt)
                      : '—'}
                  </dd>
                </div>
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
