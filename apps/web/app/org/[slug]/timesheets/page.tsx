import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  UserRound,
} from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import {
  OrgTableHeadCell,
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
import { PageHeader } from '@/components/org/page-header';
import { Badge } from '@/components/ui/badge';
import { requireOrgMembership } from '@/lib/auth';
import { formatDateTime, formatDurationMinutes, roleLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export default async function TimesheetsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canOperate) {
    return (
      <EmptyState
        title="Organization not active"
        description="Timesheet review unlocks after activation."
      />
    );
  }

  if (!ctx.capabilities.canReviewTimesheets) {
    redirect(`/org/${slug}/dashboard`);
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('shift_assignments')
    .select(
      `
      id,
      worker_id,
      status,
      timesheet:timesheets(id, status, submitted_minutes, approved_minutes, submitted_at, updated_at),
      shift:shifts!inner(
        id,
        title,
        starts_at,
        required_role,
        organization_id,
        location:locations(name)
      ),
      worker:worker_profiles!shift_assignments_worker_id_fkey(user_id, worker_role)
    `,
    )
    .eq('shift.organization_id', ctx.org.id)
    .not('status', 'in', '(withdrawn,cancelled)')
    .order('updated_at', { ascending: false });

  const items = (rows ?? [])
    .map((row) => {
      const timesheet = Array.isArray(row.timesheet) ? row.timesheet[0] : row.timesheet;
      const shift = Array.isArray(row.shift) ? row.shift[0] : row.shift;
      const worker = Array.isArray(row.worker) ? row.worker[0] : row.worker;
      if (!timesheet || !shift) return null;
      return { timesheet, shift, worker, assignmentId: row.id };
    })
    .filter(Boolean)
    .filter(
      (item) =>
        item!.timesheet.status === 'submitted' ||
        item!.timesheet.status === 'approved' ||
        item!.timesheet.status === 'rejected',
    )
    .sort((a, b) => {
      const rank = (s: string) => (s === 'submitted' ? 0 : s === 'rejected' ? 1 : 2);
      return rank(a!.timesheet.status) - rank(b!.timesheet.status);
    });

  const awaiting = items.filter((i) => i!.timesheet.status === 'submitted');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        subtitle="Review submitted hours for organization shifts."
      />

      {awaiting.length === 0 && items.length === 0 ? (
        <EmptyState
          title="No timesheets are waiting for review"
          description="Submitted timesheets will appear here for approve or reject."
        />
      ) : (
        <OrgTableShell>
          <table className="w-full text-left text-sm">
            <thead className={orgTableHeadClassName}>
              <tr>
                <OrgTableHeadCell icon={ClipboardList} label="Shift" />
                <OrgTableHeadCell icon={CalendarDays} label="When" />
                <OrgTableHeadCell icon={UserRound} label="Worker" />
                <OrgTableHeadCell icon={Clock3} label="Minutes" />
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const { timesheet, shift, worker } = item!;
                const location = Array.isArray(shift.location)
                  ? shift.location[0]
                  : shift.location;
                const locationName =
                  location && typeof location === 'object' && 'name' in location
                    ? (location as { name: string }).name
                    : '—';
                const workerRole =
                  worker && typeof worker === 'object' && 'worker_role' in worker
                    ? roleLabel((worker as { worker_role: string }).worker_role)
                    : '—';
                const workerId =
                  worker && typeof worker === 'object' && 'user_id' in worker
                    ? String((worker as { user_id: string }).user_id).slice(0, 8)
                    : null;
                const initial = (
                  (shift.title || locationName || 'T').trim()[0] ?? 'T'
                ).toUpperCase();

                return (
                  <tr key={timesheet.id} className={orgTableRowClassName}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bh-teal-soft text-sm font-semibold text-bh-teal-strong ring-1 ring-bh-teal/15"
                          aria-hidden
                        >
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-bh-text">
                            {shift.title || 'Untitled'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-bh-text-muted">
                            {locationName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-bh-text-secondary">
                      {formatDateTime(shift.starts_at)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-subtle px-2.5 py-1 text-xs font-medium text-bh-text">
                        <UserRound className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                        {workerRole}
                        {workerId ? (
                          <span className="text-bh-text-muted">· {workerId}…</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="bh-tabular px-4 py-4 font-medium text-bh-text">
                      {formatDurationMinutes(
                        timesheet.approved_minutes ?? timesheet.submitted_minutes,
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          timesheet.status === 'submitted'
                            ? 'warning'
                            : timesheet.status === 'approved'
                              ? 'success'
                              : timesheet.status === 'rejected'
                                ? 'danger'
                                : 'muted'
                        }
                      >
                        {timesheet.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/org/${slug}/shifts/${shift.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-sm font-medium text-bh-text transition-colors hover:border-bh-teal hover:bg-bh-teal-soft hover:text-bh-teal-strong group-hover:border-bh-teal/40"
                      >
                        {timesheet.status === 'submitted' ? 'Review' : 'View'}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </OrgTableShell>
      )}
    </div>
  );
}
