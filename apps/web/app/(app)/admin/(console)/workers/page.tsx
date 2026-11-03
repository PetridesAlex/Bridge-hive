import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock3,
  Search,
  Users,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  isWorkerRole,
  type WorkerRole,
} from '@bridge-hive/domain';

const PAGE_SIZE = 20;

const FIELD =
  'h-11 w-full rounded-xl border border-bh-border/90 bg-bh-subtle/50 px-3.5 text-sm font-medium text-bh-text outline-none transition focus:border-bh-teal focus:bg-white focus:ring-2 focus:ring-bh-teal/20';

const LABEL =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted';

type DocTone = 'success' | 'progress' | 'danger' | 'muted';

const DOC_TONE_CLASS: Record<DocTone, string> = {
  success: 'border-bh-success/30 bg-bh-success-soft text-bh-success',
  progress: 'border-bh-honey/35 bg-bh-honey-soft text-bh-honey-strong',
  danger: 'border-bh-danger/30 bg-bh-danger-soft text-bh-danger',
  muted: 'border-bh-border/80 bg-bh-subtle/80 text-bh-text-secondary',
};

const DOC_ICON: Record<DocTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  progress: Clock3,
  danger: CircleAlert,
  muted: CircleDashed,
};

function packageTone(label: string): DocTone {
  const l = label.toLowerCase();
  if (l.includes('not submitted') || l.includes('missing')) return 'muted';
  if (
    l.includes('reject') ||
    l.includes('suspend') ||
    l.includes('expired') ||
    l.includes('failed') ||
    l.includes('action required')
  ) {
    return 'danger';
  }
  if (l.includes('approved') || l.includes('verified')) return 'success';
  return 'progress';
}

function workerMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

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

    if (params.role && isWorkerRole(params.role)) {
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
    if (params.role && isWorkerRole(params.role)) {
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

  const pageHref = (target: number) =>
    `/admin/workers?${new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).filter(([k, v]) => k !== 'page' && Boolean(v)),
      ),
      page: String(target),
    }).toString()}`;

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
              Bridge Hive · Workforce
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text sm:text-[2.15rem]">
              Workers
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-bh-text-secondary">
              Search and filter worker accounts for support and verification
              oversight.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-subtle/80 px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <Users className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
            {count} worker{count === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <form className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-sidebar-raised to-bh-teal"
        />
        <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/70 to-bh-surface px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
            Filters
          </p>
          <p className="mt-1 text-sm font-semibold tracking-tight text-bh-text">
            Refine the worker directory
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-sm md:col-span-3 lg:col-span-2">
            <span className={LABEL}>Search</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
                aria-hidden
              />
              <input
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Name, phone, or ID"
                className={cn(FIELD, 'pl-10')}
                aria-label="Search workers"
              />
            </span>
          </label>
          <label className="text-sm">
            <span className={LABEL}>Role</span>
            <select
              name="role"
              defaultValue={params.role ?? ''}
              className={FIELD}
            >
              <option value="">All roles</option>
              {WORKER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {WORKER_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={LABEL}>Verification</span>
            <select
              name="verification"
              defaultValue={params.verification ?? ''}
              className={FIELD}
            >
              <option value="">All verification</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={LABEL}>Onboarding</span>
            <select
              name="onboarding"
              defaultValue={params.onboarding ?? ''}
              className={FIELD}
            >
              <option value="">All onboarding</option>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={LABEL}>Account</span>
            <select
              name="account"
              defaultValue={params.account ?? ''}
              className={FIELD}
            >
              <option value="">All accounts</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={LABEL}>Credential expiry</span>
            <select
              name="expiry"
              defaultValue={params.expiry ?? ''}
              className={FIELD}
            >
              <option value="">Any expiry</option>
              <option value="expiring">Expiring in 30 days</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 md:col-span-3 lg:col-span-6">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-bh-sidebar px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
            >
              Apply filters
            </button>
            <Link
              href="/admin/workers"
              className="inline-flex h-11 items-center justify-center rounded-full border border-bh-border bg-white px-5 text-sm font-semibold text-bh-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle hover:text-bh-text"
            >
              Clear
            </Link>
          </div>
        </div>
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
        <section className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-teal via-bh-sidebar to-bh-honey"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-bh-border bg-bh-subtle/70 text-[11px] uppercase tracking-[0.12em] text-bh-text-muted">
                  <th className="px-5 py-3.5 font-bold">Worker</th>
                  <th className="px-3 py-3.5 font-bold">Role</th>
                  <th className="px-3 py-3.5 font-bold">Documents</th>
                  <th className="px-3 py-3.5 font-bold">Verification</th>
                  <th className="px-3 py-3.5 font-bold">Onboarding</th>
                  <th className="px-3 py-3.5 font-bold">Account</th>
                  <th className="px-5 py-3.5 font-bold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {labeledRows.map((row) => {
                  const name = row.profile?.full_name ?? 'Unnamed worker';
                  const docTone = packageTone(row.packageLabel);
                  const DocIcon = DOC_ICON[docTone];
                  return (
                    <tr
                      key={row.user_id}
                      className="group border-b border-bh-border/70 transition-colors last:border-0 hover:bg-bh-teal-soft/25"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/workers/${row.user_id}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-[12px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(7,29,48,0.22)] ring-1 ring-black/5 transition duration-300 group-hover:scale-105"
                          >
                            {workerMark(name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-bold tracking-tight text-bh-text transition-colors group-hover:text-bh-teal-strong">
                              {name}
                            </span>
                            <span className="mt-0.5 block font-mono text-[11px] tracking-[0.08em] text-bh-text-muted">
                              {row.user_id.slice(0, 8)}…
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex whitespace-nowrap rounded-full border border-bh-border/80 bg-bh-subtle/80 px-2.5 py-1 text-xs font-semibold text-bh-text-secondary">
                          {row.worker_role ? roleLabel(row.worker_role) : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            'inline-flex max-w-[15rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-4',
                            DOC_TONE_CLASS[docTone],
                          )}
                        >
                          <DocIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span>{row.packageLabel}</span>
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <VerificationStatusBadge status={row.verification_status} />
                      </td>
                      <td className="px-3 py-4">
                        <OnboardingStatusBadge status={row.onboarding_status} />
                      </td>
                      <td className="px-3 py-4">
                        <AccountStatusBadge
                          status={row.profile?.account_status ?? 'active'}
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/workers/${row.user_id}`}
                          className="group/btn inline-flex h-9 items-center gap-1.5 rounded-full bg-bh-sidebar px-3.5 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
                        >
                          View
                          <ArrowRight
                            className="h-3.5 w-3.5 transition group-hover/btn:translate-x-0.5"
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border/90 bg-bh-surface px-4 py-3.5 text-sm shadow-[0_6px_20px_rgba(7,29,48,0.04)] sm:px-5">
        <p className="font-medium text-bh-text-secondary">
          Page {page}
          {count != null ? (
            <span className="text-bh-text-muted"> · {count} total</span>
          ) : null}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="inline-flex h-9 items-center rounded-full border border-bh-border bg-white px-3.5 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:bg-bh-subtle"
            >
              Previous
            </Link>
          ) : null}
          {count != null && page * PAGE_SIZE < count ? (
            <Link
              href={pageHref(page + 1)}
              className="inline-flex h-9 items-center rounded-full bg-bh-sidebar px-3.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
