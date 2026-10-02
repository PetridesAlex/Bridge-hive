import { credentialTypeLabel, formatMoneyMinor } from '@bridge-hive/domain';
import {
  CalendarClock,
  ClipboardList,
  MapPin,
  Stethoscope,
  Timer,
  UserRound,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
import { PermissionGuard } from '@/components/permission-guard';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import {
  formatDateTime,
  formatDurationMinutes,
  formatRate,
  roleLabel,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';

import { PublishShiftButton } from '../_components/publish-shift-button';
import { ExtendAcceptanceDeadlineForm } from '../_components/extend-acceptance-deadline-form';
import { ShiftForm } from '../_components/shift-form';
import { TimesheetReviewForm } from '../_components/timesheet-review-form';

function DetailPanel({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon: typeof MapPin;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bh-border/70 bg-gradient-to-b from-bh-subtle/70 to-bh-surface px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-teal-soft text-bh-teal-strong">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-bh-text">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-bh-text-secondary">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function MetaTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-bh-border/80 bg-bh-subtle/40 p-4 transition-colors hover:border-bh-border-strong hover:bg-bh-subtle/70',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-bh-text-muted">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold leading-6 text-bh-text">{value}</div>
      {hint ? <p className="mt-1 text-xs text-bh-text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();

  const { data: shift } = await supabase
    .from('shifts')
    .select(
      '*, location:locations(*), ward:wards(*), requirements:shift_requirements(*)',
    )
    .eq('id', id)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!shift) notFound();

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', ctx.org.id)
    .order('name');

  const { data: assignment } = await supabase
    .from('shift_assignments')
    .select(
      '*, worker:worker_profiles!shift_assignments_worker_id_fkey(user_id, worker_role), timesheet:timesheets(*)',
    )
    .eq('shift_id', shift.id)
    .not('status', 'in', '(withdrawn,cancelled)')
    .maybeSingle();

  const timesheet = Array.isArray(assignment?.timesheet)
    ? assignment?.timesheet[0]
    : assignment?.timesheet;

  const { data: payout } =
    timesheet?.status === 'approved'
      ? await supabase
          .from('payouts')
          .select('*')
          .eq('assignment_id', assignment!.id)
          .maybeSingle()
      : { data: null };

  const location =
    shift.location && typeof shift.location === 'object' && 'name' in shift.location
      ? shift.location
      : null;
  const ward =
    shift.ward && typeof shift.ward === 'object' && 'name' in shift.ward
      ? shift.ward
      : null;
  const requirements = Array.isArray(shift.requirements)
    ? shift.requirements
    : [];
  const acceptanceClosed = Boolean(
    shift.status === 'published' &&
      shift.acceptance_deadline &&
      new Date(shift.acceptance_deadline) <= new Date(),
  );
  const canExtendAcceptance =
    ctx.capabilities.canManageShifts &&
    shift.status === 'published' &&
    !assignment &&
    new Date(shift.starts_at) > new Date();

  const locationName =
    location && 'name' in location ? String(location.name) : 'Unknown location';
  const wardName = ward && 'name' in ward ? String(ward.name) : null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
        <div className="bg-gradient-to-br from-bh-teal-soft/45 via-bh-surface to-bh-honey-soft/25 px-5 py-5 sm:px-6 sm:py-6">
          <BackLink href={`/org/${slug}/shifts`} label="Shifts" className="mb-4" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-bh-text sm:text-[28px]">
                  {shift.title || roleLabel(shift.required_role)}
                </h1>
                <ShiftStatusBadge status={shift.status} />
              </div>
              <p className="flex flex-wrap items-center gap-2 text-sm text-bh-text-secondary">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-border bg-bh-surface/90 px-2.5 py-1 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                  {locationName}
                  {wardName ? ` · ${wardName}` : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-border bg-bh-surface/90 px-2.5 py-1 text-xs font-medium">
                  <Stethoscope className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                  {roleLabel(shift.required_role)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PermissionGuard
                allowed={
                  ctx.capabilities.canPublishShifts && shift.status === 'draft'
                }
              >
                <PublishShiftButton slug={slug} shiftId={shift.id} />
              </PermissionGuard>
              <PermissionGuard allowed={ctx.capabilities.canManageShifts && ctx.capabilities.canOperate}>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/org/${slug}/shifts/new/bulk?template=${shift.id}`}>
                    Duplicate to multiple dates
                  </Link>
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </div>

      <DetailPanel
        title="Overview"
        description="Schedule, pay rate, and shift requirements at a glance."
        icon={CalendarClock}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetaTile label="Role" value={roleLabel(shift.required_role)} />
          <MetaTile
            label="Hourly rate"
            value={formatRate(shift.rate_minor, shift.currency)}
          />
          <MetaTile
            label="Break"
            value={`${shift.break_minutes} minutes`}
          />
          <MetaTile
            label="Starts"
            value={formatDateTime(shift.starts_at, ctx.org.timezone)}
          />
          <MetaTile
            label="Ends"
            value={formatDateTime(shift.ends_at, ctx.org.timezone)}
          />
          <MetaTile
            label="Acceptance deadline"
            value={
              shift.acceptance_deadline
                ? formatDateTime(shift.acceptance_deadline, ctx.org.timezone)
                : 'None'
            }
            hint={acceptanceClosed ? 'Cutoff has passed' : undefined}
          />
          {requirements.length > 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="rounded-xl border border-bh-border/80 bg-bh-subtle/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-bh-text-muted">
                  Extra requirements
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {requirements.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center rounded-full border border-bh-teal/20 bg-bh-teal-soft/70 px-3 py-1 text-xs font-semibold text-bh-teal-strong"
                    >
                      {credentialTypeLabel(r.requirement_type)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {shift.notes ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="rounded-xl border border-bh-border/80 bg-bh-subtle/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-bh-text-muted">
                  Notes for workers
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bh-text">
                  {shift.notes}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DetailPanel>

      <PermissionGuard allowed={canExtendAcceptance}>
        <ExtendAcceptanceDeadlineForm
          slug={slug}
          shiftId={shift.id}
          startsAt={shift.starts_at}
          currentDeadline={shift.acceptance_deadline}
          acceptanceClosed={acceptanceClosed}
        />
      </PermissionGuard>

      <PermissionGuard
        allowed={ctx.capabilities.canManageShifts && shift.status === 'draft'}
      >
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-bh-text">Edit draft</h2>
            <p className="text-sm text-bh-text-secondary">
              Update details, then save. Publish when the opening is ready.
            </p>
          </div>
          <ShiftForm
            slug={slug}
            locations={locations ?? []}
            shift={shift}
            requirements={requirements}
            mode="edit"
          />
        </div>
      </PermissionGuard>

      <DetailPanel
        title="Assignment"
        description={
          assignment
            ? 'Active worker assignment and attendance timestamps.'
            : 'No worker has claimed this shift yet.'
        }
        icon={UserRound}
      >
        {!assignment ? (
          <div className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-bh-text">Waiting for a claim</p>
            <p className="mt-1 text-sm text-bh-text-secondary">
              {shift.status === 'published'
                ? 'Published and open for verified workers.'
                : 'Publish the draft to make it claimable.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <MetaTile
              label="Worker"
              value={
                assignment.worker &&
                typeof assignment.worker === 'object' &&
                'worker_role' in assignment.worker
                  ? roleLabel(String(assignment.worker.worker_role ?? 'worker'))
                  : 'Assigned worker'
              }
              hint={`${assignment.worker_id.slice(0, 8)}…`}
            />
            <MetaTile
              label="Assignment status"
              value={
                <span className="inline-flex rounded-full border border-bh-border bg-bh-surface px-2.5 py-1 text-xs font-semibold capitalize text-bh-text">
                  {assignment.status.replaceAll('_', ' ')}
                </span>
              }
            />
            <MetaTile
              label="Check-in"
              value={
                assignment.check_in_at
                  ? formatDateTime(assignment.check_in_at, ctx.org.timezone)
                  : '—'
              }
            />
            <MetaTile
              label="Check-out"
              value={
                assignment.check_out_at
                  ? formatDateTime(assignment.check_out_at, ctx.org.timezone)
                  : '—'
              }
            />
          </div>
        )}
      </DetailPanel>

      {timesheet ? (
        <DetailPanel
          title="Timesheet"
          description="Submitted hours and review status."
          icon={Timer}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MetaTile
              label="Status"
              value={
                <span className="inline-flex rounded-full border border-bh-border bg-bh-surface px-2.5 py-1 text-xs font-semibold capitalize text-bh-text">
                  {timesheet.status.replaceAll('_', ' ')}
                </span>
              }
            />
            <MetaTile
              label="Submitted"
              value={formatDurationMinutes(timesheet.submitted_minutes)}
            />
            <MetaTile
              label="Approved"
              value={formatDurationMinutes(timesheet.approved_minutes)}
            />
          </div>

          <PermissionGuard
            allowed={
              ctx.capabilities.canReviewTimesheets &&
              timesheet.status === 'submitted'
            }
          >
            <div className="mt-4 rounded-xl border border-bh-warning/20 bg-bh-warning-soft/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-bh-warning" aria-hidden />
                <p className="text-sm font-semibold text-bh-text">Needs review</p>
              </div>
              <TimesheetReviewForm
                slug={slug}
                shiftId={shift.id}
                timesheetId={timesheet.id}
                submittedMinutes={timesheet.submitted_minutes}
              />
            </div>
          </PermissionGuard>
        </DetailPanel>
      ) : null}

      {payout ? (
        <DetailPanel
          title="Financial snapshot"
          description="Approved gross amounts for this assignment. Not platform revenue."
          icon={Wallet}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MetaTile
              label="Approved gross pay"
              value={formatMoneyMinor(payout.gross_amount_minor, payout.currency)}
            />
            <MetaTile
              label="Hospital payment to worker"
              value={formatMoneyMinor(
                payout.worker_transfer_amount_minor,
                payout.currency,
              )}
            />
            <MetaTile
              label="Organization total due"
              value={formatMoneyMinor(
                payout.organization_total_due_minor,
                payout.currency,
              )}
            />
          </div>
          <p className="mt-4 rounded-xl bg-bh-honey-soft/60 px-4 py-3 text-xs leading-5 text-bh-text-secondary">
            The organization pays the worker the approved gross shift amount directly.
            Bridge Hive commission is a separate worker invoice and is not an organization
            expense. Payment instructions and bank-account details remain unavailable in this
            workspace.
          </p>
        </DetailPanel>
      ) : null}
    </div>
  );
}
