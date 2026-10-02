import Link from 'next/link';

import {
  AccountStatusBadge,
  OnboardingStatusBadge,
  VerificationStatusBadge,
} from '@/components/admin/status-badges';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { getWorkerPackageLabel } from '@/lib/admin/document-status';
import { roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { WorkerRole } from '@bridge-hive/domain';

const PAGE_SIZE = 20;

export default async function AdminWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    verification?: string;
    onboarding?: string;
    account?: string;
    expiry?: string;
    docs?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewWorkers) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view the worker directory."
      />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Support users use the SECURITY DEFINER function
  const useFunction = ctx.adminRole === 'platform_support';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let workers: any[] = [];
  let count = 0;
  let error = null;

  if (useFunction) {
    // For support, use the RPC function
    const { data, error: rpcError } = await supabase.rpc('worker_support_view');
    workers = data ?? [];
    count = workers.length;
    error = rpcError;
  } else {
    // For verifier/super, use direct table access
    let query = supabase
      .from('worker_profiles')
      .select(
        'user_id, worker_role, onboarding_status, verification_status, created_at, profile:profiles!worker_profiles_user_id_fkey(full_name, phone, account_status)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params.role === 'registered_nurse' || params.role === 'ward_assistant') {
      query = query.eq('worker_role', params.role);
    }
    if (
      params.verification === 'draft' ||
      params.verification === 'submitted' ||
      params.verification === 'under_review' ||
      params.verification === 'verified' ||
      params.verification === 'rejected' ||
      params.verification === 'suspended' ||
      params.verification === 'expired'
    ) {
      query = query.eq('verification_status', params.verification);
    }
    if (
      params.onboarding === 'not_started' ||
      params.onboarding === 'in_progress' ||
      params.onboarding === 'completed'
    ) {
      query = query.eq('onboarding_status', params.onboarding);
    }

    const result = await query;
    workers = result.data ?? [];
    count = result.count ?? 0;
    error = result.error;
  }

  // Normalize data structure
  let rows = workers.map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...row,
    profile: useFunction
      ? { full_name: row.full_name, phone: row.phone, account_status: row.account_status }
      : Array.isArray(row.profile) ? row.profile[0] : row.profile,
  }));

  // Apply client-side filters for function results
  if (useFunction) {
    if (params.role === 'registered_nurse' || params.role === 'ward_assistant') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows = rows.filter((row: any) => row.worker_role === params.role);
    }
    if (
      params.verification === 'draft' ||
      params.verification === 'submitted' ||
      params.verification === 'under_review' ||
      params.verification === 'verified' ||
      params.verification === 'rejected' ||
      params.verification === 'suspended' ||
      params.verification === 'expired'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows = rows.filter((row: any) => row.verification_status === params.verification);
    }
    if (
      params.onboarding === 'not_started' ||
      params.onboarding === 'in_progress' ||
      params.onboarding === 'completed'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows = rows.filter((row: any) => row.onboarding_status === params.onboarding);
    }
  }

  if (params.account) {
    rows = rows.filter(
      (row) => row.profile?.account_status === params.account,
    );
  }

  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    rows = rows.filter((row) => {
      const name = row.profile?.full_name?.toLowerCase() ?? '';
      const phone = row.profile?.phone?.toLowerCase() ?? '';
      return (
        name.includes(q) ||
        phone.includes(q) ||
        row.user_id.toLowerCase().includes(q)
      );
    });
  }

  if (params.expiry === 'expiring') {
    let expiringWorkerIds: Set<string>;
    if (useFunction) {
      const { data: expiring } = await supabase.rpc('credential_support_view');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (expiring ?? []).filter((c: any) =>
        c.status === 'verified' &&
        c.expires_at &&
        new Date(c.expires_at) > new Date() &&
        new Date(c.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiringWorkerIds = new Set(filtered.map((c: any) => c.worker_id));
    } else {
      const { data: expiring } = await supabase
        .from('credentials')
        .select('worker_id')
        .eq('status', 'verified')
        .lt('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .gt('expires_at', new Date().toISOString());
      expiringWorkerIds = new Set((expiring ?? []).map((c) => c.worker_id));
    }
    rows = rows.filter((row) => expiringWorkerIds.has(row.user_id));
  }

  // Apply pagination for function results
  if (useFunction) {
    count = rows.length;
    rows = rows.slice(from, to + 1);
  }

  const workerIds = rows.map((row) => row.user_id);
  type CredRow = {
    worker_id: string;
    credential_type: string;
    status: string;
    storage_path?: string | null;
    storage_paths?: unknown;
  };
  const [{ data: allCreds }, { data: payoutAccounts }] = workerIds.length
    ? await Promise.all([
        useFunction
          ? supabase.rpc('credential_support_view')
          : supabase
              .from('credentials')
              .select(
                'worker_id, credential_type, status, storage_path, storage_paths',
              )
              .in('worker_id', workerIds),
        supabase.rpc('list_worker_payout_statuses'),
      ])
    : [{ data: [] as CredRow[] }, { data: [] as Array<{ worker_id: string; status: string }> }];

  const credsByWorker = new Map<string, CredRow[]>();
  for (const cred of (allCreds ?? []) as CredRow[]) {
    if (!workerIds.includes(cred.worker_id)) continue;
    const list = credsByWorker.get(cred.worker_id) ?? [];
    list.push(cred);
    credsByWorker.set(cred.worker_id, list);
  }
  const payoutRows = ((payoutAccounts ?? []) as Array<{ worker_id: string; status: string }>).filter(
    (p) => workerIds.includes(p.worker_id),
  );
  const payoutOk = new Set(
    payoutRows.filter((p) => p.status === 'verified').map((p) => p.worker_id),
  );
  const payoutPending = new Set(
    payoutRows.filter((p) => p.status === 'pending').map((p) => p.worker_id),
  );
  const payoutStatusByWorker = new Map(
    payoutRows.map((p) => [p.worker_id, p.status]),
  );

  let labeledRows = rows.map((row) => {
    const packageLabel = getWorkerPackageLabel({
      verificationStatus: row.verification_status,
      accountStatus: row.profile?.account_status,
      role: row.worker_role as WorkerRole | null,
      credentials: credsByWorker.get(row.user_id) ?? [],
      payoutSatisfied: payoutOk.has(row.user_id),
      payoutStatus: payoutStatusByWorker.get(row.user_id) ?? null,
    });
    return { ...row, packageLabel };
  });

  if (params.docs === 'awaiting') {
    labeledRows = labeledRows.filter(
      (row) => row.packageLabel === 'Documents not submitted',
    );
  } else if (params.docs === 'ready') {
    labeledRows = labeledRows.filter(
      (row) => row.packageLabel === 'Ready for final approval',
    );
  } else if (params.docs === 'payout_pending') {
    labeledRows = labeledRows.filter((row) => payoutPending.has(row.user_id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Workers</h2>
        <p className="mt-1 text-sm text-slate-600">
          Search and filter worker accounts for support and verification oversight.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 lg:grid-cols-6">
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search name, phone, or ID"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          aria-label="Search workers"
        />
        <select
          name="role"
          defaultValue={params.role ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Worker role"
        >
          <option value="">All roles</option>
          <option value="registered_nurse">Registered nurse</option>
          <option value="ward_assistant">Ward assistant</option>
        </select>
        <select
          name="verification"
          defaultValue={params.verification ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Verification status"
        >
          <option value="">All verification</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          name="onboarding"
          defaultValue={params.onboarding ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Onboarding status"
        >
          <option value="">All onboarding</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          name="account"
          defaultValue={params.account ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Account status"
        >
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          name="expiry"
          defaultValue={params.expiry ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Credential expiry"
        >
          <option value="">Any expiry</option>
          <option value="expiring">Expiring in 30 days</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 md:col-span-2 lg:col-span-1"
        >
          Apply filters
        </button>
      </form>

      {error ? (
        <EmptyState
          title="Unable to load workers"
          description="Please try again. If the problem continues, contact engineering."
        />
      ) : labeledRows.length === 0 ? (
        <EmptyState
          title="No workers found"
          description="Try adjusting filters or search terms."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Documents</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 font-medium">Onboarding</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {labeledRows.map((row) => (
                  <tr key={row.user_id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {row.profile?.full_name ?? 'Unnamed worker'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.user_id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.worker_role ? roleLabel(row.worker_role) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.packageLabel}
                    </td>
                    <td className="px-4 py-3">
                      <VerificationStatusBadge status={row.verification_status} />
                    </td>
                    <td className="px-4 py-3">
                      <OnboardingStatusBadge status={row.onboarding_status} />
                    </td>
                    <td className="px-4 py-3">
                      <AccountStatusBadge
                        status={row.profile?.account_status ?? 'active'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/workers/${row.user_id}`}
                        className="font-medium text-amber-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Showing page {page}
          {count != null ? ` · ${count} total` : ''}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/workers?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(params).filter(
                    ([k, v]) => k !== 'page' && Boolean(v),
                  ),
                ),
                page: String(page - 1),
              }).toString()}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Previous
            </Link>
          ) : null}
          {count != null && page * PAGE_SIZE < count ? (
            <Link
              href={`/admin/workers?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(params).filter(
                    ([k, v]) => k !== 'page' && Boolean(v),
                  ),
                ),
                page: String(page + 1),
              }).toString()}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
