import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { applicationStatusLabel, serializeApplicationQueueCard } from '@/lib/admin/labels';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { payoutSummaryLabel } from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';

export default async function AdminPayoutReviewsPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewWorkers) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view payout review queues."
      />
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_verification_applications', {
    p_payout_status: 'pending',
    p_sort: 'oldest_waiting',
    p_limit: 50,
    p_offset: 0,
  });

  if (error) {
    return (
      <EmptyState
        title="Unable to load payout reviews"
        description="Refresh and try again."
      />
    );
  }

  const rows = (data ?? []) as Array<Parameters<typeof serializeApplicationQueueCard>[0] & { total_count: number }>;
  const cards = rows.map(serializeApplicationQueueCard);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Payout reviews</h2>
        <p className="mt-1 text-sm text-slate-600">
          Payout approval is separate from professional credential review.
          {ctx.capabilities.canApprovePayoutAccounts
            ? ' Open an application to review proof and approve or reject.'
            : ' Verifiers see status only; banking details require super admin.'}
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="No payout accounts awaiting approval"
          description="Workers appear here after submitting a payout account."
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
                  <h3 className="font-semibold text-slate-900">
                    {card.fullName ?? 'Worker'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {card.workerRole
                      ? roleLabel(card.workerRole as WorkerRole)
                      : 'Role not set'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {payoutSummaryLabel(card.payoutStatus as never)} ·{' '}
                    {applicationStatusLabel(card.applicationStatus)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted{' '}
                    {card.submittedAt ? formatDateTime(card.submittedAt) : '—'}
                  </p>
                </div>
                <Link
                  href={`/admin/applications/${card.workerId}`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Open application
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
