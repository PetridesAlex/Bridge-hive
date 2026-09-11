import { formatMoneyMinor } from '@bridge-hive/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PermissionGuard } from '@/components/permission-guard';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import {
  formatDateTime,
  formatDurationMinutes,
  formatRate,
  roleLabel,
} from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

import { PublishShiftButton } from '../_components/publish-shift-button';
import { ShiftForm } from '../_components/shift-form';
import { TimesheetReviewForm } from '../_components/timesheet-review-form';

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

  const locationIdList = (locations ?? []).map((l) => l.id);

  const [{ data: wards }, { data: assignment }] = await Promise.all([
    locationIdList.length
      ? supabase
          .from('wards')
          .select('*')
          .in('location_id', locationIdList)
          .order('name')
      : Promise.resolve({ data: [] as Array<never> }),
    supabase
      .from('shift_assignments')
      .select(
        '*, worker:worker_profiles!shift_assignments_worker_id_fkey(user_id, worker_role), timesheet:timesheets(*)',
      )
      .eq('shift_id', shift.id)
      .not('status', 'in', '(withdrawn,cancelled)')
      .maybeSingle(),
  ]);

  const orgWards = wards ?? [];

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
  const requirements = Array.isArray(shift.requirements) ? shift.requirements : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href={`/org/${slug}/shifts`}>← Shifts</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-900">
              {shift.title || roleLabel(shift.required_role)}
            </h2>
            <ShiftStatusBadge status={shift.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {location && 'name' in location ? location.name : 'Unknown location'}
            {ward && 'name' in ward ? ` · ${ward.name}` : ''}
          </p>
        </div>

        <PermissionGuard
          allowed={
            ctx.capabilities.canPublishShifts && shift.status === 'draft'
          }
        >
          <PublishShiftButton slug={slug} shiftId={shift.id} />
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Role</p>
            <p className="font-medium">{roleLabel(shift.required_role)}</p>
          </div>
          <div>
            <p className="text-slate-500">Rate</p>
            <p className="font-medium">
              {formatRate(shift.rate_minor, shift.currency)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Starts</p>
            <p className="font-medium">
              {formatDateTime(shift.starts_at, ctx.org.timezone)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Ends</p>
            <p className="font-medium">
              {formatDateTime(shift.ends_at, ctx.org.timezone)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Break</p>
            <p className="font-medium">{shift.break_minutes} minutes</p>
          </div>
          <div>
            <p className="text-slate-500">Acceptance deadline</p>
            <p className="font-medium">
              {shift.acceptance_deadline
                ? formatDateTime(shift.acceptance_deadline, ctx.org.timezone)
                : '—'}
            </p>
          </div>
          {requirements.length > 0 ? (
            <div className="sm:col-span-2">
              <p className="text-slate-500">Requirements</p>
              <ul className="mt-1 list-inside list-disc font-medium">
                {requirements.map((r) => (
                  <li key={r.id}>{r.requirement_type}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {shift.notes ? (
            <div className="sm:col-span-2">
              <p className="text-slate-500">Notes</p>
              <p className="font-medium whitespace-pre-wrap">{shift.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PermissionGuard
        allowed={ctx.capabilities.canManageShifts && shift.status === 'draft'}
      >
        <Card>
          <CardHeader>
            <CardTitle>Edit draft</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftForm
              slug={slug}
              locations={locations ?? []}
              wards={orgWards}
              shift={shift}
              requirements={requirements}
              mode="edit"
            />
          </CardContent>
        </Card>
      </PermissionGuard>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {!assignment ? (
            <p className="text-sm text-slate-600">
              No worker assigned yet.
              {shift.status === 'published'
                ? ' Waiting for a verified worker to claim this shift.'
                : null}
            </p>
          ) : (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Worker</p>
                <p className="font-medium">
                  {assignment.worker &&
                  typeof assignment.worker === 'object' &&
                  'worker_role' in assignment.worker
                    ? roleLabel(String(assignment.worker.worker_role ?? 'worker'))
                    : 'Assigned worker'}
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    {assignment.worker_id.slice(0, 8)}…
                  </span>
                </p>
              </div>
              <div>
                <p className="text-slate-500">Assignment status</p>
                <p className="font-medium">{assignment.status}</p>
              </div>
              <div>
                <p className="text-slate-500">Check-in</p>
                <p className="font-medium">
                  {assignment.check_in_at
                    ? formatDateTime(assignment.check_in_at, ctx.org.timezone)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Check-out</p>
                <p className="font-medium">
                  {assignment.check_out_at
                    ? formatDateTime(assignment.check_out_at, ctx.org.timezone)
                    : '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {timesheet ? (
        <Card>
          <CardHeader>
            <CardTitle>Timesheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-slate-500">Status</p>
                <p className="font-medium">{timesheet.status}</p>
              </div>
              <div>
                <p className="text-slate-500">Submitted minutes</p>
                <p className="font-medium">
                  {formatDurationMinutes(timesheet.submitted_minutes)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Approved minutes</p>
                <p className="font-medium">
                  {formatDurationMinutes(timesheet.approved_minutes)}
                </p>
              </div>
            </div>

            <PermissionGuard
              allowed={
                ctx.capabilities.canReviewTimesheets &&
                timesheet.status === 'submitted'
              }
            >
              <TimesheetReviewForm
                slug={slug}
                shiftId={shift.id}
                timesheetId={timesheet.id}
                submittedMinutes={timesheet.submitted_minutes}
              />
            </PermissionGuard>
          </CardContent>
        </Card>
      ) : null}

      {payout ? (
        <Card>
          <CardHeader>
            <CardTitle>Financial snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Gross</p>
              <p className="font-medium">
                {formatMoneyMinor(payout.gross_amount_minor, payout.currency)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Commission</p>
              <p className="font-medium">
                {formatMoneyMinor(payout.commission_amount_minor, payout.currency)}{' '}
                ({(payout.commission_rate_bps / 100).toFixed(1)}%)
              </p>
            </div>
            <div>
              <p className="text-slate-500">Worker transfer</p>
              <p className="font-medium">
                {formatMoneyMinor(
                  payout.worker_transfer_amount_minor,
                  payout.currency,
                )}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Organization total due</p>
              <p className="font-medium">
                {formatMoneyMinor(
                  payout.organization_total_due_minor,
                  payout.currency,
                )}
              </p>
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500">
              Payment instructions and bank-account details are not available until secure
              payment setup. Phase 4 shows amounts only — production bank transfer / IBAN
              reveal is unavailable.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
