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

function organizationMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

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
    p_sort:
      statusFilter === 'under_review'
        ? 'oldest'
        : sort === 'oldest'
          ? 'oldest'
          : 'newest',
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  const awaitingResult =
    !statusFilter && page === 1
      ? await supabase.rpc('list_admin_organizations', {
          p_status: 'under_review',
          p_sort: 'oldest',
          p_limit: 10,
          p_offset: 0,
        })
      : { data: null, error: null };

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

  const awaitingRows = (awaitingResult.data ?? []) as typeof rows;
  const awaitingCount = Number(awaitingRows[0]?.total_count ?? 0);

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

      {awaitingCount > 0 && !statusFilter ? (
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Organizations awaiting review ({awaitingCount})
              </h3>
              <p className="text-sm text-slate-600">
                Oldest submissions first. Opening a notice does not approve.
              </p>
            </div>
            <Link
              href="/admin/organizations?status=under_review&sort=oldest"
              className="text-sm font-medium text-amber-800 hover:underline"
            >
              View full queue
            </Link>
          </div>
          <ul className="divide-y divide-amber-100 rounded-lg border border-amber-100 bg-white">
            {awaitingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.display_name}</p>
                  <p className="text-xs text-slate-500">
                    {ORGANIZATION_TYPE_LABELS[row.organization_type] ??
                      row.organization_type}{' '}
                    · activity {formatDateTime(row.last_activity)}
                  </p>
                </div>
                <Link
                  href={`/admin/organizations/${row.id}`}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {statusFilter === 'under_review' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Showing organizations with status under_review (oldest first). Approve
          or reject from the organization detail page — reading a notice never
          activates an organization.
        </p>
      ) : null}

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
          {rows.map((row) => {
            const typeLabel = row.organization_type
              ? (ORGANIZATION_TYPE_LABELS[
                  row.organization_type as OrganizationType
                ] ?? row.organization_type)
              : null;
            const stats = [
              { label: 'Members', value: row.member_count },
              { label: 'Locations', value: row.location_count },
              { label: 'Published shifts', value: row.published_shift_count },
            ];

            return (
              <article
                key={row.id}
                className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_4px_16px_rgba(7,29,48,0.04)]"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-sm font-semibold tracking-wide text-white"
                      aria-hidden
                    >
                      {organizationMark(row.display_name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold tracking-tight text-bh-text">
                          {row.display_name}
                        </h3>
                        <Badge
                          variant={
                            row.status === 'active'
                              ? 'success'
                              : row.status === 'suspended' ||
                                  row.status === 'rejected'
                                ? 'danger'
                                : row.status === 'under_review'
                                  ? 'warning'
                                  : 'muted'
                          }
                        >
                          {ORG_STATUS_LABELS[row.status as OrgStatus] ??
                            row.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-bh-text-secondary">
                        {[typeLabel, row.legal_name].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-bh-text-muted">
                        {row.short_reference}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/admin/organizations/${row.id}#profile`}
                      aria-label={`View profile for ${row.display_name}`}
                      className="rounded-full border border-bh-border bg-white px-3.5 py-2 text-sm font-medium text-bh-text transition hover:border-bh-border-strong hover:bg-bh-subtle"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/admin/organizations/${row.id}`}
                      aria-label={`View details for ${row.display_name}`}
                      className="rounded-full bg-bh-sidebar px-3.5 py-2 text-sm font-medium text-white transition hover:bg-bh-sidebar-raised"
                    >
                      View details
                    </Link>
                  </div>
                </div>
                <dl className="grid grid-cols-3 border-t border-bh-border">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="px-4 py-3 sm:px-5"
                    >
                      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-bh-text-muted">
                        {stat.label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-bh-text">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="border-t border-bh-border px-4 py-2.5 text-xs text-bh-text-muted sm:px-5">
                  Created {formatDateTime(row.created_at)}
                  {row.status === 'under_review'
                    ? ` · Last activity ${formatDateTime(row.last_activity)}`
                    : ''}
                </p>
              </article>
            );
          })}
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
