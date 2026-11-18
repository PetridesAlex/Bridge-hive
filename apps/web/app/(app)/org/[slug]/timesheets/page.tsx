import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eye,
  MapPin,
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
      timesheet:timesheets!inner(id, status, submitted_minutes, approved_minutes, submitted_at, updated_at),
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
    .in('timesheet.status', ['submitted', 'approved', 'rejected'])
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
        eyebrow="Operations"
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
                const whenRaw = formatDateTime(shift.starts_at);
                const whenSplit = whenRaw.lastIndexOf(', ');
                const whenDate = whenSplit > 0 ? whenRaw.slice(0, whenSplit) : whenRaw;
                const whenTime = whenSplit > 0 ? whenRaw.slice(whenSplit + 2) : '';
                const initial = (
                  (shift.title || locationName || 'T').trim()[0] ?? 'T'
                ).toUpperCase();

                return (
                  <tr key={timesheet.id} className={orgTableRowClassName}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#071d30] text-base font-bold text-[#5ec8ff] shadow-[0_6px_14px_rgba(7,29,48,0.2)]"
                          aria-hidden
                        >
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold tracking-tight text-bh-text">
                            {shift.title || 'Untitled'}
                          </p>
                          <p className="mt-1 inline-flex max-w-[16rem] items-center gap-1 rounded-full bg-bh-teal-soft px-2 py-0.5 text-xs font-semibold text-bh-teal-strong">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{locationName}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bh-subtle text-bh-teal-strong ring-1 ring-bh-border">
                          <CalendarDays className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="leading-tight">
                          <p className="font-semibold text-bh-text">{whenDate}</p>
                          {whenTime ? (
                            <p className="bh-tabular mt-0.5 text-xs font-medium text-bh-text-muted">
                              {whenTime}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="inline-flex items-center gap-2.5 rounded-xl border border-bh-border bg-bh-surface py-1.5 pl-1.5 pr-3 shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-bh-teal-soft text-bh-teal-strong">
                          <UserRound className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="leading-tight">
                          <p className="text-sm font-semibold text-bh-text">{workerRole}</p>
                          {workerId ? (
                            <p className="mt-0.5 font-mono text-[11px] text-bh-text-muted">
                              #{workerId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bh-tabular inline-flex items-center gap-1.5 rounded-lg bg-bh-subtle px-2.5 py-1.5 text-sm font-bold text-bh-text ring-1 ring-bh-border">
                        <Clock3 className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                        {formatDurationMinutes(
                          timesheet.approved_minutes ?? timesheet.submitted_minutes,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {timesheet.status === 'approved' ? (
                        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#16a34a_0%,#15803d_100%)] py-1 pl-2 pr-3 text-xs font-bold capitalize tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_16px_rgba(22,163,74,0.4)] ring-1 ring-[#14532d]/20 transition-shadow duration-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_22px_rgba(22,163,74,0.55)]">
                          <span className="relative grid h-4 w-4 place-items-center">
                            <span
                              aria-hidden
                              className="absolute inset-0 animate-ping rounded-full bg-white/60 motion-reduce:animate-none"
                            />
                            <CheckCircle2
                              className="relative h-4 w-4"
                              strokeWidth={2.6}
                              aria-hidden
                            />
                          </span>
                          Approved
                        </span>
                      ) : (
                        <Badge
                          variant={
                            timesheet.status === 'submitted'
                              ? 'warning'
                              : timesheet.status === 'rejected'
                                ? 'danger'
                                : 'muted'
                          }
                        >
                          {timesheet.status.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {timesheet.status === 'submitted' ? (
                        <Link
                          href={`/org/${slug}/shifts/${shift.id}?tab=timesheets`}
                          className="group/btn inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#071d30] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(7,29,48,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-honey motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        >
                          <ClipboardCheck className="h-4 w-4 text-[#e4b334]" aria-hidden />
                          Review hours
                          <ArrowUpRight
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                      ) : (
                        <Link
                          href={`/org/${slug}/shifts/${shift.id}${timesheet.status === 'approved' || timesheet.status === 'rejected' ? '?tab=timesheets' : ''}`}
                          className="group/btn inline-flex min-h-10 items-center gap-2 rounded-xl border-2 border-[#16384f]/20 bg-white px-4 text-sm font-semibold text-[#071d30] transition-all duration-200 hover:-translate-y-0.5 hover:border-bh-teal hover:bg-bh-teal-soft hover:text-bh-teal-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          View
                          <ArrowUpRight
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                      )}
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
