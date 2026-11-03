import { ArrowRight, Building2, Search } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import {
  ORG_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type OrgStatus,
  type OrganizationType,
} from '@bridge-hive/domain';

const PAGE_SIZE = 20;

const FIELD =
  'h-11 w-full rounded-xl border border-bh-border/90 bg-bh-subtle/50 px-3.5 text-sm font-medium text-bh-text outline-none transition focus:border-bh-teal focus:bg-white focus:ring-2 focus:ring-bh-teal/20';

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
              Bridge Hive · Directory
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text sm:text-[2.15rem]">
              Organizations
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-bh-text-secondary">
              Manage organization profiles, memberships, and approval status.
            </p>
          </div>
          <Link
            href="/admin/organizations/new"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,42,67,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(11,42,67,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full"
            />
            <span className="relative">Create organization</span>
            <span
              aria-hidden
              className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs transition group-hover:translate-x-0.5 group-hover:bg-white/30"
            >
              +
            </span>
          </Link>
        </div>
      </header>

      {awaitingCount > 0 && !statusFilter ? (
        <section className="relative overflow-hidden rounded-[1.25rem] border border-bh-honey/30 bg-gradient-to-br from-[#fff8e8] via-bh-surface to-bh-surface shadow-[0_8px_28px_rgba(224,170,24,0.1)]">
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-honey via-bh-honey-strong to-bh-sidebar"
          />
          <div className="relative space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
                  Review queue
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
                  Organizations awaiting review
                  <span className="ml-2 inline-flex rounded-full bg-bh-honey px-2 py-0.5 text-[11px] font-bold tabular-nums text-bh-sidebar">
                    {awaitingCount}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-bh-text-secondary">
                  Oldest submissions first. Opening a notice does not approve.
                </p>
              </div>
              <Link
                href="/admin/organizations?status=under_review&sort=oldest"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-bh-honey/40 bg-white px-3.5 text-sm font-semibold text-bh-honey-strong shadow-sm transition hover:-translate-y-0.5 hover:border-bh-honey hover:bg-bh-honey-soft"
              >
                View full queue
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <ul className="divide-y divide-bh-border/70 overflow-hidden rounded-2xl border border-bh-border/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {awaitingRows.map((row) => (
                <li
                  key={row.id}
                  className="group flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-bh-honey-soft/40 sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-[12px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(7,29,48,0.2)]"
                    >
                      {organizationMark(row.display_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold tracking-tight text-bh-text">
                        {row.display_name}
                      </p>
                      <p className="mt-0.5 text-xs text-bh-text-muted">
                        {ORGANIZATION_TYPE_LABELS[row.organization_type] ??
                          row.organization_type}{' '}
                        · activity {formatDateTime(row.last_activity)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/organizations/${row.id}`}
                    className="inline-flex h-9 items-center rounded-full bg-bh-sidebar px-3.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {statusFilter === 'under_review' ? (
        <div className="relative overflow-hidden rounded-2xl border border-bh-honey/30 bg-gradient-to-r from-[#fff8e8] via-bh-surface to-bh-surface px-4 py-3.5 shadow-[0_6px_20px_rgba(224,170,24,0.08)] sm:px-5">
          <div
            aria-hidden
            className="absolute inset-y-3 left-0 w-1 rounded-full bg-bh-honey shadow-[0_0_10px_rgba(224,170,24,0.45)]"
          />
          <p className="pl-3 text-sm leading-6 text-bh-text">
            <span className="font-semibold text-bh-honey-strong">
              Under review · oldest first.
            </span>{' '}
            Approve or reject from the organization detail page — reading a
            notice never activates an organization.
          </p>
        </div>
      ) : null}

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
            Refine the directory
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Search
            </span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
                aria-hidden
              />
              <input
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Name or slug"
                className={cn(FIELD, 'pl-10')}
              />
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Status
            </span>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className={FIELD}
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
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Type
            </span>
            <select
              name="type"
              defaultValue={params.type ?? ''}
              className={FIELD}
            >
              <option value="">All types</option>
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="nursing_home">Nursing home</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Sort
            </span>
            <select name="sort" defaultValue={sort} className={FIELD}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 lg:col-span-4">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-bh-sidebar px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
            >
              Apply filters
            </button>
            <Link
              href="/admin/organizations"
              className="inline-flex h-11 items-center justify-center rounded-full border border-bh-border bg-white px-5 text-sm font-semibold text-bh-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle hover:text-bh-text"
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface px-6 py-14 text-center shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-bh-teal/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-bh-honey/15 blur-2xl"
          />
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-bh-sidebar via-bh-teal to-bh-honey text-white shadow-[0_10px_24px_rgba(11,42,67,0.25)]">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="relative mt-5 text-lg font-semibold tracking-tight text-bh-text">
            No organizations match
          </h3>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-bh-text-secondary">
            Try clearing filters or create a new organization.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/admin/organizations"
              className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:bg-bh-subtle"
            >
              Clear filters
            </Link>
            <Link
              href="/admin/organizations/new"
              className="inline-flex h-10 items-center rounded-full bg-bh-sidebar px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
            >
              Create organization
            </Link>
          </div>
        </div>
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
                className="group/card overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-bh-border-strong hover:shadow-[0_14px_36px_rgba(7,29,48,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bh-sidebar text-sm font-semibold tracking-wide text-white shadow-[0_4px_12px_rgba(7,29,48,0.22)] ring-1 ring-black/5"
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
                      className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:border-bh-border-strong hover:bg-bh-subtle"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/admin/organizations/${row.id}`}
                      aria-label={`View details for ${row.display_name}`}
                      className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-bh-sidebar px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
                    >
                      View details
                      <ArrowRight
                        className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </div>
                </div>
                <dl className="grid grid-cols-3 border-t border-bh-border/80 bg-bh-subtle/35">
                  {stats.map((stat) => (
                    <div key={stat.label} className="px-4 py-3 sm:px-5">
                      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-bh-text-muted">
                        {stat.label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-bh-text">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="border-t border-bh-border/80 px-4 py-2.5 text-xs text-bh-text-muted sm:px-5">
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border/90 bg-bh-surface px-4 py-3.5 text-sm shadow-[0_6px_20px_rgba(7,29,48,0.04)] sm:px-5">
          <p className="font-medium text-bh-text-secondary">
            Page {page} of {totalPages}
            <span className="text-bh-text-muted"> · {total} organizations</span>
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="inline-flex h-9 items-center rounded-full border border-bh-border bg-white px-3.5 text-sm font-semibold text-bh-text shadow-sm transition hover:-translate-y-0.5 hover:bg-bh-subtle"
                href={`/admin/organizations?${qs.toString()}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                className="inline-flex h-9 items-center rounded-full bg-bh-sidebar px-3.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.2)] transition hover:-translate-y-0.5 hover:bg-bh-sidebar-raised"
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
