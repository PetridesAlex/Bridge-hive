import {
  ArrowLeftRight,
  Building2,
  ClipboardCheck,
  FileSearch,
  Shield,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  auditActionLabel,
  safeAuditMetadata,
} from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

const fieldClass =
  'h-11 w-full rounded-xl border border-bh-border bg-bh-subtle/50 px-3 text-sm text-bh-text outline-none transition focus:border-bh-teal focus:ring-2 focus:ring-bh-teal/20';

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity?: string;
    range?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewAudit) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view platform audit events."
      />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = await createClient();

  let query = supabase
    .from('audit_events')
    .select(
      'id, actor_user_id, organization_id, entity_type, entity_id, action, before, after, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.action) {
    query = query.eq('action', params.action);
  }
  if (params.entity) {
    query = query.eq('entity_type', params.entity);
  }

  const rangeDays =
    params.range === '7'
      ? 7
      : params.range === '90'
        ? 90
        : params.range === '30'
          ? 30
          : null;
  if (rangeDays) {
    const since = new Date(
      Date.now() - rangeDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte('created_at', since);
  }

  const { data: events, count, error } = await query;

  const actorIds = Array.from(
    new Set((events ?? []).map((e) => e.actor_user_id).filter(Boolean)),
  ) as string[];

  const { data: actors } = actorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const actorMap = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  const filterQuery = Object.fromEntries(
    Object.entries(params).filter(([k, v]) => k !== 'page' && Boolean(v)),
  );

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[1.35rem] border border-bh-border/90 bg-bh-surface shadow-[0_10px_40px_rgba(7,29,48,0.06)]">
        <div
          aria-hidden
          className="h-1.5 bg-gradient-to-r from-bh-sidebar via-bh-teal to-bh-honey"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
              Oversight
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-bh-text">
              Audit log
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-bh-text-secondary">
              Immutable history of sensitive platform actions. Secrets, bank
              details, and storage paths are never shown.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-subtle/80 px-3.5 py-1.5 text-xs font-semibold text-bh-text-secondary">
            <Shield className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
            {count != null ? `${count} events` : 'Filtered view'}
          </span>
        </div>
      </header>

      <form className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-bh-sidebar via-bh-sidebar-raised to-bh-teal"
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Action
            </span>
            <select
              name="action"
              defaultValue={params.action ?? ''}
              className={fieldClass}
              aria-label="Action filter"
            >
              <option value="">All actions</option>
              <option value="submit_credential">Submitted credential</option>
              <option value="verify_credential_approve">
                Approved credential
              </option>
              <option value="verify_credential_reject">
                Rejected credential
              </option>
              <option value="set_worker_verification">
                Worker verification
              </option>
              <option value="suspend_account">Suspend account</option>
              <option value="reactivate_account">Reactivate account</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Entity
            </span>
            <select
              name="entity"
              defaultValue={params.entity ?? ''}
              className={fieldClass}
              aria-label="Entity type"
            >
              <option value="">All entities</option>
              <option value="credential">Credential</option>
              <option value="worker_profile">Worker profile</option>
              <option value="profile">Profile</option>
              <option value="shift_assignment">Shift assignment</option>
              <option value="payout_account">Payout account</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Range
            </span>
            <select
              name="range"
              defaultValue={params.range ?? ''}
              className={fieldClass}
              aria-label="Date range"
            >
              <option value="">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 w-full rounded-full bg-bh-sidebar px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition hover:bg-bh-sidebar-raised"
            >
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <EmptyState title="Unable to load audit events" />
      ) : !events?.length ? (
        <EmptyState
          title="No audit events"
          description="Try widening filters or date range."
        />
      ) : (
        <section className="overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
          <div
            aria-hidden
            className="h-1 bg-gradient-to-r from-bh-teal via-bh-sidebar to-bh-honey"
          />
          <div className="border-b border-bh-border/80 bg-gradient-to-b from-bh-subtle/80 to-bh-surface px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
              Timeline
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-bh-text">
              Recent platform actions
            </h2>
          </div>
          <ul className="divide-y divide-bh-border/70">
            {events.map((event) => {
              const before = safeAuditMetadata(event.before);
              const after = safeAuditMetadata(event.after);
              const actorName = event.actor_user_id
                ? (actorMap.get(event.actor_user_id) ??
                  `${event.actor_user_id.slice(0, 8)}…`)
                : 'System';
              const tone = actionTone(event.action);

              return (
                <li
                  key={event.id}
                  className="px-4 py-4 transition-colors hover:bg-bh-subtle/40 sm:px-5"
                >
                  <div className="flex gap-3.5">
                    <span
                      className={cn(
                        'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1',
                        tone.iconWrap,
                      )}
                    >
                      <tone.Icon className="h-5 w-5" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-bold tracking-tight text-bh-text">
                            {auditActionLabel(event.action)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-subtle px-2.5 py-1 text-[11px] font-semibold text-bh-text-secondary">
                              <UserRound className="h-3 w-3" aria-hidden />
                              {actorName}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-bh-info-soft px-2.5 py-1 text-[11px] font-semibold text-bh-info">
                              {entityLabel(event.entity_type)}
                            </span>
                            {event.entity_id ? (
                              <span className="font-mono text-[11px] text-bh-text-muted">
                                {event.entity_id.slice(0, 8)}…
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <time className="shrink-0 rounded-full border border-bh-border bg-bh-surface px-2.5 py-1 text-[11px] font-semibold text-bh-text-secondary">
                          {formatDateTime(event.created_at)}
                        </time>
                      </div>

                      {before || after ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {before ? (
                            <MetadataCard title="Before" data={before} />
                          ) : null}
                          {after ? (
                            <MetadataCard title="After" data={after} />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-bh-text-secondary">
        <p className="font-medium">
          Page {page}
          {count != null ? ` · ${count} total` : ''}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/audit?${new URLSearchParams({
                ...filterQuery,
                page: String(page - 1),
              }).toString()}`}
              className="inline-flex h-10 items-center rounded-full border border-bh-border bg-bh-surface px-4 text-sm font-semibold text-bh-text shadow-sm transition hover:border-bh-teal/35 hover:bg-bh-teal-soft/40"
            >
              Previous
            </Link>
          ) : null}
          {count != null && page * PAGE_SIZE < count ? (
            <Link
              href={`/admin/audit?${new URLSearchParams({
                ...filterQuery,
                page: String(page + 1),
              }).toString()}`}
              className="inline-flex h-10 items-center rounded-full border border-bh-border bg-bh-surface px-4 text-sm font-semibold text-bh-text shadow-sm transition hover:border-bh-teal/35 hover:bg-bh-teal-soft/40"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetadataCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-bh-border/80 bg-bh-subtle/50 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
        {title}
      </p>
      <dl className="mt-2 space-y-1.5">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
          >
            <dt className="text-[11px] font-semibold text-bh-text-secondary">
              {formatKey(key)}
            </dt>
            <dd className="max-w-full break-all text-right text-xs font-medium text-bh-text">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatKey(key: string) {
  return key.replaceAll('_', ' ');
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function entityLabel(type: string) {
  return type.replaceAll('_', ' ');
}

function actionTone(action: string): {
  Icon: typeof ClipboardCheck;
  iconWrap: string;
} {
  if (
    action.includes('approve') ||
    action.includes('verify') ||
    action.includes('activate') ||
    action.includes('reactivate')
  ) {
    return {
      Icon: ClipboardCheck,
      iconWrap: 'bg-bh-success-soft text-bh-success ring-bh-success/25',
    };
  }
  if (
    action.includes('reject') ||
    action.includes('suspend') ||
    action.includes('revoke')
  ) {
    return {
      Icon: ShieldAlert,
      iconWrap: 'bg-bh-danger-soft text-bh-danger ring-bh-danger/25',
    };
  }
  if (action.includes('org') || action.includes('organization')) {
    return {
      Icon: Building2,
      iconWrap: 'bg-bh-honey-soft text-bh-honey-strong ring-bh-honey/30',
    };
  }
  if (action.includes('payout') || action.includes('credential')) {
    return {
      Icon: FileSearch,
      iconWrap: 'bg-bh-teal-soft text-bh-teal-strong ring-bh-teal/25',
    };
  }
  return {
    Icon: ArrowLeftRight,
    iconWrap: 'bg-bh-info-soft text-bh-info ring-bh-info/20',
  };
}
