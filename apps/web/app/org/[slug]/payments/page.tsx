import {
  ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE,
  ORG_PAYS_WORKER_GROSS_COPY,
  formatMoneyMinor,
} from '@bridge-hive/domain';
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ClipboardList,
  FileText,
  Info,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import {
  OrgTableHeadCell,
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
import { PageHeader } from '@/components/org/page-header';
import { Badge } from '@/components/ui/badge';
import { requireOrgMembership } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

const AWAITING_STATUSES = new Set([
  'approved',
  'payment_instruction_ready',
  'reconciliation_pending',
  'overdue',
]);

function payoutStatusVariant(
  status: string,
): 'warning' | 'success' | 'danger' | 'muted' | 'default' {
  if (status === 'overdue') return 'danger';
  if (status === 'paid' || status === 'reconciled' || status === 'settled') return 'success';
  if (
    status === 'approved' ||
    status === 'payment_instruction_ready' ||
    status === 'reconciliation_pending'
  ) {
    return 'warning';
  }
  if (status === 'cancelled' || status === 'void') return 'muted';
  return 'default';
}

function dueTone(dueAt: string | null, status: string, now: Date) {
  if (!dueAt) return null;
  if (status === 'overdue') return 'overdue' as const;
  const due = new Date(dueAt).getTime();
  const diffH = (due - now.getTime()) / (1000 * 60 * 60);
  if (diffH < 0 && AWAITING_STATUSES.has(status)) return 'overdue' as const;
  if (diffH <= 72 && AWAITING_STATUSES.has(status)) return 'soon' as const;
  return 'ok' as const;
}

export default async function WorkerPaymentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canOperate) {
    return (
      <EmptyState
        title="Organization not active"
        description="Worker payment visibility unlocks after activation."
      />
    );
  }

  if (!ctx.capabilities.canAccessBilling) {
    redirect(`/org/${slug}/dashboard`);
  }

  const supabase = await createClient();
  const now = new Date();
  const { data: payouts } = await supabase
    .from('payouts')
    .select(
      `
      id,
      status,
      gross_amount_minor,
      worker_transfer_amount_minor,
      organization_total_due_minor,
      currency,
      due_at,
      assignment:shift_assignments!inner(
        id,
        shift:shifts!inner(id, title, starts_at, organization_id)
      )
    `,
    )
    .eq('organization_id', ctx.org.id)
    .order('due_at', { ascending: true });

  const rows = (payouts ?? []).filter((p) => {
    const assignment = Array.isArray(p.assignment) ? p.assignment[0] : p.assignment;
    const shift = assignment
      ? Array.isArray(assignment.shift)
        ? assignment.shift[0]
        : assignment.shift
      : null;
    return shift && (shift as { organization_id: string }).organization_id === ctx.org.id;
  });

  const currency = rows[0]?.currency ?? 'EUR';

  const awaitingRows = rows.filter((p) => AWAITING_STATUSES.has(p.status));
  const awaitingGross = awaitingRows.reduce(
    (sum, p) => sum + (p.organization_total_due_minor ?? p.gross_amount_minor ?? 0),
    0,
  );

  const overdueRows = awaitingRows.filter((p) => {
    if (p.status === 'overdue') return true;
    if (!p.due_at) return false;
    return new Date(p.due_at).getTime() < now.getTime();
  });
  const overdueGross = overdueRows.reduce(
    (sum, p) => sum + (p.organization_total_due_minor ?? p.gross_amount_minor ?? 0),
    0,
  );

  const nextDue = awaitingRows
    .map((p) => p.due_at)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d))
    .filter((d) => d.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <div className="space-y-8 bh-fade-up">
      <PageHeader
        eyebrow="Finance"
        title="Worker payments"
        subtitle="Track approved gross your organization owes workers. Bridge Hive commission is billed to workers separately."
      />

      {/* Hero finance strip */}
      <section className="relative overflow-hidden rounded-2xl border border-bh-sidebar/20 bg-bh-sidebar text-bh-sidebar-text shadow-[0_12px_40px_rgba(7,29,48,0.18)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 10% 0%, rgba(22,166,182,0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(224,170,24,0.22), transparent 50%)',
          }}
        />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-sidebar-muted">
              <Wallet className="h-3.5 w-3.5 text-bh-teal" aria-hidden />
              Approved gross awaiting payment
            </p>
            <p className="bh-tabular mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {formatMoneyMinor(awaitingGross, currency)}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-bh-sidebar-text/80">
              {awaitingRows.length === 0
                ? 'No approved gross is currently outstanding for this organization.'
                : `${awaitingRows.length} obligation${awaitingRows.length === 1 ? '' : 's'} still need organization payment or reconciliation.`}
            </p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Records
              </dt>
              <dd className="bh-tabular mt-2 text-2xl font-bold text-white">{rows.length}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Next due
              </dt>
              <dd className="mt-2 text-lg font-semibold text-white">
                {nextDue
                  ? formatDateTime(nextDue.toISOString())
                  : overdueRows.length > 0
                    ? 'Past due'
                    : '—'}
              </dd>
            </div>
            <div
              className={cn(
                'rounded-xl border p-4 backdrop-blur-sm transition-colors sm:col-span-2',
                overdueRows.length > 0
                  ? 'border-bh-honey/40 bg-bh-honey/15 hover:bg-bh-honey/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10',
              )}
            >
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                <Banknote className="h-3.5 w-3.5" aria-hidden />
                Overdue gross
              </dt>
              <dd className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="bh-tabular text-2xl font-bold text-white">
                  {formatMoneyMinor(overdueGross, currency)}
                </span>
                <span className="text-sm text-bh-sidebar-muted">
                  {overdueRows.length} record{overdueRows.length === 1 ? '' : 's'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Model clarity */}
      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: 'Org pays worker gross',
            body: ORG_PAYS_WORKER_GROSS_COPY,
          },
          {
            icon: Banknote,
            title: 'Commission is separate',
            body: 'Bridge Hive invoices the worker for platform commission. That amount is not an organization expense in this workflow.',
          },
          {
            icon: Info,
            title: 'Workspace limitation',
            body: ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE,
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_1px_2px_rgba(7,29,48,0.04)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-bh-teal/30 hover:shadow-[0_8px_24px_rgba(7,29,48,0.06)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bh-teal-soft text-bh-teal-strong">
              <card.icon className="h-4 w-4" aria-hidden />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-bh-text">{card.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-bh-text-secondary">{card.body}</p>
          </div>
        ))}
      </section>

      {!rows.length ? (
        <EmptyState
          title="No worker payment records yet"
          description="Approved timesheets create gross payment obligations visible here."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-bh-text">
                Payment obligations
              </h2>
              <p className="mt-1 text-sm text-bh-text-secondary">
                Sorted by due date. Open a shift to review the related timesheet and assignment.
              </p>
            </div>
            <p className="text-xs font-medium text-bh-text-muted">
              {awaitingRows.length} awaiting · {overdueRows.length} overdue
            </p>
          </div>

          <OrgTableShell>
            <table className="w-full text-left text-sm">
              <thead className={orgTableHeadClassName}>
                <tr>
                  <OrgTableHeadCell icon={ClipboardList} label="Shift" />
                  <OrgTableHeadCell icon={CalendarClock} label="Due" />
                  <OrgTableHeadCell icon={Banknote} label="Gross due" />
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payout) => {
                  const assignment = Array.isArray(payout.assignment)
                    ? payout.assignment[0]
                    : payout.assignment;
                  const shift = assignment
                    ? Array.isArray(assignment.shift)
                      ? assignment.shift[0]
                      : assignment.shift
                    : null;
                  const shiftObj = shift as {
                    id: string;
                    title: string | null;
                    starts_at: string;
                  } | null;
                  const initial = (
                    (shiftObj?.title || 'P').trim()[0] ?? 'P'
                  ).toUpperCase();
                  const tone = dueTone(payout.due_at, payout.status, now);
                  const amount =
                    payout.organization_total_due_minor ?? payout.gross_amount_minor;

                  return (
                    <tr key={payout.id} className={orgTableRowClassName}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bh-teal-soft text-sm font-semibold text-bh-teal-strong ring-1 ring-bh-teal/15"
                            aria-hidden
                          >
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-bh-text">
                              {shiftObj?.title || 'Shift'}
                            </p>
                            <p className="mt-0.5 text-xs text-bh-text-muted">
                              Shift {shiftObj ? formatDateTime(shiftObj.starts_at) : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {payout.due_at ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                              tone === 'overdue' && 'bg-bh-danger-soft text-bh-danger',
                              tone === 'soon' && 'bg-bh-honey-soft text-bh-warning',
                              tone === 'ok' && 'bg-bh-subtle text-bh-text-secondary',
                            )}
                          >
                            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                            {formatDateTime(payout.due_at)}
                            {tone === 'overdue' ? ' · Overdue' : null}
                            {tone === 'soon' ? ' · Due soon' : null}
                          </span>
                        ) : (
                          <span className="text-bh-text-muted">—</span>
                        )}
                      </td>
                      <td className="bh-tabular px-4 py-4 text-base font-semibold text-bh-text">
                        {formatMoneyMinor(amount, payout.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={payoutStatusVariant(payout.status)}>
                          {payout.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {shiftObj ? (
                          <Link
                            href={`/org/${slug}/shifts/${shiftObj.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-sm font-medium text-bh-text transition-colors hover:border-bh-teal hover:bg-bh-teal-soft hover:text-bh-teal-strong group-hover:border-bh-teal/40"
                          >
                            View shift
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </OrgTableShell>
        </div>
      )}
    </div>
  );
}
