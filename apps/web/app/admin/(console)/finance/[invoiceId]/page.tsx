import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatMoneyMinor,
  WORKER_COMMISSION_EXPLAINER,
  workerInvoiceStatusLabel,
} from '@bridge-hive/domain';

import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { WorkerRole } from '@bridge-hive/domain';

export default async function AdminFinanceInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const ctx = await requirePlatformAdmin();
  const { invoiceId } = await params;

  if (!ctx.capabilities.canViewFinance) {
    return (
      <EmptyState
        title="Permission denied"
        description="Finance tools are limited to platform finance and super admin roles."
      />
    );
  }

  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc('list_finance_invoices', {
    p_status: undefined,
    p_worker_role: undefined,
    p_organization_id: undefined,
    p_due_before: undefined,
    p_due_after: undefined,
    p_search: undefined,
    p_limit: 100,
    p_offset: 0,
  });

  if (error) {
    return (
      <EmptyState
        title="Unable to load invoice"
        description="Refresh and try again."
      />
    );
  }

  const invoice = ((rows ?? []) as Array<{
    id: string;
    invoice_number: string;
    worker_id: string;
    worker_name: string | null;
    worker_role: WorkerRole | null;
    organization_id: string;
    organization_name: string | null;
    shift_starts_at: string | null;
    gross_amount_minor: number;
    commission_amount_minor: number;
    commission_rate_bps: number;
    currency: string;
    issued_at: string;
    due_at: string;
    paid_at: string | null;
    status: string;
    provider_name: string | null;
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
  }>).find((row) => row.id === invoiceId);

  if (!invoice) {
    // Fall back to direct select for pagination misses
    const { data: direct } = await supabase
      .from('worker_commission_invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!direct) notFound();
  }

  const detail = invoice
    ?? (await supabase
        .from('worker_commission_invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle()).data;

  if (!detail) notFound();

  const { data: full } = await supabase
    .from('worker_commission_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!full) notFound();

  const [{ data: profile }, { data: workerProfile }, { data: org }, { data: assignment }] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', full.worker_id).maybeSingle(),
      supabase
        .from('worker_profiles')
        .select('worker_role')
        .eq('user_id', full.worker_id)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('display_name, legal_name')
        .eq('id', full.organization_id)
        .maybeSingle(),
      supabase
        .from('shift_assignments')
        .select('shift_id')
        .eq('id', full.assignment_id)
        .maybeSingle(),
    ]);

  const { data: shift } = assignment?.shift_id
    ? await supabase
        .from('shifts')
        .select('title, starts_at')
        .eq('id', assignment.shift_id)
        .maybeSingle()
    : { data: null };

  const { data: events } = await supabase
    .from('worker_invoice_events')
    .select('id, event_type, provider_event_id, created_at')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .limit(40);

  const { data: audits } = await supabase
    .from('audit_events')
    .select('id, action, created_at')
    .eq('entity_type', 'worker_commission_invoice')
    .eq('entity_id', invoiceId)
    .order('created_at', { ascending: false })
    .limit(40);

  const orgName = org?.display_name ?? org?.legal_name ?? 'Organization';
  const workerName = profile?.full_name ?? invoice?.worker_name ?? 'Worker';
  const workerRole = workerProfile?.worker_role ?? invoice?.worker_role ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/finance" className="text-sm text-slate-600 hover:underline">
          ← Finance
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          {full.invoice_number}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {workerInvoiceStatusLabel(full.status)} · Due {formatDateTime(full.due_at)}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {WORKER_COMMISSION_EXPLAINER}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">Context</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Worker</dt>
              <dd>{workerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Role</dt>
              <dd>{workerRole ? roleLabel(workerRole) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Organization</dt>
              <dd>{orgName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Shift</dt>
              <dd>{shift?.title ?? 'Shift'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Shift date</dt>
              <dd>{shift?.starts_at ? formatDateTime(shift.starts_at) : '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">Financial snapshot</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Approved minutes</dt>
              <dd>{full.approved_minutes}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Rate</dt>
              <dd>{formatMoneyMinor(full.rate_minor, full.currency)} / hour</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Approved gross</dt>
              <dd>{formatMoneyMinor(full.gross_amount_minor, full.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Commission rate</dt>
              <dd>{(full.commission_rate_bps / 100).toFixed(2)}%</dd>
            </div>
            <div className="flex justify-between gap-4 font-medium">
              <dt>Commission due</dt>
              <dd>{formatMoneyMinor(full.commission_amount_minor, full.currency)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Provider references</h3>
        <p className="mt-1 text-xs text-slate-500">
          Visible only to authorized finance roles. Secrets and card data are never shown.
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Provider</dt>
            <dd>{full.provider_name ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Checkout session</dt>
            <dd className="font-mono text-xs">
              {full.stripe_checkout_session_id ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Payment intent</dt>
            <dd className="font-mono text-xs">
              {full.stripe_payment_intent_id ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Customer</dt>
            <dd className="font-mono text-xs">{full.stripe_customer_id ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Provider events</h3>
        {(events ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No provider events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(events ?? []).map((event) => (
              <li key={event.id} className="flex justify-between gap-4">
                <span>
                  {event.event_type}
                  {event.provider_event_id ? (
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      {event.provider_event_id}
                    </span>
                  ) : null}
                </span>
                <span className="text-slate-500">{formatDateTime(event.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Audit history</h3>
        {(audits ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No audit events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(audits ?? []).map((event) => (
              <li key={event.id} className="flex justify-between gap-4">
                <span>{event.action}</span>
                <span className="text-slate-500">{formatDateTime(event.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Manual mark-paid is not offered. Corrections require protected RPCs and legal /
        accounting review (deferred).
      </p>
    </div>
  );
}
