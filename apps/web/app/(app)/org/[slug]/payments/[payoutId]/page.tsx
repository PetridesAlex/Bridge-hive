import { formatMoneyMinor } from '@bridge-hive/domain';
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Landmark,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { CopyTextButton } from '@/components/org/copy-text-button';
import { Breadcrumbs, PageHeader } from '@/components/org/page-header';
import { Badge } from '@/components/ui/badge';
import { requireOrgMembership } from '@/lib/auth';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

type TransferDetails = {
  payout_id: string;
  payout_status: string;
  organization_id: string;
  assignment_id: string;
  worker_id: string;
  worker_full_name: string;
  worker_role: string | null;
  shift_id: string | null;
  shift_title: string | null;
  currency: string;
  gross_amount_minor: number;
  organization_total_due_minor: number;
  due_at: string;
  account_holder_name: string | null;
  masked_iban: string;
  full_iban: string;
};

function formatIbanGrouped(iban: string): string {
  const compact = iban.replace(/\s+/g, '').toUpperCase();
  return compact.replace(/(.{4})/g, '$1 ').trim();
}

export default async function OrgPayoutTransferDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; payoutId: string }>;
}) {
  const { slug, payoutId } = await params;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canOperate) {
    return (
      <EmptyState
        title="Organization not active"
        description="Worker payment details unlock after activation."
      />
    );
  }

  if (!ctx.capabilities.canAccessBilling) {
    redirect(`/org/${slug}/dashboard`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_org_payout_transfer_details', {
    p_payout_id: payoutId,
  });

  if (error) {
    const code = (error.message ?? '').toUpperCase();
    if (code.includes('PAYOUT_NOT_FOUND') || code.includes('NOT_AUTHORIZED')) {
      notFound();
    }
    if (code.includes('PAYOUT_IBAN_UNAVAILABLE')) {
      return (
        <div className="space-y-6 bh-fade-up">
          <Breadcrumbs
            items={[
              { label: 'Worker payments', href: `/org/${slug}/payments` },
              { label: 'Payment details' },
            ]}
          />
          <EmptyState
            title="Bank details not available yet"
            description="This worker’s payout account was saved before secure IBAN vault storage. Ask the worker to re-submit their payout account in the Bridge Hive app, then reopen this page."
          />
          <Link
            href={`/org/${slug}/payments`}
            className="inline-flex items-center gap-2 text-sm font-medium text-bh-teal-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Worker payments
          </Link>
        </div>
      );
    }
    if (code.includes('PAYOUT_STATUS_INVALID')) {
      return (
        <div className="space-y-6 bh-fade-up">
          <Breadcrumbs
            items={[
              { label: 'Worker payments', href: `/org/${slug}/payments` },
              { label: 'Payment details' },
            ]}
          />
          <EmptyState
            title="Transfer details unavailable"
            description="Bank details are shown for approved gross obligations that still need organization payment."
          />
          <Link
            href={`/org/${slug}/payments`}
            className="inline-flex items-center gap-2 text-sm font-medium text-bh-teal-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Worker payments
          </Link>
        </div>
      );
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as TransferDetails | null;
  if (!row) {
    notFound();
  }

  const initials = (row.worker_full_name.trim()[0] ?? 'W').toUpperCase();
  const amount = row.organization_total_due_minor ?? row.gross_amount_minor;

  return (
    <div className="space-y-7 bh-fade-up">
      <Breadcrumbs
        items={[
          { label: 'Worker payments', href: `/org/${slug}/payments` },
          { label: row.worker_full_name },
        ]}
      />

      <PageHeader
        eyebrow="Finance"
        title="Worker payment profile"
        subtitle="Transfer the approved gross directly to this worker. Bridge Hive does not collect or move wages."
        actions={
          <Link
            href={`/org/${slug}/payments`}
            className="inline-flex items-center gap-2 rounded-xl border border-bh-border bg-bh-surface px-4 py-2 text-sm font-medium text-bh-text transition-colors hover:border-bh-teal hover:text-bh-teal-strong"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All obligations
          </Link>
        }
      />

      <section className="bh-fade-up-delay-1 overflow-hidden rounded-[1.35rem] border border-bh-border bg-bh-surface shadow-[0_12px_40px_rgba(7,29,48,0.06)]">
        <div className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey" />
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-lg font-semibold text-bh-sidebar-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              {initials}
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-text-muted">
                  Assigned professional
                </p>
                <Badge variant="warning">{row.payout_status.replace(/_/g, ' ')}</Badge>
              </div>
              <h2 className="truncate text-[1.75rem] font-bold tracking-tight text-bh-text">
                {row.worker_full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bh-text-secondary">
                {row.worker_role ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-bh-text">
                    <UserRound className="h-3.5 w-3.5 text-bh-text-muted" aria-hidden />
                    {roleLabel(row.worker_role)}
                  </span>
                ) : null}
                {row.shift_title ? (
                  <>
                    <span aria-hidden className="text-bh-border-strong">
                      ·
                    </span>
                    <span>{row.shift_title}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {row.shift_id ? (
            <Link
              href={`/org/${slug}/shifts/${row.shift_id}`}
              className="inline-flex items-center gap-2 self-start rounded-full border border-bh-border bg-bh-subtle px-4 py-2 text-sm font-medium text-bh-text transition-colors hover:bg-bh-surface hover:text-bh-teal-strong"
            >
              View shift
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="bh-fade-up-delay-2 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
            <Wallet className="h-3.5 w-3.5 text-bh-teal" aria-hidden />
            Approved gross
          </p>
          <p className="bh-tabular mt-2 text-2xl font-bold tracking-tight text-bh-text">
            {formatMoneyMinor(amount, row.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
            <CalendarClock className="h-3.5 w-3.5 text-bh-teal" aria-hidden />
            Due
          </p>
          <p className="mt-2 text-lg font-semibold text-bh-text">
            {formatDateTime(row.due_at)}
          </p>
        </div>
        <div className="rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-bh-teal" aria-hidden />
            Settlement model
          </p>
          <p className="mt-2 text-sm leading-6 text-bh-text-secondary">
            Your organization pays this amount directly. Bridge Hive commission is billed
            to the worker separately.
          </p>
        </div>
      </section>

      <section className="bh-fade-up-delay-3 relative overflow-hidden rounded-[1.35rem] border border-bh-sidebar/15 bg-bh-sidebar text-bh-sidebar-text shadow-[0_18px_48px_rgba(7,29,48,0.2)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 10% 0%, rgba(22,166,182,0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(224,170,24,0.2), transparent 50%)',
          }}
        />
        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-sidebar-muted">
                <Landmark className="h-3.5 w-3.5 text-bh-honey" aria-hidden />
                Bank transfer details
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Pay this worker directly
              </h3>
            </div>
            <CopyTextButton
              value={row.full_iban}
              label="Copy IBAN"
              className="border-white/20 bg-white/10 text-white hover:border-bh-honey/50 hover:bg-bh-honey/20 hover:text-white"
            />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                Account holder
              </dt>
              <dd className="mt-2 text-lg font-semibold text-white">
                {row.account_holder_name || '—'}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                Masked reference
              </dt>
              <dd className="mt-2 font-mono text-lg font-semibold tracking-wide text-white">
                {row.masked_iban}
              </dd>
            </div>
            <div className="rounded-2xl border border-bh-honey/30 bg-bh-honey/10 p-4 sm:col-span-2">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                <Banknote className="h-3.5 w-3.5 text-bh-honey" aria-hidden />
                Full IBAN
              </dt>
              <dd className="mt-2 break-all font-mono text-xl font-bold tracking-[0.08em] text-white sm:text-2xl">
                {formatIbanGrouped(row.full_iban)}
              </dd>
            </div>
          </dl>

          <p className="text-xs leading-5 text-bh-sidebar-muted">
            Viewing these details is audited. Do not share the IBAN outside your
            organization finance workflow.
          </p>
        </div>
      </section>
    </div>
  );
}
