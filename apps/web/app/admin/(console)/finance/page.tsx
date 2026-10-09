import Link from 'next/link';
import {
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  formatMoneyMinor,
  isWorkerRole,
  workerInvoiceStatusLabel,
} from '@bridge-hive/domain';

import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { WorkerRole } from '@bridge-hive/domain';

type FinanceInvoiceRow = {
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
};

type FinanceMetrics = {
  open_count: number;
  open_amount_minor: number;
  past_due_count: number;
  past_due_amount_minor: number;
  paid_count: number;
  paid_amount_minor: number;
  due_within_3_days_count: number;
  restricted_worker_count: number;
  payment_exceptions_count: number;
};

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    role?: string;
    q?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin();
  const params = await searchParams;

  if (!ctx.capabilities.canViewFinance) {
    return (
      <EmptyState
        title="Permission denied"
        description="Finance tools are limited to platform finance and super admin roles."
      />
    );
  }

  const supabase = await createClient();
  const statusFilter = params.status?.trim() || null;
  const roleFilter =
    params.role && isWorkerRole(params.role) ? params.role : null;
  const search = params.q?.trim() || null;

  const [{ data: metricsRaw, error: metricsError }, { data: invoicesRaw, error: listError }] =
    await Promise.all([
      supabase.rpc('get_finance_metrics'),
      supabase.rpc('list_finance_invoices', {
        p_status: statusFilter ?? undefined,
        p_worker_role: roleFilter ?? undefined,
        p_organization_id: undefined,
        p_due_before: undefined,
        p_due_after: undefined,
        p_search: search ?? undefined,
        p_limit: 50,
        p_offset: 0,
      }),
    ]);

  if (metricsError || listError) {
    return (
      <EmptyState
        title="Unable to load finance data"
        description="Refresh and try again."
      />
    );
  }

  const metrics = (metricsRaw ?? {}) as FinanceMetrics;
  const invoices = (invoicesRaw ?? []) as FinanceInvoiceRow[];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Finance</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bridge Hive commission invoices owed by workers (16% of approved gross shift
          pay). Hospitals pay workers the approved gross amount separately.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Open commission"
          value={formatMoneyMinor(metrics.open_amount_minor ?? 0)}
          subtitle={`${metrics.open_count ?? 0} invoices`}
        />
        <MetricCard
          title="Past due"
          value={formatMoneyMinor(metrics.past_due_amount_minor ?? 0)}
          subtitle={`${metrics.past_due_count ?? 0} invoices`}
          tone="warning"
        />
        <MetricCard
          title="Paid this period"
          value={formatMoneyMinor(metrics.paid_amount_minor ?? 0)}
          subtitle={`${metrics.paid_count ?? 0} invoices`}
          tone="success"
        />
        <MetricCard
          title="Restricted workers"
          value={String(metrics.restricted_worker_count ?? 0)}
          subtitle={`${metrics.due_within_3_days_count ?? 0} due within 3 days · ${metrics.payment_exceptions_count ?? 0} exceptions`}
        />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-700">
          Status
          <select
            name="status"
            defaultValue={statusFilter ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="past_due">Past due</option>
            <option value="paid">Paid</option>
            <option value="payment_processing">Payment processing</option>
            <option value="void">Void</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Role
          <select
            name="role"
            defaultValue={roleFilter ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {WORKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {WORKER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Search
          <input
            name="q"
            defaultValue={search ?? ''}
            placeholder="Invoice, worker, organization"
            className="mt-1 block w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
      </form>

      {invoices.length === 0 ? (
        <EmptyState
          title="No commission invoices"
          description="Invoices appear after organizations approve timesheets."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/finance/${row.id}`}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {row.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.worker_name ?? 'Worker'}</div>
                    <div className="text-xs text-slate-500">
                      {row.worker_role ? roleLabel(row.worker_role) : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.organization_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {formatMoneyMinor(row.gross_amount_minor, row.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoneyMinor(row.commission_amount_minor, row.currency)}
                  </td>
                  <td className="px-4 py-3">{formatDateTime(row.due_at)}</td>
                  <td className="px-4 py-3">
                    {workerInvoiceStatusLabel(row.status)}
                    {row.provider_name ? (
                      <div className="text-xs text-slate-500">{row.provider_name}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'warning' | 'success';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
    </div>
  );
}
