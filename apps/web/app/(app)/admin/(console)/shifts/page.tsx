import { Building2, CalendarDays, Users } from 'lucide-react';
import Link from 'next/link';

import {
  ActiveShiftsFilterForm,
  ActiveShiftsTable,
} from '@/components/admin/active-shifts-monitor';
import { EmptyState } from '@/components/empty-state';
import {
  buildAdminShiftsQueryString,
  loadAdminShiftsMonitor,
  type AdminShiftMonitorParams,
} from '@/lib/admin/active-shifts';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { formatDateTime } from '@/lib/format';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';

async function loadOrgOptions(): Promise<Array<{ id: string; name: string }>> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from('organizations')
      .select('id, display_name')
      .order('display_name', { ascending: true })
      .limit(500);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.display_name as string) || 'Organization',
    }));
  } catch {
    return [];
  }
}

function MetricCard({
  label,
  value,
  icon: Icon,
  unavailable,
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
  unavailable?: boolean;
}) {
  return (
    <div className="rounded-[1.1rem] border border-bh-border/80 bg-gradient-to-b from-bh-surface to-bh-subtle/25 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <div className="flex items-center gap-2 text-bh-text-muted">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-bold tracking-tight tabular-nums',
          unavailable ? 'text-bh-text-muted' : 'text-bh-text',
        )}
      >
        {unavailable ? '—' : value}
      </p>
    </div>
  );
}

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<AdminShiftMonitorParams>;
}) {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return (
      <EmptyState
        title="Permission denied"
        description="Only platform super admins can view the cross-organization shift monitor."
      />
    );
  }

  const params = await searchParams;
  const [result, orgOptions] = await Promise.all([
    loadAdminShiftsMonitor(params),
    loadOrgOptions(),
  ]);

  const qs = buildAdminShiftsQueryString(params);
  const exportHref = `/api/admin/shifts/export${qs}`;

  if (!result.ok) {
    return (
      <div className="space-y-6 bh-fade-up">
        <header className="relative overflow-hidden rounded-[1.35rem] border border-bh-border/90 bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
          <div
            aria-hidden
            className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
          />
          <div className="relative px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
              Bridge Hive · Operations
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text">
              Active shifts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-bh-text-secondary">
              Published shifts across all organizations.
            </p>
          </div>
        </header>
        <EmptyState
          title="Unable to load shifts"
          description={result.error}
        />
        <div className="flex gap-2">
          <Link
            href={`/admin/shifts${qs}`}
            className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold shadow-sm hover:bg-bh-subtle"
          >
            Retry
          </Link>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageLinks = {
    prev:
      result.page > 1
        ? `/admin/shifts${buildAdminShiftsQueryString(params, {
            page: String(result.page - 1),
          })}`
        : null,
    next:
      result.page < totalPages
        ? `/admin/shifts${buildAdminShiftsQueryString(params, {
            page: String(result.page + 1),
          })}`
        : null,
  };

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
              Bridge Hive · Operations
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text sm:text-[2.15rem]">
              Active shifts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-bh-text-secondary">
              Published shifts across all organizations. Read-only monitor —
              one row per shift.
            </p>
          </div>
          <div className="text-right text-xs text-bh-text-muted">
            <p>Last refreshed</p>
            <p className="mt-0.5 font-semibold text-bh-text-secondary">
              {formatDateTime(result.refreshedAt)}
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Matching filter totals">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
          Matching filters (all pages)
        </p>
        {result.truncated ? (
          <p
            role="status"
            className="mb-3 rounded-xl border border-bh-honey/35 bg-bh-honey-soft/70 px-3.5 py-2.5 text-sm text-bh-honey-strong"
          >
            Results exceed the safe load/export cap of 5,000 matching shifts.
            Metrics and Excel/CSV cover at most that cap — refine filters (org,
            date, view) before treating this as the full dataset.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Shifts"
            value={result.aggregates.shiftCount}
            icon={CalendarDays}
          />
          <MetricCard
            label="Organizations"
            value={result.aggregates.organizationCount}
            icon={Building2}
          />
          <MetricCard
            label="Required slots"
            value={result.aggregates.requiredSlots}
            icon={Users}
          />
          <MetricCard
            label="Occupied slots"
            value={result.aggregates.occupiedSlots}
            icon={Users}
          />
          <MetricCard
            label="Unfilled slots"
            value={result.aggregates.unfilledSlots}
            icon={Users}
          />
        </div>
      </section>

      <ActiveShiftsFilterForm params={params} orgOptions={orgOptions} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-bh-text-secondary">
        <p>
          Showing{' '}
          <span className="font-semibold text-bh-text">{result.rows.length}</span>{' '}
          of{' '}
          <span className="font-semibold text-bh-text">{result.total}</span>{' '}
          matching shifts
          {params.org ? ' for selected organization' : ''}
        </p>
        <p>
          Page {result.page} of {totalPages}
        </p>
      </div>

      <ActiveShiftsTable rows={result.rows} exportHref={exportHref} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border/90 bg-bh-surface px-4 py-3.5 text-sm shadow-[0_6px_20px_rgba(7,29,48,0.04)]">
        <div className="text-bh-text-secondary">
          View: <span className="font-semibold text-bh-text">{result.view}</span>
        </div>
        <div className="flex gap-2">
          {pageLinks.prev ? (
            <Link
              href={pageLinks.prev}
              className="inline-flex h-9 items-center rounded-full border border-bh-border bg-white px-3.5 text-sm font-semibold shadow-sm hover:bg-bh-subtle"
            >
              Previous
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-full border border-bh-border/60 px-3.5 text-sm text-bh-text-muted">
              Previous
            </span>
          )}
          {pageLinks.next ? (
            <Link
              href={pageLinks.next}
              className="inline-flex h-9 items-center rounded-full border border-bh-border bg-white px-3.5 text-sm font-semibold shadow-sm hover:bg-bh-subtle"
            >
              Next
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-full border border-bh-border/60 px-3.5 text-sm text-bh-text-muted">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
