import {
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import {
  AdminActivityChart,
  type ActivityWeekBucket,
} from '@/components/admin/admin-activity-chart';
import { AdminMetricCard } from '@/components/admin/admin-metric-card';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { markOrgSubmittedNotificationsReadAction } from '@/app/actions/admin-org-notifications';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { auditActionLabel } from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import {
  ORG_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type OrgStatus,
  type OrganizationType,
} from '@bridge-hive/domain';
import { cn } from '@/lib/utils';

const CARD =
  'overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function startOfUtcWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function weekLabel(weekStart: Date): string {
  return weekStart.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function buildWeekBuckets(
  orgDates: string[],
  appDates: string[],
  auditDates: string[],
  weeks = 5,
): ActivityWeekBucket[] {
  const now = new Date();
  const current = startOfUtcWeek(now);
  const buckets: ActivityWeekBucket[] = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(current);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= startMs && t < endMs;
    };
    buckets.push({
      weekStartIso: start.toISOString(),
      label: weekLabel(start),
      orgs: orgDates.filter(inRange).length,
      apps: appDates.filter(inRange).length,
      audits: auditDates.filter(inRange).length,
    });
  }
  return buckets;
}

function dailySparkline(dates: string[], days = 14): number[] {
  const now = new Date();
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);
    const startMs = day.getTime();
    const endMs = next.getTime();
    out.push(
      dates.filter((iso) => {
        const t = new Date(iso).getTime();
        return t >= startMs && t < endMs;
      }).length,
    );
  }
  return out;
}

function windowDelta(
  dates: string[],
  windowDays = 14,
): { value: number; label: string } | null {
  const now = Date.now();
  const recentStart = now - windowDays * 86400000;
  const priorStart = now - windowDays * 2 * 86400000;
  let recent = 0;
  let prior = 0;
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    if (t >= recentStart) recent += 1;
    else if (t >= priorStart) prior += 1;
  }
  if (recent === 0 && prior === 0) return null;
  return { value: recent - prior, label: `vs prior ${windowDays}d` };
}

function orgStatusVariant(
  status: OrgStatus,
): 'success' | 'warning' | 'danger' | 'muted' | 'default' {
  if (status === 'active') return 'success';
  if (status === 'under_review') return 'warning';
  if (status === 'rejected' || status === 'suspended' || status === 'closed') {
    return 'danger';
  }
  return 'muted';
}

function activityIconTone(action: string): string {
  if (action.includes('approve') || action.includes('verify') || action.includes('activate')) {
    return 'bg-bh-success-soft text-bh-success';
  }
  if (action.includes('reject') || action.includes('suspend')) {
    return 'bg-bh-danger-soft text-bh-danger';
  }
  if (action.includes('org') || action.includes('organization')) {
    return 'bg-bh-honey-soft text-bh-honey-strong';
  }
  return 'bg-bh-teal-soft text-bh-teal-strong';
}

