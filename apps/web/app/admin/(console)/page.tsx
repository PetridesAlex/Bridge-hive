import {
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
  'rounded-2xl border border-bh-border bg-bh-surface shadow-[0_4px_16px_rgba(7,29,48,0.04)]';

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
            Bridge Hive · Platform Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-bh-text">
            Dashboard
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-bh-text-secondary">
            Live queues for organization review and worker verification — kept
            separate so nothing gets mixed.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-bh-border bg-bh-surface px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary shadow-sm">
          Last 30 days
        </span>
      </div>

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
        <div className={cn(CARD, 'p-5 lg:col-span-2')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-bh-text">
                Platform activity
              </h2>
              <p className="text-sm text-bh-text-secondary">
                New organizations, worker profiles, and audit events by week
              </p>
            </div>
          </div>
          <AdminActivityChart buckets={activityBuckets} />
        </div>

        <div className={cn(CARD, 'p-5')}>
          <h2 className="text-lg font-semibold text-bh-text">System health</h2>
          <p className="mt-1 text-sm text-bh-text-secondary">
            Request-time checks for this page load — not external uptime SLOs.
          </p>
          <ul className="mt-5 space-y-3">
            <li className="flex items-center justify-between gap-3 rounded-xl border border-bh-border bg-bh-subtle/40 px-3.5 py-3">
              <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-bh-text">
                <Database className="h-4 w-4 text-bh-teal-strong" aria-hidden />
                Database
              </span>
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wide',
                  health.database ? 'text-bh-success' : 'text-bh-danger',
                )}
              >
                {health.database ? 'OK' : 'Error'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-xl border border-bh-border bg-bh-subtle/40 px-3.5 py-3">
              <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-bh-text">
                <ShieldCheck className="h-4 w-4 text-bh-teal-strong" aria-hidden />
                Auth session
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-bh-success">
                OK
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-xl border border-bh-border bg-bh-subtle/40 px-3.5 py-3">
              <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-bh-text">
                <CheckCircle2 className="h-4 w-4 text-bh-text-muted" aria-hidden />
                Storage
              </span>
              <span className="text-xs font-semibold text-bh-text-muted">
                Not probed
              </span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-bh-text-muted">
            Platform · Bridge Hive admin console
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className={cn(CARD, 'overflow-hidden lg:col-span-3')}>
          <div className="flex items-center justify-between gap-2 border-b border-bh-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-bh-text">
                Recent organizations
              </h2>
              <p className="text-sm text-bh-text-secondary">
                Newest directory entries
              </p>
            </div>
            {ctx.capabilities.canManageOrganizations ? (
              <Link
                href="/admin/organizations"
                className="text-sm font-semibold text-bh-teal-strong hover:underline"
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
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-bh-border bg-bh-subtle/50 text-xs uppercase tracking-wide text-bh-text-muted">
                    <th className="px-5 py-3 font-semibold">Organization</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrgRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-bh-border/70 last:border-0"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/organizations/${row.id}`}
                          className="font-semibold text-bh-text hover:text-bh-teal-strong hover:underline"
                        >
                          {row.display_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-bh-text-muted">
                          {row.legal_name}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-bh-text-secondary">
                        {ORGANIZATION_TYPE_LABELS[row.organization_type] ??
                          row.organization_type}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge variant={orgStatusVariant(row.status)}>
                          {ORG_STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-bh-text-muted">
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
            <div className="border-t border-bh-border bg-bh-subtle/30 px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-bh-text">
                  Submission notices
                </p>
                {unreadOrgNotifs.length > 0 ? (
                  <form action={markOrgSubmittedNotificationsReadAction}>
                    <Button type="submit" size="sm" variant="outline">
                      Mark notices read
                    </Button>
                  </form>
                ) : null}
              </div>
              <ul className="space-y-1.5">
                {(orgSubmittedNotifs.data ?? []).slice(0, 3).map((n) => (
                  <li key={n.id} className="text-sm text-bh-text-secondary">
                    <Link
                      href="/admin/organizations?status=under_review&sort=oldest"
                      className="font-medium text-bh-honey-strong hover:underline"
                    >
                      {n.title}
                    </Link>
                    <span className="text-bh-text-muted">
                      {' '}
                      · {formatDateTime(n.created_at)}
                      {n.read_at ? '' : ' · unread'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className={cn(CARD, 'lg:col-span-2')}>
          <div className="flex items-center justify-between gap-2 border-b border-bh-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-bh-text">
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
                <li key={event.id} className="flex gap-3 px-5 py-3.5">
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
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
