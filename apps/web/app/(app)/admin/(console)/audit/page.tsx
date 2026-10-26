import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  auditActionLabel,
  safeAuditMetadata,
} from '@/lib/admin/labels';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const PAGE_SIZE = 50;

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
    params.range === '7' ? 7 : params.range === '90' ? 90 : params.range === '30' ? 30 : null;
  if (rangeDays) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Audit log</h2>
        <p className="mt-1 text-sm text-slate-600">
          Immutable history of sensitive platform and operational actions. Secrets and
          private paths are not rendered.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select
          name="action"
          defaultValue={params.action ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Action filter"
        >
          <option value="">All actions</option>
          <option value="submit_credential">Submitted credential</option>
          <option value="verify_credential_approve">Approved credential</option>
          <option value="verify_credential_reject">Rejected credential</option>
          <option value="set_worker_verification">Worker verification</option>
          <option value="suspend_account">Suspend account</option>
          <option value="reactivate_account">Reactivate account</option>
        </select>
        <select
          name="entity"
          defaultValue={params.entity ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Entity type"
        >
          <option value="">All entities</option>
          <option value="credential">Credential</option>
          <option value="worker_profile">Worker profile</option>
          <option value="profile">Profile</option>
          <option value="shift_assignment">Shift assignment</option>
        </select>
        <select
          name="range"
          defaultValue={params.range ?? ''}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Date range"
        >
          <option value="">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Apply filters
        </button>
      </form>

      {error ? (
        <EmptyState title="Unable to load audit events" />
      ) : !events?.length ? (
        <EmptyState
          title="No audit events"
          description="Try widening filters or date range."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {events.map((event) => {
            const before = safeAuditMetadata(event.before);
            const after = safeAuditMetadata(event.after);
            const actorName = event.actor_user_id
              ? actorMap.get(event.actor_user_id) ?? event.actor_user_id.slice(0, 8) + '…'
              : 'System';
            return (
              <li key={event.id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {auditActionLabel(event.action)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Actor: {actorName} · {event.entity_type}
                      {event.entity_id ? ` · ${event.entity_id.slice(0, 8)}…` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(event.created_at)}
                  </p>
                </div>
                {before || after ? (
                  <p className="text-xs text-slate-600">
                    {before ? `Before: ${JSON.stringify(before)}` : null}
                    {before && after ? ' · ' : null}
                    {after ? `After: ${JSON.stringify(after)}` : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Showing page {page}
          {count != null ? ` · ${count} total` : ''}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/audit?${new URLSearchParams({
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
              href={`/admin/audit?${new URLSearchParams({
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
