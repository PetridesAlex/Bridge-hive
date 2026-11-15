import {
  credentialTypeLabel,
  estimatedFullCoveragePayMinor,
  isOccupyingAssignmentStatus,
  positionsAvailabilityLabel,
  formatMoneyMinor,
} from '@bridge-hive/domain';
import {
  ArrowRight,
  UserPlus,
  LogOut,
  LogIn,
  Activity,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ClipboardList,
  Coffee,
  CopyPlus,
  Hourglass,
  Check,
  CheckCircle2,
  Info,
  XCircle,
  MapPin,
  Stethoscope,
  Timer,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
import {
  OrgTableHeadCell,
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
import { PermissionGuard } from '@/components/permission-guard';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
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
import { ShiftDetailTabs } from '../_components/shift-detail-tabs';
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

function splitWhen(value: string): { date: string; time: string } {
  const i = value.lastIndexOf(', ');
  return i > 0
    ? { date: value.slice(0, i), time: value.slice(i + 2) }
    : { date: value, time: '' };
}

const STAT_TONES = {
  honey: 'bg-[#fff3cf] text-[#9a6b00] ring-[#e4b334]/40',
  green: 'bg-emerald-100 text-emerald-700 ring-emerald-300/60',
  teal: 'bg-bh-teal-soft text-bh-teal-strong ring-bh-teal/25',
  slate: 'bg-bh-subtle text-bh-text-secondary ring-bh-border',
} as const;

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: keyof typeof STAT_TONES;
  children?: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_1px_2px_rgba(7,29,48,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-bh-border-strong hover:shadow-[0_12px_24px_rgba(7,29,48,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1',
            STAT_TONES[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.3} aria-hidden />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-text-muted">
          {label}
        </p>
      </div>
      <p className="bh-tabular mt-3 text-2xl font-bold tracking-[-0.02em] text-bh-text">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-bh-text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

function payoutPill(status: string): { label: string; className: string; dot: string } {
  const label = status.replace(/_/g, ' ');
  if (status === 'overdue')
    return { label, className: 'bg-red-50 text-red-800 ring-red-200', dot: 'bg-red-500' };
  if (['paid', 'reconciled', 'settled'].includes(status))
    return {
      label,
      className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      dot: 'bg-emerald-500',
    };
  if (['cancelled', 'void'].includes(status))
    return { label, className: 'bg-bh-subtle text-bh-text-secondary ring-bh-border', dot: 'bg-slate-400' };
  return { label, className: 'bg-[#fff3cf] text-[#7a5600] ring-[#e4b334]/50', dot: 'bg-[#e4b334]' };
}

function assignmentPill(status: string): { label: string; className: string; live?: boolean } {
  const label = status.replaceAll('_', ' ');
  switch (status) {
    case 'approved':
      return { label, className: 'bg-[linear-gradient(135deg,#16a34a_0%,#15803d_100%)] text-white shadow-[0_6px_16px_rgba(22,163,74,0.4)]' };
    case 'submitted':
      return { label, className: 'bg-[#f5a30a] text-[#2b1a00] shadow-[0_6px_16px_rgba(245,163,10,0.45)]', live: true };
    case 'checked_in':
      return { label, className: 'bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.45)]', live: true };
    case 'checked_out':
      return { label, className: 'bg-teal-600 text-white shadow-[0_6px_16px_rgba(13,148,136,0.45)]' };
    case 'accepted':
      return { label, className: 'bg-[#071d30] text-white shadow-[0_6px_16px_rgba(7,29,48,0.3)]' };
    default:
      return { label, className: 'bg-slate-600 text-white' };
  }
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
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug, id } = await params;
  const { tab: tabParam } = await searchParams;
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

  const [{ data: locationRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from('locations')
      .select('id, name, wards(id, name, location_id)')
      .eq('organization_id', ctx.org.id)
      .order('name'),
    supabase
      .from('shift_assignments')
      .select(
        '*, worker:worker_profiles!shift_assignments_worker_id_fkey(user_id, worker_role), timesheet:timesheets(*)',
      )
      .eq('shift_id', shift.id)
      .not('status', 'in', '(withdrawn,cancelled)')
      .order('accepted_at', { ascending: true }),
  ]);

  const locations = (locationRows ?? []).map((location) => ({
    id: location.id,
    name: location.name,
  }));
  const wards = (locationRows ?? []).flatMap((location) => {
    const nested = Array.isArray(location.wards) ? location.wards : [];
    return nested.flatMap((ward) =>
      ward &&
      typeof ward === 'object' &&
      'id' in ward &&
      'name' in ward &&
      typeof ward.id === 'string' &&
      typeof ward.name === 'string'
        ? [
            {
              id: ward.id,
              name: ward.name,
              location_id:
                'location_id' in ward && typeof ward.location_id === 'string'
                  ? ward.location_id
                  : location.id,
            },
          ]
        : [],
    );
  });

  const assignments = assignmentRows ?? [];

  // Worker names are only visible for accepted (position-occupying) assignments,
  // through a narrow SECURITY DEFINER function. If it is not available yet the
  // page falls back to the worker role.
  const { data: assignedWorkerRows } = await supabase.rpc(
    'list_org_shift_assigned_workers' as never,
    { p_shift_id: shift.id } as never,
  );
  const workerNameByAssignmentId = new Map<string, string>();
  for (const row of (Array.isArray(assignedWorkerRows) ? assignedWorkerRows : []) as Array<{
    assignment_id?: string;
    full_name?: string | null;
  }>) {
    const name = row.full_name?.trim();
    if (row.assignment_id && name) workerNameByAssignmentId.set(row.assignment_id, name);
  }
  function workerRoleText(row: (typeof assignments)[number]): string {
    return row.worker && typeof row.worker === 'object' && 'worker_role' in row.worker
      ? roleLabel(String(row.worker.worker_role ?? 'worker'))
      : 'Assigned worker';
  }
  const filledCount = assignments.filter((row) =>
    isOccupyingAssignmentStatus(row.status),
  ).length;
  const requiredPositions = shift.required_positions ?? 1;
  const openPositions = Math.max(0, requiredPositions - filledCount);
  const estimatedFullPayMinor = estimatedFullCoveragePayMinor({
    rateMinor: shift.rate_minor,
    startsAtIso: shift.starts_at,
    endsAtIso: shift.ends_at,
    breakMinutes: shift.break_minutes,
    requiredPositions,
  });

  const assignmentIds = assignments.map((row) => row.id);
  const { data: payoutRows } =
    assignmentIds.length > 0
      ? await supabase.from('payouts').select('*').in('assignment_id', assignmentIds)
      : { data: [] as Array<Record<string, unknown>> };
  const payoutByAssignmentId = new Map(
    (payoutRows ?? []).map((row) => [String(row.assignment_id), row]),
  );

  type TimesheetRow = {
    id: string;
    status: string;
    submitted_minutes: number | null;
    approved_minutes: number | null;
  };

  function timesheetForAssignment(row: (typeof assignments)[number]): TimesheetRow | null {
    const raw = row.timesheet;
    const ts = Array.isArray(raw) ? raw[0] : raw;
    return ts && typeof ts === 'object' && 'id' in ts ? (ts as TimesheetRow) : null;
  }

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
    openPositions > 0 &&
    new Date(shift.starts_at) > new Date();

  const locationName =
    location && 'name' in location ? String(location.name) : 'Unknown location';
  const wardName = ward && 'name' in ward ? String(ward.name) : null;

  const hasTimesheets = assignments.some((row) => timesheetForAssignment(row));
  const hasFinancials = assignments.some((row) => payoutByAssignmentId.has(row.id));
  const shiftPayouts = assignments.flatMap((row) => {
    const payout = payoutByAssignmentId.get(row.id);
    return payout ? [payout] : [];
  });
  const payoutCurrency = String(shiftPayouts[0]?.currency ?? shift.currency);
  const singleCurrency = shiftPayouts.every(
    (payout) => String(payout.currency) === payoutCurrency,
  );
  const sumPayouts = (key: string) =>
    shiftPayouts.reduce((sum, payout) => sum + Number((payout as Record<string, unknown>)[key] ?? 0), 0);
  const timesheetsNeedingReview = assignments.filter(
    (row) => timesheetForAssignment(row)?.status === 'submitted',
  ).length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
        <div className="bg-gradient-to-br from-bh-teal-soft/45 via-bh-surface to-bh-honey-soft/25 px-5 py-5 sm:px-6 sm:py-6">
          <BackLink href={`/org/${slug}/shifts`} label="Shifts" className="mb-4" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="bh-fade-up flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(14,143,153,0.28)] bg-[rgba(20,169,181,0.10)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  Shift
                </span>
                <ShiftStatusBadge status={shift.status} />
              </div>
              <h1 className="bh-msg-title bh-fade-up-delay-1 mt-3 text-[clamp(1.9rem,4.2vw,2.7rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
                {shift.title || roleLabel(shift.required_role)}
              </h1>
              <span
                aria-hidden
                className="bh-msg-rule bh-fade-up-delay-2 mt-3 block h-[3px] w-16 rounded-full bg-[linear-gradient(90deg,#14a9b5,#e4b334)]"
              />
              <p className="bh-fade-up-delay-2 mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0e8f99_0%,#14a9b5_100%)] py-1 pl-1 pr-3.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(14,143,153,0.4)]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#0e8f99]">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  {locationName}
                  {wardName ? (
                    <span className="font-medium text-white/80">· {wardName}</span>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(109,40,217,0.35)]">
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden />
                  {roleLabel(shift.required_role)}
                </span>
                <span className="bh-tabular inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[13px] font-semibold text-bh-text-secondary ring-1 ring-bh-border">
                  <CalendarClock className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                  {formatDateTime(shift.starts_at, ctx.org.timezone)}
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
                <Link
                  href={`/org/${slug}/shifts/new/bulk?template=${shift.id}`}
                  className="group/dup inline-flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_72%)] py-2 pl-2.5 pr-4 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(7,29,48,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(155deg,#1a425c_0%,#0a283c_72%)] hover:shadow-[0_16px_32px_rgba(7,29,48,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-honey active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                    <CopyPlus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </span>
                  Duplicate to multiple dates
                  <ArrowRight
                    className="h-4 w-4 text-white/80 transition-transform duration-200 group-hover/dup:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </div>

      <ShiftDetailTabs
        defaultTab={tabParam}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <>
      <DetailPanel
        title="Overview"
        description="Schedule, pay rate, and shift requirements at a glance."
        icon={CalendarClock}
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={Banknote}
              label="Hourly rate"
              value={formatRate(shift.rate_minor, shift.currency)}
              hint="Per professional"
              tone="honey"
            />
            <StatTile
              icon={Wallet}
              label="Worker pay when full"
              value={formatMoneyMinor(estimatedFullPayMinor, shift.currency)}
              hint={`${requiredPositions} × rate × paid hours`}
              tone="green"
            />
            <StatTile
              icon={Users}
              label="Positions"
              value={`${filledCount} / ${requiredPositions}`}
              hint={positionsAvailabilityLabel(requiredPositions, filledCount)}
              tone="teal"
            >
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-bh-subtle"
                role="progressbar"
                aria-label="Positions filled"
                aria-valuemin={0}
                aria-valuemax={requiredPositions}
                aria-valuenow={Math.min(filledCount, requiredPositions)}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                    openPositions === 0
                      ? 'bg-[linear-gradient(90deg,#16a34a,#15803d)]'
                      : 'bg-[linear-gradient(90deg,#14a9b5,#0f8a96)]',
                  )}
                  style={{
                    width: `${Math.min(100, (filledCount / Math.max(1, requiredPositions)) * 100)}%`,
                  }}
                />
              </div>
            </StatTile>
            <StatTile
              icon={Coffee}
              label="Break"
              value={`${shift.break_minutes} min`}
              hint="Unpaid break"
              tone="slate"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-subtle/30">
            <div className="flex items-center justify-between gap-3 border-b border-bh-border/70 px-4 py-2.5 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-text-muted">
                Schedule
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-surface px-2.5 py-1 text-xs font-semibold text-bh-text ring-1 ring-bh-border">
                <Stethoscope className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                {roleLabel(shift.required_role)}
              </span>
            </div>
            <div className="grid items-center gap-4 px-4 py-5 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
              {(
                [
                  { label: 'Starts', when: splitWhen(formatDateTime(shift.starts_at, ctx.org.timezone)) },
                  { label: 'Ends', when: splitWhen(formatDateTime(shift.ends_at, ctx.org.timezone)) },
                ] as const
              ).map((point, index) => (
                <div
                  key={point.label}
                  className={cn(index === 1 && 'sm:order-3 sm:text-right')}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-teal-strong">
                    {point.label}
                  </p>
                  <p className="bh-tabular mt-1 text-3xl font-bold tracking-[-0.03em] text-bh-text">
                    {point.when.time || '—'}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-bh-text-secondary">
                    {point.when.date}
                  </p>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1.5 sm:order-2">
                <span className="inline-flex items-center gap-2 text-bh-text-muted">
                  <span aria-hidden className="hidden h-px w-8 bg-bh-border-strong sm:block" />
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  <span aria-hidden className="hidden h-px w-8 bg-bh-border-strong sm:block" />
                </span>
                <span className="bh-tabular inline-flex items-center gap-1.5 rounded-full bg-[#071d30] px-3 py-1 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(7,29,48,0.22)]">
                  <Timer className="h-3.5 w-3.5 text-[#e4b334]" aria-hidden />
                  {formatDurationMinutes(
                    Math.max(
                      0,
                      Math.round(
                        (new Date(shift.ends_at).getTime() -
                          new Date(shift.starts_at).getTime()) /
                          60000,
                      ) - (shift.break_minutes ?? 0),
                    ),
                  )}{' '}
                  paid
                </span>
              </div>
            </div>
            <div
              className={cn(
                'flex flex-wrap items-center gap-2 border-t px-4 py-3 text-sm sm:px-5',
                acceptanceClosed
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-bh-border/70 bg-bh-surface/60 text-bh-text-secondary',
              )}
            >
              <Hourglass className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-semibold text-bh-text">Acceptance deadline</span>
              <span>
                {shift.acceptance_deadline
                  ? formatDateTime(shift.acceptance_deadline, ctx.org.timezone)
                  : 'None set'}
              </span>
              {acceptanceClosed ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                  Cutoff has passed
                </span>
              ) : null}
            </div>
          </div>

          {requirements.length > 0 || shift.notes ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {requirements.length > 0 ? (
                <div className="rounded-2xl border border-bh-border bg-bh-surface p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-text-muted">
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
              ) : null}
              {shift.notes ? (
                <div
                  className={cn(
                    'rounded-2xl border border-[#e4b334]/40 bg-[#fff8e8] p-4',
                    requirements.length === 0 && 'lg:col-span-2',
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a6b00]">
                    Notes for workers
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bh-text">
                    {shift.notes}
                  </p>
                </div>
              ) : null}
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
            locations={locations}
            wards={wards.map((ward) => ({
              id: ward.id,
              name: ward.name,
              locationId: ward.location_id,
            }))}
            shift={shift}
            requirements={requirements}
            mode="edit"
            canManageWards={ctx.capabilities.canManageWards}
          />
        </div>
      </PermissionGuard>

              </>
            ),
          },
          {
            id: 'assignments',
            label: 'Assignments',
            count: filledCount,
            content: (
              <>
      <DetailPanel
        title="Assignments"
        description={
          filledCount > 0
            ? `${positionsAvailabilityLabel(requiredPositions, filledCount)}.`
            : 'No worker has claimed this shift yet.'
        }
        icon={UserRound}
      >
        {filledCount === 0 ? (
          <div className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-bh-text">Waiting for a claim</p>
            <p className="mt-1 text-sm text-bh-text-secondary">
              {shift.status === 'published'
                ? `Published with ${requiredPositions} position${requiredPositions === 1 ? '' : 's'} open for verified workers.`
                : 'Publish the draft to make it claimable.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-bh-subtle/50 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-[#e4b334] shadow-[0_6px_14px_rgba(7,29,48,0.2)]">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-bh-text">
                  {filledCount} of {requiredPositions} position{requiredPositions === 1 ? '' : 's'} filled
                </p>
                <div
                  className="mt-1.5 h-2 max-w-xs overflow-hidden rounded-full bg-white ring-1 ring-bh-border"
                  role="progressbar"
                  aria-label="Positions filled"
                  aria-valuemin={0}
                  aria-valuemax={requiredPositions}
                  aria-valuenow={Math.min(filledCount, requiredPositions)}
                >
                  <div
                    className={cn(
                      'h-full rounded-full',
                      openPositions === 0
                        ? 'bg-[linear-gradient(90deg,#16a34a,#15803d)]'
                        : 'bg-[linear-gradient(90deg,#f5a30a,#e4b334)]',
                    )}
                    style={{
                      width: `${Math.min(100, (filledCount / Math.max(1, requiredPositions)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              {openPositions === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.45)]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Fully booked
                </span>
              ) : null}
            </div>

            <OrgTableShell>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className={orgTableHeadClassName}>
                    <tr>
                      <OrgTableHeadCell icon={UserRound} label="Worker" />
                      <OrgTableHeadCell icon={Activity} label="Status" />
                      <OrgTableHeadCell icon={LogIn} label="Check-in" />
                      <OrgTableHeadCell icon={LogOut} label="Check-out" />
                      <OrgTableHeadCell icon={Timer} label="Worked" />
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((row) => {
                      const name = workerNameByAssignmentId.get(row.id);
                      const label = name ?? workerRoleText(row);
                      const pill = assignmentPill(row.status);
                      const inAt = row.check_in_at
                        ? splitWhen(formatDateTime(row.check_in_at, ctx.org.timezone))
                        : null;
                      const outAt = row.check_out_at
                        ? splitWhen(formatDateTime(row.check_out_at, ctx.org.timezone))
                        : null;
                      const workedMin =
                        row.check_in_at && row.check_out_at
                          ? Math.max(
                              0,
                              Math.round(
                                (new Date(row.check_out_at).getTime() -
                                  new Date(row.check_in_at).getTime()) /
                                  60000,
                              ),
                            )
                          : null;
                      return (
                        <tr key={row.id} className={orgTableRowClassName}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                aria-hidden
                                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-base font-bold text-[#e4b334] shadow-[0_6px_14px_rgba(7,29,48,0.2)]"
                              >
                                {label.trim()[0]?.toUpperCase() ?? 'W'}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold tracking-tight text-bh-text">
                                  {label}
                                </p>
                                <p className="mt-0.5 text-xs text-bh-text-muted">
                                  {name ? `${workerRoleText(row)} · ` : ''}
                                  <span className="font-mono">#{row.worker_id.slice(0, 8)}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize tracking-wide',
                                pill.className,
                              )}
                            >
                              <span className="relative flex h-2 w-2" aria-hidden>
                                {pill.live ? (
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
                                ) : null}
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                              </span>
                              {pill.label}
                            </span>
                          </td>
                          {[inAt, outAt].map((point, index) => (
                            <td key={index} className="px-4 py-4">
                              {point ? (
                                <div className="leading-tight">
                                  <p className="bh-tabular text-base font-bold text-bh-text">
                                    {point.time || '\u2014'}
                                  </p>
                                  <p className="mt-0.5 text-xs text-bh-text-muted">{point.date}</p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-bh-border-strong px-2.5 py-1 text-xs font-medium text-bh-text-muted">
                                  Not yet
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-4">
                            {workedMin != null ? (
                              <span className="bh-tabular inline-flex items-center gap-1.5 rounded-lg bg-bh-subtle px-2.5 py-1.5 text-sm font-bold text-bh-text ring-1 ring-bh-border">
                                <Timer className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                                {formatDurationMinutes(workedMin)}
                              </span>
                            ) : (
                              <span className="text-bh-text-muted">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </OrgTableShell>

            {openPositions > 0 && shift.status === 'published' ? (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#e4b334]/60 bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5600]">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4b334]/25">
                  <UserPlus className="h-4 w-4" aria-hidden />
                </span>
                <span className="font-semibold">
                  {openPositions === 1
                    ? '1 position still open for verified workers.'
                    : `${openPositions} positions still open for verified workers.`}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </DetailPanel>

              </>
            ),
          },
          ...(hasTimesheets
            ? [
                {
                  id: 'timesheets',
                  label: 'Timesheets',
                  count: timesheetsNeedingReview > 0 ? timesheetsNeedingReview : undefined,
                  attention: timesheetsNeedingReview > 0,
                  content: (
                    <>
        <DetailPanel
          title="Timesheets"
          description="Each filled position has its own timesheet. Review and pay are per worker."
          icon={Timer}
        >
          <div className="space-y-5">
            {assignments.map((row) => {
              const timesheet = timesheetForAssignment(row);
              if (!timesheet) return null;
              const workerLabel = workerNameByAssignmentId.get(row.id) ?? workerRoleText(row);
              const status = timesheet.status;
              const approved = status === 'approved';
              const rejected = status === 'rejected';
              const submittedMin = timesheet.submitted_minutes ?? 0;
              const approvedMin = timesheet.approved_minutes;
              const delta = approvedMin != null ? approvedMin - submittedMin : 0;
              const pct =
                approvedMin != null && submittedMin > 0
                  ? Math.min(100, Math.round((approvedMin / submittedMin) * 100))
                  : 0;
              const pillClass = approved
                ? 'bg-[linear-gradient(135deg,#16a34a_0%,#15803d_100%)] text-white shadow-[0_6px_16px_rgba(22,163,74,0.4)]'
                : rejected
                  ? 'bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_6px_16px_rgba(220,38,38,0.4)]'
                  : status === 'submitted'
                    ? 'bg-[#f5a30a] text-[#2b1a00] shadow-[0_6px_16px_rgba(245,163,10,0.45)]'
                    : 'bg-slate-600 text-white';
              const workedIn = row.check_in_at
                ? splitWhen(formatDateTime(row.check_in_at, ctx.org.timezone)).time
                : null;
              const workedOut = row.check_out_at
                ? splitWhen(formatDateTime(row.check_out_at, ctx.org.timezone)).time
                : null;
              const reviewDone = approved || rejected;
              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)] transition-shadow duration-200 hover:shadow-[0_14px_28px_rgba(7,29,48,0.09)] motion-reduce:transition-none"
                >
                  <div
                    className={cn(
                      'h-1 w-full',
                      approved
                        ? 'bg-[linear-gradient(90deg,#16a34a,#4ade80)]'
                        : rejected
                          ? 'bg-[linear-gradient(90deg,#dc2626,#f87171)]'
                          : 'bg-[linear-gradient(90deg,#f5a30a,#e4b334)]',
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-base font-bold text-[#e4b334] shadow-[0_6px_14px_rgba(7,29,48,0.2)]"
                      >
                        {workerLabel.trim()[0]?.toUpperCase() ?? 'W'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold tracking-tight text-bh-text">
                          {workerLabel}
                        </p>
                        <p className="text-xs text-bh-text-muted">
                          {workerNameByAssignmentId.has(row.id) ? `${workerRoleText(row)} · ` : ''}
                          #{row.worker_id.slice(0, 8)}
                          {workedIn && workedOut ? ` · worked ${workedIn} – ${workedOut}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'relative inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5 text-xs font-bold capitalize tracking-wide',
                        pillClass,
                      )}
                    >
                      {approved ? (
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                      ) : rejected ? (
                        <XCircle className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                      ) : (
                        <span className="relative flex h-2 w-2" aria-hidden>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                        </span>
                      )}
                      {status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <ol
                    aria-label="Timesheet progress"
                    className="mx-4 flex items-center gap-2 rounded-xl bg-bh-subtle/50 px-3 py-2.5 text-xs font-semibold sm:mx-5"
                  >
                    <li className="flex items-center gap-1.5 text-emerald-700">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      Submitted
                    </li>
                    <li
                      aria-hidden
                      className={cn(
                        'h-0.5 flex-1 rounded-full',
                        reviewDone
                          ? approved
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                          : 'bg-[repeating-linear-gradient(90deg,#c4d2de_0_6px,transparent_6px_10px)]',
                      )}
                    />
                    <li
                      className={cn(
                        'flex items-center gap-1.5',
                        approved
                          ? 'text-emerald-700'
                          : rejected
                            ? 'text-red-700'
                            : 'text-bh-text-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-5 w-5 place-items-center rounded-full',
                          approved
                            ? 'bg-emerald-600 text-white'
                            : rejected
                              ? 'bg-red-600 text-white'
                              : 'border-2 border-dashed border-bh-border-strong',
                        )}
                      >
                        {approved ? (
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                        ) : rejected ? (
                          <XCircle className="h-3 w-3" strokeWidth={3} aria-hidden />
                        ) : null}
                      </span>
                      {approved ? 'Approved' : rejected ? 'Rejected' : 'Awaiting review'}
                    </li>
                  </ol>

                  <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    <StatTile
                      icon={Timer}
                      label="Submitted"
                      value={formatDurationMinutes(timesheet.submitted_minutes)}
                      hint="Hours claimed by the worker"
                      tone="honey"
                    />
                    <StatTile
                      icon={CheckCircle2}
                      label="Approved"
                      value={
                        approvedMin != null ? formatDurationMinutes(approvedMin) : '\u2014'
                      }
                      hint={
                        approvedMin == null
                          ? 'Not reviewed yet'
                          : delta === 0
                            ? 'Matches the submitted hours'
                            : `${delta < 0 ? '\u2212' : '+'}${formatDurationMinutes(Math.abs(delta))} adjusted`
                      }
                      tone={rejected ? 'slate' : 'green'}
                    >
                      {approvedMin != null ? (
                        <div
                          className="mt-3 h-2 overflow-hidden rounded-full bg-bh-subtle"
                          role="progressbar"
                          aria-label="Approved share of submitted hours"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                        >
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#16a34a,#15803d)] transition-[width] duration-500 motion-reduce:transition-none"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      ) : null}
                    </StatTile>
                    <StatTile
                      icon={Hourglass}
                      label="Outcome"
                      value={approved ? 'Payable' : rejected ? 'Rejected' : 'Pending'}
                      hint={
                        approved
                          ? 'Payment is created from approved hours'
                          : rejected
                            ? 'No payment is created'
                            : 'Review to release payment'
                      }
                      tone={approved ? 'green' : rejected ? 'slate' : 'teal'}
                    />
                  </div>

                  <PermissionGuard
                    allowed={
                      ctx.capabilities.canReviewTimesheets &&
                      timesheet.status === 'submitted'
                    }
                  >
                    <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-[#e4b334]/50 bg-[#fff8e8] sm:mx-5 sm:mb-5">
                      <div className="flex items-center gap-2.5 border-b border-[#e4b334]/30 bg-[#fff3cf] px-4 py-2.5">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#071d30] text-[#e4b334]">
                          <ClipboardList className="h-4 w-4" aria-hidden />
                        </span>
                        <p className="text-sm font-bold text-[#2b1a00]">Needs your review</p>
                      </div>
                      <div className="p-4">
                        <TimesheetReviewForm
                          slug={slug}
                          shiftId={shift.id}
                          timesheetId={timesheet.id}
                          submittedMinutes={timesheet.submitted_minutes ?? 0}
                        />
                      </div>
                    </div>
                  </PermissionGuard>
                </article>
              );
            })}
          </div>
        </DetailPanel>
                    </>
                  ),
                },
              ]
            : []),
          ...(hasFinancials
            ? [
                {
                  id: 'financials',
                  label: 'Financials',
                  content: (
                    <>
        <DetailPanel
          title="Financial snapshots"
          description="Approved amounts for each filled position. Not platform revenue."
          icon={Wallet}
        >
          <div className="space-y-5">
            {singleCurrency ? (
              <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] p-5 text-white shadow-[0_14px_30px_rgba(7,29,48,0.2)]">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/30 blur-2xl"
                />
                <span
                  aria-hidden
                  className="bh-orb-drift pointer-events-none absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
                />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f3d27a]">
                    Shift total
                  </p>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/20">
                    {shiftPayouts.length === 1
                      ? '1 position paid out'
                      : `${shiftPayouts.length} positions paid out`}
                  </span>
                </div>
                <div className="relative mt-4 grid gap-5 sm:grid-cols-3">
                  {(
                    [
                      { label: 'Approved gross', key: 'gross_amount_minor', accent: 'text-[#f3d27a]' },
                      { label: 'Paid directly to workers', key: 'worker_transfer_amount_minor', accent: 'text-white' },
                      { label: 'Organization total due', key: 'organization_total_due_minor', accent: 'text-white' },
                    ] as const
                  ).map((figure) => (
                    <div key={figure.key}>
                      <p className="text-xs font-medium text-white/65">{figure.label}</p>
                      <p
                        className={cn(
                          'bh-tabular mt-1 text-3xl font-bold tracking-[-0.03em]',
                          figure.accent,
                        )}
                      >
                        {formatMoneyMinor(sumPayouts(figure.key), payoutCurrency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {assignments.map((row) => {
              const payout = payoutByAssignmentId.get(row.id);
              if (!payout) return null;
              const workerLabel = workerNameByAssignmentId.get(row.id) ?? workerRoleText(row);
              const pill = payoutPill(String(payout.status));
              const currency = String(payout.currency);
              const dueText = payout.due_at
                ? splitWhen(formatDateTime(String(payout.due_at), ctx.org.timezone)).date
                : null;
              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)] transition-shadow duration-200 hover:shadow-[0_12px_24px_rgba(7,29,48,0.08)] motion-reduce:transition-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bh-border/70 bg-bh-subtle/40 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-base font-bold text-[#e4b334] shadow-[0_6px_14px_rgba(7,29,48,0.2)]"
                      >
                        {workerLabel.trim()[0]?.toUpperCase() ?? 'W'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold tracking-tight text-bh-text">
                          {workerLabel}
                        </p>
                        <p className="text-xs text-bh-text-muted">
                          {workerNameByAssignmentId.has(row.id)
                            ? `${workerRoleText(row)} · `
                            : ''}
                          {formatDurationMinutes(Number(payout.approved_minutes))} approved
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {dueText ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-surface px-2.5 py-1 text-xs font-semibold text-bh-text-secondary ring-1 ring-bh-border">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                          Due {dueText}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1',
                          pill.className,
                        )}
                      >
                        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', pill.dot)} />
                        {pill.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    <StatTile
                      icon={Banknote}
                      label="Approved gross"
                      value={formatMoneyMinor(Number(payout.gross_amount_minor), currency)}
                      hint="Approved hours × rate"
                      tone="honey"
                    />
                    <StatTile
                      icon={UserRound}
                      label="Paid directly to worker"
                      value={formatMoneyMinor(
                        Number(payout.worker_transfer_amount_minor),
                        currency,
                      )}
                      hint="Transfer by your organization"
                      tone="green"
                    />
                    <StatTile
                      icon={Wallet}
                      label="Organization total due"
                      value={formatMoneyMinor(
                        Number(payout.organization_total_due_minor),
                        currency,
                      )}
                      hint="Total for this position"
                      tone="teal"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bh-border/70 bg-bh-subtle/30 px-4 py-3 sm:px-5">
                    <p className="text-xs text-bh-text-muted">
                      Bank details for the transfer are in the payment details.
                    </p>
                    <Link
                      href={`/org/${slug}/payments/${payout.id}`}
                      className="group/pay inline-flex min-h-10 items-center gap-2 rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(7,29,48,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-honey motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      Open payment details
                      <ArrowUpRight
                        className="h-3.5 w-3.5 text-[#e4b334] transition-transform duration-200 group-hover/pay:-translate-y-0.5 group-hover/pay:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </div>
                </article>
              );
            })}

            <aside className="flex gap-3 rounded-2xl border border-[#e4b334]/40 bg-[#fff8e8] p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e4b334]/25 text-[#9a6b00]">
                <Info className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 text-sm leading-6 text-bh-text-secondary">
                <p className="font-semibold text-bh-text">How payment works</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-5">
                  <li>
                    Your organization pays each worker their approved gross amount directly.
                  </li>
                  <li>
                    Bridge Hive commission is a separate worker invoice per completed
                    position and is not an organization expense.
                  </li>
                  <li>
                    Open payment details to see the worker&rsquo;s bank account for the
                    direct transfer.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </DetailPanel>
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
