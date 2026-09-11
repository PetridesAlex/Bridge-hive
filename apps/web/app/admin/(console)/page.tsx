import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { auditActionLabel } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function AdminDashboardPage() {
  const ctx = await requirePlatformAdmin();
  const supabase = await createClient();

  const [{ data: countsRaw }, { data: recentAudits }] = await Promise.all([
    ctx.capabilities.canViewWorkers
      ? supabase.rpc('verification_application_dashboard_counts')
      : Promise.resolve({ data: null }),
    supabase
      .from('audit_events')
      .select('id, action, entity_type, entity_id, created_at, actor_user_id')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const countsRow = Array.isArray(countsRaw) ? countsRaw[0] : countsRaw;
  const counts = {
    awaiting_documents: Number(
      (countsRow as { awaiting_documents?: number } | null)?.awaiting_documents ??
        0,
    ),
    ready_for_review: Number(
      (countsRow as { ready_for_review?: number } | null)?.ready_for_review ?? 0,
    ),
    under_review: Number(
      (countsRow as { under_review?: number } | null)?.under_review ?? 0,
    ),
    corrections_required: Number(
      (countsRow as { corrections_required?: number } | null)
        ?.corrections_required ?? 0,
    ),
    payout_approval_pending: Number(
      (countsRow as { payout_approval_pending?: number } | null)
        ?.payout_approval_pending ?? 0,
    ),
    ready_for_final_approval: Number(
      (countsRow as { ready_for_final_approval?: number } | null)
        ?.ready_for_final_approval ?? 0,
    ),
    suspended: Number(
      (countsRow as { suspended?: number } | null)?.suspended ?? 0,
    ),
  };

  const cards = [
    {
      title: 'New accounts awaiting documents',
      value: counts.awaiting_documents,
      href: '/admin/applications?status=awaiting_documents',
    },
    {
      title: 'Applications ready for review',
      value: counts.ready_for_review,
      href: '/admin/applications?status=ready_for_review',
    },
    {
      title: 'Applications currently under review',
      value: counts.under_review,
      href: '/admin/applications?status=under_review',
    },
    {
      title: 'Applications requiring corrections',
      value: counts.corrections_required,
      href: '/admin/applications?status=corrections_required',
    },
    {
      title: 'Payout accounts awaiting approval',
      value: counts.payout_approval_pending,
      href: '/admin/payouts',
    },
    {
      title: 'Workers ready for final approval',
      value: counts.ready_for_final_approval,
      href: '/admin/applications?status=ready_for_final_approval',
    },
    {
      title: 'Suspended workers',
      value: counts.suspended,
      href: '/admin/applications?status=suspended',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Admin dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {ctx.profile?.full_name ?? ctx.user.email}. Role:{' '}
          {ctx.adminRole.replaceAll('_', ' ')}.
        </p>
      </div>

      {!ctx.capabilities.canViewWorkers ? (
        <EmptyState
          title="Limited dashboard"
          description="Your role cannot view verification application queues."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.href + card.title}>
              <CardHeader>
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="text-3xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={card.href}
                  className="text-sm font-medium text-amber-700 hover:underline"
                >
                  Open filtered queue
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-900">Recent audit activity</h3>
          <Link href="/admin/audit" className="text-sm text-slate-600 hover:underline">
            View all
          </Link>
        </div>
        {!(recentAudits ?? []).length ? (
          <EmptyState
            title="No audit events yet"
            description="Sensitive admin actions will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {(recentAudits ?? []).map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {auditActionLabel(event.action)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.entity_type}
                    {event.entity_id ? ` · ${event.entity_id.slice(0, 8)}…` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDateTime(event.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
