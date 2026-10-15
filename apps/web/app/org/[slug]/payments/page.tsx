import {
  ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE,
  ORG_PAYS_WORKER_GROSS_COPY,
  formatMoneyMinor,
} from '@bridge-hive/domain';
import {
  ArrowUpRight,
  Banknote,
  BellRing,
  CalendarClock,
  ClipboardList,
  FileText,
  ShieldCheck,
  Sparkles,
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

type PaymentAlertData = {
  organization_id?: string;
  amount_minor?: number;
  currency?: string;
  due_at?: string;
  payout_id?: string;
};

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
  const [{ data: payouts }, { data: paymentNotifs }] = await Promise.all([
    supabase
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
      .order('due_at', { ascending: true }),
    supabase
      .from('notifications')
      .select('id, title, body, created_at, data, read_at')
      .eq('type', 'org_worker_payment_due')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const unpaidPaymentAlerts = (paymentNotifs ?? []).filter((n) => {
    const orgId = (n.data as PaymentAlertData | null)?.organization_id;
    return !orgId || orgId === ctx.org.id;
  });

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

  const alertTotalMinor = unpaidPaymentAlerts.reduce((sum, n) => {
    const amount = (n.data as PaymentAlertData | null)?.amount_minor;
    return sum + (typeof amount === 'number' ? amount : 0);
  }, 0);
  const alertCurrency =
    (unpaidPaymentAlerts[0]?.data as PaymentAlertData | null)?.currency ?? currency;

  return (
    <div className="space-y-7 bh-fade-up">
      <PageHeader
        eyebrow="Finance"
        title="Worker payments"
        subtitle="Track approved gross your organization owes workers. Bridge Hive commission is billed to workers separately."
      />

      {unpaidPaymentAlerts.length > 0 ? (
        <section
          className="bh-fade-up-delay-1 relative overflow-hidden rounded-[1.35rem] border border-bh-honey/35 bg-[linear-gradient(135deg,#fffdf6_0%,#fff8e8_48%,#f7fbfc_100%)] shadow-[0_14px_40px_rgba(201,146,15,0.12)]"
          role="status"
          aria-live="polite"
        >
          <div
            aria-hidden
            className="bh-gradient-sheen absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#e4b334,#16a6b6,#e4b334)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-bh-honey/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-bh-teal/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-bh-honey shadow-[0_10px_24px_rgba(7,29,48,0.22)]">
              <BellRing className="h-5 w-5" aria-hidden />
              <span
                aria-hidden
                className="bh-soft-pulse absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-bh-honey ring-2 ring-[#fff8e8]"
              />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-honey-strong">
                  Action needed
                </p>
                <span className="rounded-full border border-bh-honey/30 bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-bh-text">
                  {unpaidPaymentAlerts.length === 1
                    ? '1 new obligation'
                    : `${unpaidPaymentAlerts.length} new obligations`}
                </span>
              </div>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-[#071d30] sm:text-[1.35rem]">
                {unpaidPaymentAlerts.length === 1
                  ? 'New worker payment obligation'
                  : 'New worker payment obligations'}
              </h2>

              {alertTotalMinor > 0 ? (
                <p className="mt-2 bh-tabular text-2xl font-extrabold tracking-tight text-[#071d30]">
                  {formatMoneyMinor(alertTotalMinor, alertCurrency)}
                  <span className="ml-2 text-sm font-medium text-bh-text-secondary">
                    approved gross to settle
                  </span>
                </p>
              ) : null}

              <ul className="mt-3 space-y-2">
                {unpaidPaymentAlerts.map((n) => {
                  const data = n.data as PaymentAlertData | null;
                  const amount =
                    typeof data?.amount_minor === 'number'
                      ? formatMoneyMinor(data.amount_minor, data.currency ?? currency)
                      : null;
                  return (
                    <li
                      key={n.id}
                      className="flex flex-wrap items-start gap-2 rounded-xl border border-bh-honey/20 bg-white/65 px-3.5 py-2.5 text-sm leading-6 text-bh-text shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    >
                      {amount ? (
                        <span className="bh-tabular shrink-0 rounded-md bg-bh-sidebar px-2 py-0.5 text-xs font-semibold text-white">
                          {amount}
                        </span>
                      ) : null}
                      <span className="min-w-0 text-bh-text-secondary">{n.body}</span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-xs leading-5 text-bh-text-muted">
                Created when a timesheet is approved. Settle approved gross with the
                worker — Bridge Hive commission is billed to the worker separately.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bh-fade-up-delay-1 relative overflow-hidden rounded-[1.35rem] border border-bh-sidebar/20 bg-bh-sidebar text-bh-sidebar-text shadow-[0_18px_48px_rgba(7,29,48,0.22)]">
        <div
          className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-50"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 8% 0%, rgba(22,166,182,0.5), transparent 55%), radial-gradient(ellipse 55% 45% at 92% 100%, rgba(224,170,24,0.28), transparent 52%), linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
          }}
        />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.45fr_1fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-sidebar-muted">
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.1]">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Records
              </dt>
              <dd className="bh-tabular mt-2 text-2xl font-bold text-white">{rows.length}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.1]">
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
                'rounded-2xl border p-4 backdrop-blur-sm transition-colors sm:col-span-2',
                overdueRows.length > 0
                  ? 'border-bh-honey/40 bg-bh-honey/15 hover:bg-bh-honey/20'
                  : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.1]',
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

      <section className="bh-fade-up-delay-2 overflow-hidden rounded-[1.35rem] border border-bh-border bg-bh-surface shadow-[0_10px_36px_rgba(7,29,48,0.05)]">
        <div className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey" />
        <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
          <div className="border-b border-bh-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
              Payment model
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-bh-text">
              How settlement works
            </h2>
            <ol className="mt-5 space-y-4">
              {[
                {
                  step: '01',
                  icon: ShieldCheck,
                  title: 'Organization pays worker gross',
                  body: ORG_PAYS_WORKER_GROSS_COPY,
                },
                {
                  step: '02',
                  icon: Sparkles,
                  title: 'Commission stays with the worker',
                  body: 'Bridge Hive invoices the worker for platform commission. That amount is not an organization expense in this workflow.',
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-teal-soft text-bh-teal-strong ring-1 ring-bh-teal/15">
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                      {item.step}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-bh-text">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-bh-text-secondary">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="relative overflow-hidden bg-[linear-gradient(160deg,#f4f8fb_0%,#eef5fb_55%,#f7fbfc_100%)] p-5 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-bh-teal/10 blur-2xl"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-text-muted">
              Workspace note
            </p>
            <h3 className="mt-2 text-base font-semibold tracking-tight text-bh-text">
              Settlement details
            </h3>
            <p className="mt-2 text-sm leading-6 text-bh-text-secondary">
              {ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE}
            </p>
            <p className="mt-4 rounded-xl border border-bh-border/80 bg-bh-surface/80 px-3.5 py-3 text-xs leading-5 text-bh-text-muted shadow-sm backdrop-blur-sm">
              Use this page to track approved obligations and open the related shift
              for timesheet context while you settle outside Bridge Hive.
            </p>
          </aside>
        </div>
      </section>

      {!rows.length ? (
        <div className="bh-fade-up-delay-3">
          <EmptyState
            title="No worker payment records yet"
            description="Approved timesheets create gross payment obligations visible here."
          />
        </div>
      ) : (
        <section className="bh-fade-up-delay-3 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-bh-text">
                Payment obligations
              </h2>
              <p className="mt-1 text-sm text-bh-text-secondary">
                Sorted by due date. Open a shift to review the related timesheet and
                assignment.
              </p>
            </div>
            <p className="inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-surface px-3 py-1 text-xs font-medium text-bh-text-muted shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-bh-honey" aria-hidden />
              {awaitingRows.length} awaiting · {overdueRows.length} overdue
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.35rem] border border-bh-border bg-bh-surface shadow-[0_10px_36px_rgba(7,29,48,0.05)]">
            <div className="h-1 bg-gradient-to-r from-bh-teal via-bh-honey to-bh-teal" />
            <OrgTableShell className="rounded-none border-0 shadow-none">
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
                                Shift{' '}
                                {shiftObj ? formatDateTime(shiftObj.starts_at) : '—'}
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
                              className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-sm font-medium text-bh-text transition-all hover:-translate-y-0.5 hover:border-bh-teal hover:bg-bh-teal-soft hover:text-bh-teal-strong hover:shadow-sm motion-reduce:hover:translate-y-0"
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
        </section>
      )}
    </div>
  );
}
