import Link from 'next/link';

import { CredentialStatusBadge } from '@/components/admin/status-badges';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { credentialTypeLabel } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 20;

export default async function AdminCredentialsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type?: string;
    expiry?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewCredentialMetadata) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view the credential review queue."
      />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = await createClient();

  const useFunction = ctx.adminRole === 'platform_support';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let credentials: any[] = [];
  let count = 0;
  let error = null;

  if (useFunction) {
    const { data, error: rpcError } = await supabase.rpc('credential_support_view');
    credentials = data ?? [];
    count = credentials.length;
    error = rpcError;
  } else {
    let query = supabase
      .from('credentials')
      .select(
        'id, credential_type, status, expires_at, created_at, worker_id, worker:worker_profiles!credentials_worker_id_fkey(user_id, profile:profiles!worker_profiles_user_id_fkey(full_name))',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (
      params.status === 'pending' ||
      params.status === 'under_review' ||
      params.status === 'verified' ||
      params.status === 'rejected' ||
      params.status === 'expired' ||
      params.status === 'suspended'
    ) {
      query = query.eq('status', params.status);
    } else {
      query = query.in('status', ['pending', 'under_review']);
    }

    if (params.type?.trim()) {
      query = query.eq('credential_type', params.type.trim());
    }

    if (params.expiry === 'expiring') {
      query = query
        .lt('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .gt('expires_at', new Date().toISOString());
    } else if (params.expiry === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    }

    const result = await query;
    credentials = result.data ?? [];
    count = result.count ?? 0;
    error = result.error;
  }

  // Apply client-side filters for function results
  if (useFunction) {
    if (
      params.status === 'pending' ||
      params.status === 'under_review' ||
      params.status === 'verified' ||
      params.status === 'rejected' ||
      params.status === 'expired' ||
      params.status === 'suspended'
    ) {
      credentials = credentials.filter(c => c.status === params.status);
    } else {
      credentials = credentials.filter(c => c.status === 'pending' || c.status === 'under_review');
    }

    if (params.type?.trim()) {
      const trimmedType = params.type.trim();
      credentials = credentials.filter(c => c.credential_type === trimmedType);
    }

    if (params.expiry === 'expiring') {
      credentials = credentials.filter(c =>
        c.expires_at &&
        new Date(c.expires_at) > new Date() &&
        new Date(c.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
    } else if (params.expiry === 'expired') {
      credentials = credentials.filter(c => c.expires_at && new Date(c.expires_at) < new Date());
    }

    count = credentials.length;
    credentials = credentials.slice(from, to + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Credential review</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review worker credential metadata. Document access is limited to verifiers.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Credential status"
        >
          <option value="">Pending + under review</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
        <input
          name="type"
          defaultValue={params.type ?? ''}
          placeholder="Credential type"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Credential type"
        />
        <select
          name="expiry"
          defaultValue={params.expiry ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Expiry filter"
        >
          <option value="">Any expiry</option>
          <option value="expiring">Expiring in 30 days</option>
          <option value="expired">Expired</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Apply filters
        </button>
      </form>

      {error ? (
        <EmptyState
          title="Unable to load credentials"
          description="Please try again shortly."
        />
      ) : !credentials?.length ? (
        <EmptyState
          title="No credentials in queue"
          description="New pending credentials will appear here for review."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {credentials.map((cred) => {
                const worker = Array.isArray(cred.worker) ? cred.worker[0] : cred.worker;
                const profile = worker?.profile
                  ? Array.isArray(worker.profile)
                    ? worker.profile[0]
                    : worker.profile
                  : null;
                return (
                  <tr key={cred.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {profile?.full_name ?? cred.worker_id.slice(0, 8) + '…'}
                    </td>
                    <td className="px-4 py-3">
                      {credentialTypeLabel(cred.credential_type)}
                    </td>
                    <td className="px-4 py-3">
                      <CredentialStatusBadge status={cred.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(cred.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cred.expires_at ? formatDateTime(cred.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/credentials/${cred.id}`}
                        className="font-medium text-amber-700 hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
              href={`/admin/credentials?${new URLSearchParams({
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
              href={`/admin/credentials?${new URLSearchParams({
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