export default async function AdminDashboardPage() {
  const ctx = await requirePlatformAdmin();
  const supabase = await createClient();
  const since30 = isoDaysAgo(30);
  const health = {
    database: true,
    auth: true,
    storage: null as boolean | null,
  };

  const [
    countsResult,
    auditsResult,
    orgReviewResult,
    recentOrgsResult,
    orgTotalResult,
    orgCreatedResult,
    workerCreatedResult,
    workerTotalResult,
    auditCreatedResult,
    credentialCountResult,
    payoutCountResult,
    orgSubmittedNotifs,
  ] = await Promise.all([
    ctx.capabilities.canViewWorkers
      ? supabase.rpc('verification_application_dashboard_counts')
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('audit_events')
      .select('id, action, entity_type, entity_id, created_at, actor_user_id')
      .order('created_at', { ascending: false })
      .limit(12),
    ctx.capabilities.canManageOrganizations
      ? supabase.rpc('list_admin_organizations', {
          p_status: 'under_review',
          p_sort: 'oldest',
          p_limit: 5,
          p_offset: 0,
        })
      : Promise.resolve({ data: null, error: null }),
    ctx.capabilities.canManageOrganizations
      ? supabase.rpc('list_admin_organizations', {
          p_sort: 'newest',
          p_limit: 6,
          p_offset: 0,
        })
      : Promise.resolve({ data: null, error: null }),
    ctx.capabilities.canManageOrganizations
      ? supabase.rpc('list_admin_organizations', {
          p_sort: 'newest',
          p_limit: 1,
          p_offset: 0,
        })
      : Promise.resolve({ data: null, error: null }),
    ctx.capabilities.canManageOrganizations
      ? supabase
          .from('organizations')
          .select('created_at')
          .gte('created_at', since30)
      : Promise.resolve({ data: null, error: null }),
    ctx.capabilities.canViewWorkers
      ? supabase
          .from('worker_profiles')
          .select('created_at')
          .gte('created_at', since30)
      : Promise.resolve({ data: null, error: null }),
    ctx.capabilities.canViewWorkers
      ? supabase
          .from('worker_profiles')
          .select('user_id', { count: 'exact', head: true })
      : Promise.resolve({ data: null, count: 0, error: null }),
    supabase
      .from('audit_events')
      .select('created_at')
      .gte('created_at', since30)
      .limit(500),
    ctx.capabilities.canViewCredentialMetadata
      ? ctx.adminRole === 'platform_support'
        ? supabase.rpc('credential_support_view')
        : supabase
            .from('credentials')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'under_review'])
      : Promise.resolve({ data: null, count: 0, error: null }),
    ctx.capabilities.canApprovePayoutAccounts || ctx.capabilities.canViewPayoutProof
      ? supabase
          .from('payout_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      : Promise.resolve({ data: null, count: 0, error: null }),
    ctx.capabilities.canManageOrganizations
      ? supabase
          .from('notifications')
          .select('id, title, body, created_at, read_at')
          .eq('type', 'org_submitted')
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (countsResult.error) health.database = false;
  if (auditsResult.error) health.database = false;
  if (orgReviewResult.error || recentOrgsResult.error) health.database = false;

  const orgReviewRows = (orgReviewResult.data ?? []) as Array<{
    id: string;
    display_name: string;
    organization_type: string | null;
    last_activity: string;
    total_count: number;
  }>;
  const organizationsAwaitingReview = Number(
    orgReviewRows[0]?.total_count ?? 0,
  );

  const recentOrgRows = (recentOrgsResult.data ?? []) as Array<{
    id: string;
    display_name: string;
    legal_name: string;
    organization_type: OrganizationType;
    status: OrgStatus;
    member_count: number;
    created_at: string;
    last_activity: string;
    total_count: number;
  }>;

  const totalOrganizations = Number(
    ((orgTotalResult.data ?? []) as Array<{ total_count?: number }>)[0]
      ?.total_count ?? recentOrgRows[0]?.total_count ?? 0,
  );

  const countsRow = Array.isArray(countsResult.data)
    ? countsResult.data[0]
    : countsResult.data;
  const readyForReview = Number(
    (countsRow as { ready_for_review?: number } | null)?.ready_for_review ?? 0,
  );
  const appsUnderReview = Number(
    (countsRow as { under_review?: number } | null)?.under_review ?? 0,
  );
  const payoutPendingFromCounts = Number(
    (countsRow as { payout_approval_pending?: number } | null)
      ?.payout_approval_pending ?? 0,
  );

  let credentialCount = 0;
  if (ctx.adminRole === 'platform_support' && Array.isArray(credentialCountResult.data)) {
    credentialCount = (credentialCountResult.data as Array<{ status?: string }>).filter(
      (c) => c.status === 'pending' || c.status === 'under_review',
    ).length;
  } else {
    credentialCount = credentialCountResult.count ?? 0;
  }

  const payoutPending =
    payoutCountResult.count ?? payoutPendingFromCounts;

  const orgCreatedDates = ((orgCreatedResult.data ?? []) as Array<{ created_at: string }>).map(
    (r) => r.created_at,
  );
  const workerCreatedDates = (
    (workerCreatedResult.data ?? []) as Array<{ created_at: string }>
  ).map((r) => r.created_at);
  const auditCreatedDates = (
    (auditCreatedResult.data ?? []) as Array<{ created_at: string }>
  ).map((r) => r.created_at);

  const activityBuckets = buildWeekBuckets(
    orgCreatedDates,
    workerCreatedDates,
    auditCreatedDates,
  );
  const totalMembers = workerTotalResult.count ?? 0;
  const membersLast30 = workerCreatedDates.length;
  const orgsLast30 = orgCreatedDates.length;

  const unreadOrgNotifs = (orgSubmittedNotifs.data ?? []).filter((n) => !n.read_at);
  const recentAudits = auditsResult.data ?? [];

  const metrics = [
    ctx.capabilities.canManageOrganizations
      ? {
          key: 'orgs',
          label: 'Total organizations',
          value: totalOrganizations,
          icon: Building2,
          tone: 'teal' as const,
          href: '/admin/organizations',
          linkLabel: 'View organizations',
          subtext: 'All statuses in the platform directory',
          sparkline: dailySparkline(orgCreatedDates),
          delta: windowDelta(orgCreatedDates),
        }
      : null,
    ctx.capabilities.canViewWorkers
      ? {
          key: 'apps',
          label: 'Applications ready',
          value: readyForReview,
          icon: ClipboardCheck,
          tone: 'blue' as const,
          href: '/admin/applications?status=ready_for_review',
          linkLabel: 'Open application queue',
          subtext: `${appsUnderReview} currently under review`,
          sparkline: dailySparkline(workerCreatedDates),
          delta: windowDelta(workerCreatedDates),
        }
      : null,
    ctx.capabilities.canManageOrganizations
      ? {
          key: 'org-review',
          label: 'Orgs awaiting review',
          value: organizationsAwaitingReview,
          icon: ShieldCheck,
          tone: 'honey' as const,
          href: '/admin/organizations?status=under_review&sort=oldest',
          linkLabel: 'Open org review',
          subtext: 'Organization queue — not worker applications',
          sparkline: undefined,
          delta: null,
        }
      : null,
    ctx.capabilities.canViewCredentialMetadata
      ? {
          key: 'creds',
          label: 'Credentials awaiting review',
          value: credentialCount,
          icon: FileSearch,
          tone: 'teal' as const,
          href: '/admin/credentials',
          linkLabel: 'Open credential queue',
          subtext: 'Pending and under review documents',
          sparkline: undefined,
          delta: null,
        }
      : null,
    ctx.capabilities.canApprovePayoutAccounts ||
    ctx.capabilities.canViewPayoutProof ||
    ctx.capabilities.canViewWorkers
      ? {
          key: 'payouts',
          label: 'Payout accounts pending',
          value: payoutPending,
          icon: Wallet,
          tone: 'success' as const,
          href: '/admin/payouts',
          linkLabel: 'Open payout reviews',
          subtext: 'Awaiting platform approval',
          sparkline: undefined,
          delta: null,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-8 bh-fade-up">
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
              Bridge Hive · Platform Admin
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text sm:text-[2.15rem]">
              Dashboard
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-bh-text-secondary">
              Live queues for organization review and worker verification — kept
              separate so nothing gets mixed.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-subtle/80 px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <span className="h-1.5 w-1.5 rounded-full bg-bh-teal shadow-[0_0_0_3px_rgba(22,166,182,0.2)]" />
            Last 30 days
          </span>
        </div>
      </header>

      {metrics.length > 0 ? (
        <section
          className={cn(
            'grid gap-4 bh-fade-up-delay-1',
            metrics.length >= 5
              ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
              : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {metrics.map((m) =>
            m ? (
              <AdminMetricCard
                key={m.key}
                label={m.label}
                value={m.value}
                icon={m.icon}
                tone={m.tone}
                href={m.href}
                linkLabel={m.linkLabel}
                subtext={m.subtext}
                sparkline={m.sparkline}
                delta={m.delta}
              />
            ) : null,
          )}
        </section>
      ) : (
        <EmptyState
          title="Limited dashboard"
          description="Your role cannot view verification or organization queues."
        />
      )}

      <section className="grid gap-4 bh-fade-up-delay-2 lg:grid-cols-3">
        <div className={cn(CARD, 'lg:col-span-2')}>
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-accent-blue"
          />
          <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                  Live tracking
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
                  Business growth
                </h2>
                <p className="mt-1 text-sm text-bh-text-secondary">
                  Member registrations and organization onboarding over the last
                  30 days
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-success/25 bg-bh-success-soft px-2.5 py-1 text-[11px] font-bold text-bh-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bh-success" />
                Live
              </span>
            </div>
          </div>
          <div className="p-5">
            <AdminActivityChart
              buckets={activityBuckets}
              totalOrganizations={totalOrganizations}
              totalMembers={totalMembers}
              orgsLast30={orgsLast30}
              membersLast30={membersLast30}
            />
          </div>
        </div>

        <div className={CARD}>
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-success via-bh-teal to-bh-sidebar"
          />
          <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
              Status
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
              System health
            </h2>
            <p className="mt-1 text-sm text-bh-text-secondary">
              Request-time checks for this page load — not external uptime SLOs.
            </p>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <HealthRow
                icon={Database}
                label="Database"
                ok={health.database}
                detail={health.database ? 'OK' : 'Error'}
              />
              <HealthRow
                icon={ShieldCheck}
                label="Auth session"
                ok
                detail="OK"
              />
              <HealthRow
                icon={CheckCircle2}
                label="Storage"
                ok={null}
                detail="Not probed"
              />
            </ul>
            <p className="mt-4 text-xs text-bh-text-muted">
              Platform · Bridge Hive admin console
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className={cn(CARD, 'lg:col-span-3')}>
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-honey to-bh-teal"
          />
          <div className="flex items-center justify-between gap-2 border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                Directory
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
                Recent organizations
              </h2>
              <p className="text-sm text-bh-text-secondary">
                Newest directory entries
              </p>
            </div>
            {ctx.capabilities.canManageOrganizations ? (
              <Link
                href="/admin/organizations"
                className="inline-flex h-9 items-center rounded-full border border-bh-border bg-bh-surface px-3.5 text-sm font-semibold text-bh-teal-strong shadow-sm transition hover:border-bh-teal/35 hover:bg-bh-teal-soft/50"
              >
                View all
              </Link>
            ) : null}
          </div>

          {!ctx.capabilities.canManageOrganizations ? (
            <div className="p-5">
              <EmptyState
                title="Organizations hidden"
                description="Your role cannot manage organizations."
              />
            </div>
          ) : recentOrgRows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No organizations yet"
                description="Submitted organizations will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-bh-border bg-bh-subtle/70 text-[11px] uppercase tracking-[0.12em] text-bh-text-muted">
                    <th className="px-5 py-3.5 font-bold">Organization</th>
                    <th className="px-3 py-3.5 font-bold">Type</th>
                    <th className="px-3 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrgRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-bh-border/70 transition-colors last:border-0 hover:bg-bh-teal-soft/25"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/organizations/${row.id}`}
                          className="group flex min-w-0 items-center gap-3"
                        >
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-sidebar text-[12px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(7,29,48,0.22)] ring-1 ring-black/5"
                          >
                            {orgMark(row.display_name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-bold tracking-tight text-bh-text transition-colors group-hover:text-bh-teal-strong">
                              {row.display_name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-bh-text-muted">
                              {row.legal_name}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full bg-bh-subtle px-2.5 py-1 text-xs font-semibold text-bh-text-secondary">
                          {ORGANIZATION_TYPE_LABELS[row.organization_type] ??
                            row.organization_type}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <Badge variant={orgStatusVariant(row.status)}>
                          {ORG_STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-bh-text-secondary">
                        {formatDateTime(row.last_activity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ctx.capabilities.canManageOrganizations &&
          (orgSubmittedNotifs.data ?? []).length > 0 ? (
            <div className="relative overflow-hidden border-t border-bh-border/80 bg-gradient-to-br from-[#fff8e8]/90 via-bh-subtle/40 to-bh-surface px-5 py-5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-bh-honey/20 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-14 left-8 h-28 w-28 rounded-full bg-bh-teal/10 blur-2xl"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bh-honey to-transparent"
              />

              <div className="relative mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bh-honey via-[#c9920f] to-bh-sidebar text-bh-sidebar shadow-[0_8px_18px_rgba(224,170,24,0.35)] ring-1 ring-white/40">
                    <Bell className="h-4 w-4" aria-hidden />
                    {unreadOrgNotifs.length > 0 ? (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-bh-honey ring-2 ring-white"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
                        Live queue
                      </p>
                      {unreadOrgNotifs.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-honey px-2 py-0.5 text-[10px] font-bold tabular-nums text-bh-sidebar shadow-[0_4px_10px_rgba(224,170,24,0.35)]">
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-bh-sidebar"
                          />
                          {unreadOrgNotifs.length} unread
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-bh-border/80 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                          All caught up
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold tracking-tight text-bh-text">
                      Submission notices
                    </p>
                  </div>
                </div>
                {unreadOrgNotifs.length > 0 ? (
                  <form action={markOrgSubmittedNotificationsReadAction}>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 rounded-full border border-bh-honey/40 bg-white/90 px-3.5 text-xs font-semibold text-bh-honey-strong shadow-sm transition hover:-translate-y-0.5 hover:border-bh-honey hover:bg-bh-honey-soft hover:text-bh-sidebar"
                      variant="outline"
                    >
                      Mark notices read
                    </Button>
                  </form>
                ) : null}
              </div>

              <ul className="relative space-y-2">
                {(orgSubmittedNotifs.data ?? []).slice(0, 3).map((n, index) => {
                  const unread = !n.read_at;
                  return (
                    <li key={n.id}>
                      <Link
                        href="/admin/organizations?status=under_review&sort=oldest"
                        className={cn(
                          'group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(7,29,48,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                          unread
                            ? 'border-bh-honey/35 bg-white shadow-[0_6px_16px_rgba(224,170,24,0.12)]'
                            : 'border-bh-border/70 bg-white/70 hover:border-bh-border-strong hover:bg-white',
                        )}
                        style={{
                          animationDelay: `${index * 60}ms`,
                        }}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-y-2 left-0 w-1 rounded-full transition-opacity',
                            unread
                              ? 'bg-bh-honey shadow-[0_0_10px_rgba(224,170,24,0.55)]'
                              : 'bg-bh-teal/0 group-hover:bg-bh-teal/50',
                          )}
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition duration-700 group-hover:translate-x-full"
                        />
                        <span
                          className={cn(
                            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-300 group-hover:scale-105',
                            unread
                              ? 'bg-bh-honey-soft text-bh-honey-strong ring-bh-honey/30'
                              : 'bg-bh-subtle text-bh-text-secondary ring-bh-border/80 group-hover:bg-bh-teal-soft group-hover:text-bh-teal-strong',
                          )}
                        >
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="relative min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-sm font-semibold tracking-tight transition-colors',
                              unread
                                ? 'text-bh-text group-hover:text-bh-honey-strong'
                                : 'text-bh-text-secondary group-hover:text-bh-teal-strong',
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-bh-text-muted">
                            <time dateTime={n.created_at}>
                              {formatDateTime(n.created_at)}
                            </time>
                            {unread ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-bh-honey/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-bh-honey-strong">
                                Unread
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="relative h-4 w-4 shrink-0 text-bh-text-muted transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-bh-honey-strong"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className={cn(CARD, 'lg:col-span-2')}>
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-teal via-bh-sidebar to-bh-honey"
          />
          <div className="flex items-center justify-between gap-2 border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                Timeline
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
                Recent activity
              </h2>
              <p className="text-sm text-bh-text-secondary">Audit timeline</p>
            </div>
            <Link
              href="/admin/audit"
              className="text-sm font-semibold text-bh-teal-strong hover:underline"
            >
              View all
            </Link>
          </div>

          {recentAudits.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No audit events yet"
                description="Sensitive admin actions will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-bh-border/70">
              {recentAudits.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-bh-subtle/50"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5',
                      activityIconTone(event.action),
                    )}
                  >
                    <ClipboardCheck className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-bh-text">
                      {auditActionLabel(event.action)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-bh-text-muted">
                      {event.entity_type}
                      {event.entity_id
                        ? ` · ${event.entity_id.slice(0, 8)}…`
                        : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-bh-text-muted">
                      {formatDateTime(event.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function orgMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '·';
}

function HealthRow({
  icon: Icon,
  label,
  ok,
  detail,
}: {
  icon: typeof Database;
  label: string;
  ok: boolean | null;
  detail: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-bh-border/80 bg-gradient-to-r from-bh-subtle/70 to-bh-surface px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-bh-text">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-bh-surface text-bh-teal-strong shadow-sm ring-1 ring-bh-border/70">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {label}
      </span>
      <span
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
          ok === true && 'bg-bh-success-soft text-bh-success',
          ok === false && 'bg-bh-danger-soft text-bh-danger',
          ok === null && 'bg-bh-subtle text-bh-text-muted',
        )}
      >
        {detail}
      </span>
    </li>
  );
}
