import {
  RECRUITMENT_PLATFORM_STATUS_LABELS,
  WORKER_ROLE_LABELS,
  type RecruitmentPlatformStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BH';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function statusBadgeVariant(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'available') return 'success';
  if (status === 'received' || status === 'under_review') return 'warning';
  if (status === 'rejected' || status === 'withdrawn') return 'danger';
  return 'muted';
}

export default async function AdminRecruitmentPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canReviewRecruitment) {
    redirect('/admin');
  }

  const supabase = asUntypedDb(await createClient());
  const { data: candidates, error } = await supabase
    .from('recruitment_candidates')
    .select(
      'id, full_name, email_normalized, role, platform_status, submitted_at, current_location',
    )
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <EmptyState
        title="Recruitment queue unavailable"
        description="Apply migration 029 on this environment before reviewing submissions."
      />
    );
  }

  const rows = candidates ?? [];
  const received = rows.filter(
    (r) =>
      r.platform_status === 'received' || r.platform_status === 'under_review',
  ).length;
  const available = rows.filter((r) => r.platform_status === 'available').length;
  const pendingReviewShare =
    rows.length === 0 ? 0 : Math.round((received / rows.length) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="overflow-hidden rounded-2xl border border-bh-border/90 bg-bh-surface shadow-[0_10px_36px_rgba(7,29,48,0.07)]">
        <div className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey" />
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-bh-teal/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-bh-honey/15 blur-2xl"
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
            Recruitment
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-bh-text">
                Talent submissions
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-bh-text-secondary">
                Review candidate applications and set global availability for
                enabled organizations.
              </p>
            </div>
            <div className="rounded-full border border-bh-border/80 bg-bh-subtle/70 px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              {rows.length} in queue
              {received > 0 ? (
                <span className="ml-2 text-bh-honey-strong">
                  · {received} need review
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total submissions"
          value={rows.length}
          hint="All applications in queue"
          accent="navy"
          meter={100}
        />
        <StatCard
          label="Received / pending"
          value={received}
          hint="Awaiting platform review"
          accent="honey"
          meter={pendingReviewShare}
        />
        <StatCard
          label="Available to orgs"
          value={available}
          hint="Live in organization talent pools"
          accent="teal"
          meter={
            rows.length === 0
              ? 0
              : Math.round((available / rows.length) * 100)
          }
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Public applications to /recruitment/apply will appear here."
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
          <div className="h-1 bg-gradient-to-r from-bh-teal via-bh-sidebar to-bh-honey" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
                Candidates
              </p>
              <p className="mt-0.5 text-sm text-bh-text-secondary">
                Newest submissions first · open a row to review
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-honey-soft px-2.5 py-1 text-bh-honey-strong">
                <span className="h-1.5 w-1.5 rounded-full bg-bh-honey-strong" />
                Pending
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Available
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-bh-subtle/70 text-[11px] uppercase tracking-[0.12em] text-bh-text-muted">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Candidate</th>
                  <th className="px-4 py-3.5 font-semibold">Role</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Submitted</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const name = row.full_name as string;
                  const status = String(row.platform_status);
                  const isPending =
                    status === 'received' || status === 'under_review';
                  return (
                    <tr
                      key={row.id as string}
                      className={cn(
                        'group border-t border-bh-border/80 transition-colors hover:bg-bh-subtle/55',
                        isPending && 'bg-bh-honey-soft/25',
                        index === 0 && 'border-t-0',
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-bh-sidebar via-bh-teal to-bh-honey text-[11px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(11,42,67,0.2)]"
                          >
                            {initialsFromName(name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-bh-text">
                              {name}
                            </p>
                            <p className="truncate text-xs text-bh-text-muted">
                              {(row.current_location as string) ||
                                (row.email_normalized as string)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-bh-text">
                        <span className="inline-flex rounded-full border border-bh-border/80 bg-bh-subtle/80 px-2.5 py-1 text-xs font-medium text-bh-text-secondary">
                          {row.role
                            ? (WORKER_ROLE_LABELS[row.role as WorkerRole] ??
                              String(row.role))
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusBadgeVariant(status)}>
                          {RECRUITMENT_PLATFORM_STATUS_LABELS[
                            row.platform_status as RecruitmentPlatformStatus
                          ] ?? status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-bh-text-secondary">
                        {new Date(row.submitted_at as string).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/recruitment/${row.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-bh-sidebar px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(11,42,67,0.22)] transition hover:bg-bh-sidebar-raised group-hover:translate-x-0.5"
                        >
                          Review
                          <span aria-hidden>→</span>
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
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
  meter,
}: {
  label: string;
  value: number;
  hint: string;
  accent: 'navy' | 'honey' | 'teal';
  meter: number;
}) {
  const bar =
    accent === 'honey'
      ? 'from-bh-honey via-bh-honey-strong to-bh-sidebar'
      : accent === 'teal'
        ? 'from-bh-teal via-bh-teal-strong to-bh-sidebar'
        : 'from-bh-sidebar via-bh-sidebar-raised to-bh-teal';

  const glow =
    accent === 'honey'
      ? 'bg-bh-honey/20'
      : accent === 'teal'
        ? 'bg-bh-teal/15'
        : 'bg-bh-sidebar/10';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bh-border/90 bg-bh-surface px-4 py-4 shadow-[0_6px_22px_rgba(7,29,48,0.04)]">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', bar)} />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl',
          glow,
        )}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums tracking-tight text-bh-text">
        {value}
      </p>
      <p className="mt-1 text-xs text-bh-text-secondary">{hint}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bh-subtle">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r', bar)}
          style={{ width: `${Math.min(100, Math.max(0, meter))}%` }}
        />
      </div>
    </div>
  );
}
