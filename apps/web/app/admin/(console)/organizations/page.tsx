import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  ORG_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type OrgStatus,
  type OrganizationType,
} from '@bridge-hive/domain';

const PAGE_SIZE = 20;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot manage organizations."
      />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest';

  const statusFilter =
    params.status === 'pending' ||
    params.status === 'under_review' ||
    params.status === 'active' ||
    params.status === 'rejected' ||
    params.status === 'suspended' ||
    params.status === 'closed'
      ? params.status
      : undefined;
  const typeFilter =
    params.type === 'hospital' ||
    params.type === 'clinic' ||
    params.type === 'nursing_home' ||
    params.type === 'other'
      ? params.type
      : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_admin_organizations', {
    ...(params.q?.trim() ? { p_search: params.q.trim() } : {}),
    ...(statusFilter ? { p_status: statusFilter } : {}),
    ...(typeFilter ? { p_organization_type: typeFilter } : {}),
    p_sort: sort === 'oldest' ? 'oldest' : 'newest',
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    return (
      <EmptyState
        title="Unable to load organizations"
        description="Refresh the page or try again shortly."
      />
    );
  }

  const rows = (data ?? []) as Array<{
    id: string;
    display_name: string;
    legal_name: string;
    short_reference: string;
    organization_type: OrganizationType;
    status: OrgStatus;
    member_count: number;
    location_count: number;
    published_shift_count: number;
    created_at: string;
    last_activity: string;
    total_count: number;
  }>;

  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));

  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.type) qs.set('type', params.type);
  if (params.sort) qs.set('sort', params.sort);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Organizations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage organization profiles, memberships, and approval status.
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Create organization
        </Link>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Search</span>
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Name or slug"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Status</span>
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under review</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Type</span>
          <select
            name="type"
            defaultValue={params.type ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All types</option>
            <option value="hospital">Hospital</option>
            <option value="clinic">Clinic</option>
            <option value="nursing_home">Nursing home</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Sort</span>
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <div className="flex items-end lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Apply filters
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No organizations match"
          description="Try clearing filters or create a new organization."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        row.status === 'active'
                          ? 'success'
                          : row.status === 'suspended'
                            ? 'danger'
                            : row.status === 'rejected'
                              ? 'danger'
                              : 'muted'
                      }
                    >
                      {ORG_STATUS_LABELS[row.status as OrgStatus] ?? row.status}
                    </Badge>
                    {row.organization_type ? (
                      <span className="text-xs text-slate-500">
                        {ORGANIZATION_TYPE_LABELS[
                          row.organization_type as OrganizationType
                        ] ?? row.organization_type}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {row.display_name}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {row.legal_name} · {row.short_reference}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {row.member_count} members · {row.location_count} locations ·{' '}
                    {row.published_shift_count} published shifts
                  </p>
                </div>
                <Link
                  href={`/admin/organizations/${row.id}`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  View details
                </Link>
              </div>
              <div className="mt-3 text-sm text-slate-500">
                Created {formatDateTime(row.created_at)}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages} · {total} organizations
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="rounded-md border border-slate-300 px-3 py-1.5"
                href={`/admin/organizations?${qs.toString()}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                className="rounded-md border border-slate-300 px-3 py-1.5"
                href={`/admin/organizations?${qs.toString()}&page=${page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
