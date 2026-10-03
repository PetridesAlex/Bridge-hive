/**
 * Organization dashboard presentation helpers (Phase 7B).
 * Pure functions — no Storage, RPC, or browser APIs.
 */

import type { OrgRole, OrgStatus, WorkerRole } from './types';
import { WORKER_ROLE_LABELS } from './types';
import { isOrgOperational, orgOperationalBlockedMessage } from './organization-onboarding';

export type OrgNavItemId =
  | 'dashboard'
  | 'shifts'
  | 'timesheets'
  | 'locations'
  | 'payments'
  | 'settings';

export type OrgNavItem = {
  id: OrgNavItemId;
  href: string;
  label: string;
  group: 'overview' | 'operations' | 'finance' | 'organization';
};

export type OrgNavCapabilities = {
  canOperate: boolean;
  canManageShifts: boolean;
  canManageLocations: boolean;
  canReviewTimesheets: boolean;
  canAccessBilling: boolean;
  canEditOrgSettings: boolean;
};

/** Role-aware navigation from real routes only (no dead links). */
export function orgNavItemsForCapabilities(
  slug: string,
  caps: OrgNavCapabilities,
): OrgNavItem[] {
  const base = `/org/${slug}`;
  const items: OrgNavItem[] = [
    {
      id: 'dashboard',
      href: `${base}/dashboard`,
      label: 'Dashboard',
      group: 'overview',
    },
  ];

  if (caps.canOperate && (caps.canManageShifts || caps.canReviewTimesheets)) {
    items.push({
      id: 'shifts',
      href: `${base}/shifts`,
      label: 'Shifts',
      group: 'operations',
    });
  }

  if (caps.canOperate && caps.canReviewTimesheets) {
    items.push({
      id: 'timesheets',
      href: `${base}/timesheets`,
      label: 'Timesheets',
      group: 'operations',
    });
  }

  if (caps.canOperate && caps.canManageLocations) {
    items.push({
      id: 'locations',
      href: `${base}/locations`,
      label: 'Locations & wards',
      group: 'operations',
    });
  }

  // Billing-only: dashboard + payments + settings (no ops mutate destinations in nav).
  if (caps.canOperate && caps.canAccessBilling) {
    items.push({
      id: 'payments',
      href: `${base}/payments`,
      label: 'Worker payments',
      group: 'finance',
    });
  }

  items.push({
    id: 'settings',
    href: `${base}/settings`,
    label: 'Settings',
    group: 'organization',
  });

  return items;
}

export const ORG_NAV_GROUP_LABELS: Record<OrgNavItem['group'], string> = {
  overview: 'Overview',
  operations: 'Operations',
  finance: 'Finance',
  organization: 'Organization',
};

export type ShiftMetricRow = {
  status: string;
  starts_at: string;
  required_role?: string | null;
  acceptance_deadline?: string | null;
};

export function countOpenShifts(shifts: ShiftMetricRow[], now = new Date()): number {
  return shifts.filter(
    (s) =>
      s.status === 'published' &&
      new Date(s.starts_at).getTime() >= now.getTime(),
  ).length;
}

export function countFilledUpcoming(
  shifts: ShiftMetricRow[],
  now = new Date(),
  days = 30,
): number {
  const end = now.getTime() + days * 24 * 60 * 60 * 1000;
  return shifts.filter((s) => {
    if (s.status !== 'filled') return false;
    const start = new Date(s.starts_at).getTime();
    return start >= now.getTime() && start <= end;
  }).length;
}

export function countDraftShifts(shifts: ShiftMetricRow[]): number {
  return shifts.filter((s) => s.status === 'draft').length;
}

export type WeekBucket = {
  weekStartIso: string;
  label: string;
  published: number;
  filled: number;
  cancelled: number;
};

/** Six calendar weeks starting from the Monday of the week containing `from`. */
export function buildShiftCoverageTrend(
  shifts: ShiftMetricRow[],
  from: Date = new Date(),
  weekCount = 6,
): WeekBucket[] {
  const monday = startOfWeekMonday(from);
  const buckets: WeekBucket[] = [];

  for (let i = 0; i < weekCount; i += 1) {
    const start = new Date(monday);
    start.setUTCDate(monday.getUTCDate() + i * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    const label = formatWeekLabel(start);
    buckets.push({
      weekStartIso: start.toISOString(),
      label,
      published: 0,
      filled: 0,
      cancelled: 0,
    });

    for (const shift of shifts) {
      const t = new Date(shift.starts_at).getTime();
      if (t < start.getTime() || t >= end.getTime()) continue;
      const bucket = buckets[i]!;
      if (shift.status === 'published') bucket.published += 1;
      else if (shift.status === 'filled' || shift.status === 'in_progress' || shift.status === 'awaiting_approval' || shift.status === 'completed') {
        bucket.filled += 1;
      } else if (shift.status === 'cancelled') {
        bucket.cancelled += 1;
      }
    }
  }

  return buckets;
}

export type RoleCoverage = {
  role: WorkerRole;
  label: string;
  count: number;
  total: number;
};

export function buildRoleCoverage(
  shifts: ShiftMetricRow[],
  from: Date = new Date(),
  weekCount = 6,
): RoleCoverage[] {
  const monday = startOfWeekMonday(from);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + weekCount * 7);

  const counts: Record<WorkerRole, number> = {
    registered_nurse: 0,
    ward_assistant: 0,
  };

  for (const shift of shifts) {
    const t = new Date(shift.starts_at).getTime();
    if (t < monday.getTime() || t >= end.getTime()) continue;
    if (shift.status === 'cancelled' || shift.status === 'draft') continue;
    const role = shift.required_role as WorkerRole | null | undefined;
    if (role === 'registered_nurse' || role === 'ward_assistant') {
      counts[role] += 1;
    }
  }

  const total = counts.registered_nurse + counts.ward_assistant;
  return (['registered_nurse', 'ward_assistant'] as const).map((role) => ({
    role,
    label: WORKER_ROLE_LABELS[role],
    count: counts[role],
    total,
  }));
}

export type AttentionItem = {
  id: string;
  priority: number;
  title: string;
  context: string;
  href: string;
  status: string;
};

export function buildAttentionQueue(params: {
  slug: string;
  orgStatus: OrgStatus;
  locationCount: number;
  draftShifts: Array<{ id: string; title: string | null; starts_at: string }>;
  openNearDeadline: Array<{
    id: string;
    title: string | null;
    acceptance_deadline: string | null;
  }>;
  submittedTimesheetCount: number;
  now?: Date;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  const base = `/org/${params.slug}`;
  const now = params.now ?? new Date();

  if (params.orgStatus === 'pending' || params.orgStatus === 'rejected') {
    items.push({
      id: 'org-profile',
      priority: 10,
      title: 'Organization profile needs attention',
      context: orgOperationalBlockedMessage(params.orgStatus) ?? 'Complete your organization profile.',
      href: `${base}/settings`,
      status: params.orgStatus === 'rejected' ? 'Action required' : 'Pending',
    });
  }

  if (params.orgStatus === 'under_review') {
    items.push({
      id: 'org-review',
      priority: 20,
      title: 'Bridge Hive is reviewing your organization',
      context: 'Operational tools unlock after activation.',
      href: `${base}/settings`,
      status: 'Under review',
    });
  }

  if (isOrgOperational(params.orgStatus) && params.locationCount === 0) {
    items.push({
      id: 'no-locations',
      priority: 30,
      title: 'Add a location before creating shifts',
      context: 'Shifts require at least one location and ward.',
      href: `${base}/locations?new=1`,
      status: 'Setup',
    });
  }

  if (params.submittedTimesheetCount > 0) {
    items.push({
      id: 'timesheets',
      priority: 40,
      title:
        params.submittedTimesheetCount === 1
          ? '1 timesheet awaiting review'
          : `${params.submittedTimesheetCount} timesheets awaiting review`,
      context: 'Approve or reject submitted hours.',
      href: `${base}/timesheets`,
      status: 'Review',
    });
  }

  for (const shift of params.openNearDeadline.slice(0, 5)) {
    if (!shift.acceptance_deadline) continue;
    const deadline = new Date(shift.acceptance_deadline).getTime();
    const hoursLeft = (deadline - now.getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 0 || hoursLeft > 72) continue;
    items.push({
      id: `deadline-${shift.id}`,
      priority: 50 + Math.max(0, hoursLeft),
      title: shift.title?.trim() || 'Open shift',
      context: `Acceptance cutoff in ${Math.ceil(hoursLeft)}h`,
      href: `${base}/shifts/${shift.id}`,
      status: 'Due soon',
    });
  }

  for (const draft of params.draftShifts.slice(0, 5)) {
    items.push({
      id: `draft-${draft.id}`,
      priority: 80,
      title: draft.title?.trim() || 'Untitled draft',
      context: 'Draft not yet published',
      href: `${base}/shifts/${draft.id}`,
      status: 'Draft',
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

export function orgLifecycleBannerTone(
  status: OrgStatus,
): 'info' | 'warning' | 'danger' | 'success' | 'muted' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
    case 'under_review':
      return 'info';
    case 'rejected':
      return 'warning';
    case 'suspended':
    case 'closed':
      return 'danger';
    default:
      return 'muted';
  }
}

/** Honest finance copy — commission is not an organization expense. */
export const ORG_PAYS_WORKER_GROSS_COPY =
  'Your organization pays the worker’s approved gross shift amount directly. Bridge Hive invoices the worker separately for the platform commission.';

export const ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE =
  'Payment instructions and bank-account details are not available in this workspace.';

export function truncateWorkerId(workerId: string | null | undefined): string {
  if (!workerId) return '—';
  return `${workerId.slice(0, 8)}…`;
}

function startOfWeekMonday(from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(start: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(start);
}

export function orgRoleExplanation(role: OrgRole): string {
  switch (role) {
    case 'org_admin':
      return 'Organization Admin — manage profile, locations, shifts, timesheets, and worker payment visibility.';
    case 'org_scheduler':
      return 'Scheduler — manage locations, shifts, assignments, and timesheet review.';
    case 'org_billing':
      return 'Billing — view operational data and approved gross worker payment obligations.';
    default:
      return role;
  }
}

/** Max length for organization display_name (presentation field). */
export const ORG_DISPLAY_NAME_MAX_LENGTH = 120;

const OWNED_ORG_LOGO_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+\.(jpg|jpeg|png)$/i;

/** True when path is under the organization UUID folder with a safe image filename. */
export function isOwnedOrganizationLogoPath(
  organizationId: string,
  path: string | null | undefined,
): boolean {
  if (!organizationId || !path) return false;
  if (!OWNED_ORG_LOGO_PATH.test(path)) return false;
  return path.toLowerCase().startsWith(`${organizationId.toLowerCase()}/`);
}

const OWNED_LOCATION_IMAGE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+\.(jpg|jpeg|png)$/i;

/** Path shape: <orgUuid>/<locationUuid>/<file>.jpg */
export function isOwnedLocationImagePath(
  organizationId: string,
  locationId: string,
  path: string | null | undefined,
): boolean {
  if (!organizationId || !locationId || !path) return false;
  if (!OWNED_LOCATION_IMAGE_PATH.test(path)) return false;
  const prefix = `${organizationId.toLowerCase()}/${locationId.toLowerCase()}/`;
  return path.toLowerCase().startsWith(prefix);
}

/** Deterministic initials from display name (Unicode-safe, max 2). */
export function organizationInitials(displayName: string | null | undefined): string {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BH';
  const first = Array.from(parts[0]!)[0] ?? '';
  if (parts.length === 1) {
    const chars = Array.from(parts[0]!);
    return (chars.slice(0, 2).join('') || 'BH').toUpperCase();
  }
  const second = Array.from(parts[1]!)[0] ?? '';
  return `${first}${second}`.toUpperCase() || 'BH';
}

/** Normalize and validate display name. Returns trimmed name or error. */
export function normalizeOrganizationDisplayName(
  raw: string | null | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  if (raw == null) {
    return { ok: false, error: 'Display name is required.' };
  }
  // Strip control characters then trim
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) {
    return { ok: false, error: 'Display name cannot be blank.' };
  }
  if (cleaned.length > ORG_DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Display name must be ${ORG_DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: cleaned };
}

export type OrgProfileCompletenessInput = {
  legalName?: string | null;
  displayName?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
};

/**
 * Profile completeness from submit_organization_for_review required fields.
 * Optional logo is intentionally excluded from the denominator.
 * Completeness is not admin approval — 100% may still be Under review.
 */
export function orgProfileCompleteness(values: OrgProfileCompletenessInput): {
  complete: number;
  total: number;
  nextMissingLabel: string | null;
  percent: number;
} {
  const fields: Array<{ label: string; value?: string | null }> = [
    { label: 'Legal name', value: values.legalName },
    { label: 'Display name', value: values.displayName },
    { label: 'Contact name', value: values.primaryContactName },
    { label: 'Contact email', value: values.primaryContactEmail },
  ];
  const total = fields.length;
  let complete = 0;
  let nextMissingLabel: string | null = null;
  for (const field of fields) {
    if (field.value != null && field.value.trim() !== '') {
      complete += 1;
    } else if (!nextMissingLabel) {
      nextMissingLabel = field.label;
    }
  }
  return {
    complete,
    total,
    nextMissingLabel,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}

export type CoverageRateResult =
  | { kind: 'rate'; filled: number; published: number; percent: number; periodLabel: string }
  | { kind: 'empty'; periodLabel: string; message: string };

/** Filled upcoming / published+filled upcoming for a period. */
export function shiftCoverageRate(
  shifts: Array<{ status: string; starts_at: string }>,
  now = new Date(),
  days = 30,
): CoverageRateResult {
  const periodLabel = `Next ${days} days`;
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const window = shifts.filter((s) => {
    const t = new Date(s.starts_at).getTime();
    return t >= now.getTime() && t <= end.getTime();
  });
  const publishedLike = window.filter(
    (s) => s.status === 'published' || s.status === 'filled',
  );
  if (publishedLike.length === 0) {
    return {
      kind: 'empty',
      periodLabel,
      message: 'No published shifts',
    };
  }
  const filled = publishedLike.filter((s) => s.status === 'filled').length;
  const published = publishedLike.length;
  return {
    kind: 'rate',
    filled,
    published,
    percent: Math.round((filled / published) * 100),
    periodLabel,
  };
}

export type TurnaroundResult =
  | { kind: 'median'; hours: number; sampleSize: number; periodLabel: string }
  | { kind: 'insufficient'; periodLabel: string; message: string };

/** Median hours from submission to review for reviewed timesheets. */
export function timesheetReviewTurnaroundHours(
  rows: Array<{ submitted_at: string | null; reviewed_at: string | null }>,
  now = new Date(),
  days = 30,
): TurnaroundResult {
  const periodLabel = `Previous ${days} days`;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const durations: number[] = [];
  for (const row of rows) {
    if (!row.submitted_at || !row.reviewed_at) continue;
    const submitted = new Date(row.submitted_at);
    const reviewed = new Date(row.reviewed_at);
    if (reviewed < start || reviewed > now) continue;
    const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) durations.push(hours);
  }
  if (durations.length < 2) {
    return {
      kind: 'insufficient',
      periodLabel,
      message: 'Not enough data',
    };
  }
  durations.sort((a, b) => a - b);
  const mid = Math.floor(durations.length / 2);
  const median =
    durations.length % 2 === 0
      ? (durations[mid - 1]! + durations[mid]!) / 2
      : durations[mid]!;
  return {
    kind: 'median',
    hours: Math.round(median * 10) / 10,
    sampleSize: durations.length,
    periodLabel,
  };
}

/** Estimated upcoming gross from rate × duration when both present. */
export function estimatedUpcomingGrossMinor(
  shifts: Array<{
    status: string;
    starts_at: string;
    ends_at: string;
    rate_minor: number | null;
    break_minutes?: number | null;
  }>,
  now = new Date(),
  days = 30,
): { amountMinor: number; counted: number; skipped: number; periodLabel: string } {
  const periodLabel = `Next ${days} days`;
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  let amountMinor = 0;
  let counted = 0;
  let skipped = 0;
  for (const shift of shifts) {
    if (!['published', 'filled', 'draft'].includes(shift.status)) continue;
    const start = new Date(shift.starts_at).getTime();
    if (start < now.getTime() || start > end.getTime()) continue;
    if (shift.rate_minor == null || shift.rate_minor <= 0) {
      skipped += 1;
      continue;
    }
    const endMs = new Date(shift.ends_at).getTime();
    const breakMs = (shift.break_minutes ?? 0) * 60 * 1000;
    const workedMs = Math.max(0, endMs - start - breakMs);
    const hours = workedMs / (1000 * 60 * 60);
    if (hours <= 0) {
      skipped += 1;
      continue;
    }
    amountMinor += Math.round(shift.rate_minor * hours);
    counted += 1;
  }
  return { amountMinor, counted, skipped, periodLabel };
}

export function locationWorkload(
  shifts: Array<{ location_id: string | null; location_name?: string | null }>,
): Array<{ locationId: string; name: string; count: number }> {
  const map = new Map<string, { name: string; count: number }>();
  for (const shift of shifts) {
    if (!shift.location_id) continue;
    const existing = map.get(shift.location_id);
    const name = shift.location_name?.trim() || 'Location';
    if (existing) {
      existing.count += 1;
    } else {
      map.set(shift.location_id, { name, count: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([locationId, v]) => ({ locationId, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

/* -------------------------------------------------------------------------- */
/* Organization activity (historical, org-timezone buckets)                   */
/* -------------------------------------------------------------------------- */

export type OrgActivityRangeDays = 7 | 30 | 90;

export type OrgActivityShiftRow = {
  id: string;
  created_at: string;
  status: string;
};

export type OrgActivityAssignmentRow = {
  id: string;
  worker_id: string;
  accepted_at: string;
  status: string;
};

export type OrgActivityTimesheetRow = {
  id: string;
  reviewed_at: string | null;
  status: string;
};

export type OrgActivityBucket = {
  key: string;
  label: string;
  shiftsCreated: number;
  acceptances: number;
  participatingWorkers: number;
  timesheetsApproved: number;
};

export type OrgActivityTotals = {
  shiftsCreated: number;
  acceptances: number;
  participatingWorkers: number;
  timesheetsApproved: number;
  /** Current status among shifts created in the period (not publish history). */
  statusBreakdown: Record<string, number>;
};

export type OrgActivitySeries = {
  rangeDays: OrgActivityRangeDays;
  granularity: 'day' | 'week';
  timeZone: string;
  periodStartYmd: string;
  periodEndYmd: string;
  periodLabel: string;
  buckets: OrgActivityBucket[];
  totals: OrgActivityTotals;
  priorTotals: OrgActivityTotals;
  priorPeriodStartYmd: string;
  priorPeriodEndYmd: string;
  priorPeriodLabel: string;
};

/** Max lookback so 90-day range can compare to the prior 90 days. */
export const ORG_ACTIVITY_FETCH_LOOKBACK_DAYS = 180;

export function isOrgActivityRangeDays(value: unknown): value is OrgActivityRangeDays {
  return value === 7 || value === 30 || value === 90;
}

/** Local calendar YYYY-MM-DD for an instant in an IANA timezone. */
export function orgActivityYmdInTimeZone(
  instant: Date | string,
  timeZone: string,
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'Europe/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addOrgActivityCalendarDays(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

/** Monday (ISO) of the calendar week containing `ymd` (YMD arithmetic). */
export function mondayOfOrgActivityYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  const dow = dt.getUTCDay(); // 0 Sun … 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function eachYmdInclusive(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  let guard = 0;
  while (cur <= endYmd && guard < 400) {
    out.push(cur);
    cur = addOrgActivityCalendarDays(cur, 1);
    guard += 1;
  }
  return out;
}

function formatOrgActivityDayLabel(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 12));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(dt);
}

function formatOrgActivityWeekLabel(mondayYmd: string): string {
  const sunday = addOrgActivityCalendarDays(mondayYmd, 6);
  return `${formatOrgActivityDayLabel(mondayYmd)} – ${formatOrgActivityDayLabel(sunday)}`;
}

function formatOrgActivityPeriodLabel(startYmd: string, endYmd: string): string {
  return `${formatOrgActivityDayLabel(startYmd)} – ${formatOrgActivityDayLabel(endYmd)}`;
}

function emptyTotals(): OrgActivityTotals {
  return {
    shiftsCreated: 0,
    acceptances: 0,
    participatingWorkers: 0,
    timesheetsApproved: 0,
    statusBreakdown: {},
  };
}

function resolveActivityWindows(params: {
  timeZone: string;
  rangeDays: OrgActivityRangeDays;
  now: Date;
}) {
  const timeZone = params.timeZone || 'Europe/Nicosia';
  const periodEndYmd = orgActivityYmdInTimeZone(params.now, timeZone);
  const periodStartYmd = addOrgActivityCalendarDays(
    periodEndYmd,
    -(params.rangeDays - 1),
  );
  const priorPeriodEndYmd = addOrgActivityCalendarDays(periodStartYmd, -1);
  const priorPeriodStartYmd = addOrgActivityCalendarDays(
    priorPeriodEndYmd,
    -(params.rangeDays - 1),
  );
  return {
    timeZone,
    periodStartYmd,
    periodEndYmd,
    priorPeriodStartYmd,
    priorPeriodEndYmd,
  };
}

function accumulateTotals(params: {
  startYmd: string;
  endYmd: string;
  timeZone: string;
  shifts: OrgActivityShiftRow[];
  assignments: OrgActivityAssignmentRow[];
  timesheets: OrgActivityTimesheetRow[];
}): OrgActivityTotals {
  const totals = emptyTotals();
  const workers = new Set<string>();

  for (const shift of params.shifts) {
    const ymd = orgActivityYmdInTimeZone(shift.created_at, params.timeZone);
    if (!ymd || ymd < params.startYmd || ymd > params.endYmd) continue;
    totals.shiftsCreated += 1;
    totals.statusBreakdown[shift.status] =
      (totals.statusBreakdown[shift.status] ?? 0) + 1;
  }

  for (const row of params.assignments) {
    const ymd = orgActivityYmdInTimeZone(row.accepted_at, params.timeZone);
    if (!ymd || ymd < params.startYmd || ymd > params.endYmd) continue;
    totals.acceptances += 1;
    if (row.worker_id) workers.add(row.worker_id);
  }
  totals.participatingWorkers = workers.size;

  for (const row of params.timesheets) {
    if (row.status !== 'approved' || !row.reviewed_at) continue;
    const ymd = orgActivityYmdInTimeZone(row.reviewed_at, params.timeZone);
    if (!ymd || ymd < params.startYmd || ymd > params.endYmd) continue;
    totals.timesheetsApproved += 1;
  }

  return totals;
}

/**
 * Historical organization activity series for 7 / 30 / 90 local days.
 * Acceptances include later withdrawn/cancelled (event history by accepted_at).
 * Participating workers = distinct worker_id in the period (never PII).
 */
export function buildOrgActivitySeries(params: {
  shifts: OrgActivityShiftRow[];
  assignments: OrgActivityAssignmentRow[];
  timesheets: OrgActivityTimesheetRow[];
  timeZone: string;
  rangeDays: OrgActivityRangeDays;
  now?: Date;
}): OrgActivitySeries {
  const now = params.now ?? new Date();
  const windows = resolveActivityWindows({
    timeZone: params.timeZone,
    rangeDays: params.rangeDays,
    now,
  });
  const granularity: 'day' | 'week' = params.rangeDays === 90 ? 'week' : 'day';

  const dayKeys = eachYmdInclusive(windows.periodStartYmd, windows.periodEndYmd);
  const bucketKeys =
    granularity === 'day'
      ? dayKeys
      : Array.from(new Set(dayKeys.map(mondayOfOrgActivityYmd))).sort();

  const buckets: OrgActivityBucket[] = bucketKeys.map((key) => ({
    key,
    label:
      granularity === 'day'
        ? formatOrgActivityDayLabel(key)
        : formatOrgActivityWeekLabel(key),
    shiftsCreated: 0,
    acceptances: 0,
    participatingWorkers: 0,
    timesheetsApproved: 0,
  }));
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  const workersByBucket = new Map<string, Set<string>>();

  const bucketKeyForYmd = (ymd: string): string | null => {
    if (ymd < windows.periodStartYmd || ymd > windows.periodEndYmd) return null;
    const key = granularity === 'day' ? ymd : mondayOfOrgActivityYmd(ymd);
    return bucketIndex.has(key) ? key : null;
  };

  for (const shift of params.shifts) {
    const ymd = orgActivityYmdInTimeZone(shift.created_at, windows.timeZone);
    const key = ymd ? bucketKeyForYmd(ymd) : null;
    if (!key) continue;
    buckets[bucketIndex.get(key)!]!.shiftsCreated += 1;
  }

  for (const row of params.assignments) {
    const ymd = orgActivityYmdInTimeZone(row.accepted_at, windows.timeZone);
    const key = ymd ? bucketKeyForYmd(ymd) : null;
    if (!key) continue;
    buckets[bucketIndex.get(key)!]!.acceptances += 1;
    if (row.worker_id) {
      let set = workersByBucket.get(key);
      if (!set) {
        set = new Set();
        workersByBucket.set(key, set);
      }
      set.add(row.worker_id);
    }
  }

  for (const [key, set] of workersByBucket) {
    const idx = bucketIndex.get(key);
    if (idx == null) continue;
    buckets[idx]!.participatingWorkers = set.size;
  }

  for (const row of params.timesheets) {
    if (row.status !== 'approved' || !row.reviewed_at) continue;
    const ymd = orgActivityYmdInTimeZone(row.reviewed_at, windows.timeZone);
    const key = ymd ? bucketKeyForYmd(ymd) : null;
    if (!key) continue;
    buckets[bucketIndex.get(key)!]!.timesheetsApproved += 1;
  }

  const totals = accumulateTotals({
    startYmd: windows.periodStartYmd,
    endYmd: windows.periodEndYmd,
    timeZone: windows.timeZone,
    shifts: params.shifts,
    assignments: params.assignments,
    timesheets: params.timesheets,
  });
  const priorTotals = accumulateTotals({
    startYmd: windows.priorPeriodStartYmd,
    endYmd: windows.priorPeriodEndYmd,
    timeZone: windows.timeZone,
    shifts: params.shifts,
    assignments: params.assignments,
    timesheets: params.timesheets,
  });

  return {
    rangeDays: params.rangeDays,
    granularity,
    timeZone: windows.timeZone,
    periodStartYmd: windows.periodStartYmd,
    periodEndYmd: windows.periodEndYmd,
    periodLabel: formatOrgActivityPeriodLabel(
      windows.periodStartYmd,
      windows.periodEndYmd,
    ),
    buckets,
    totals,
    priorTotals,
    priorPeriodStartYmd: windows.priorPeriodStartYmd,
    priorPeriodEndYmd: windows.priorPeriodEndYmd,
    priorPeriodLabel: formatOrgActivityPeriodLabel(
      windows.priorPeriodStartYmd,
      windows.priorPeriodEndYmd,
    ),
  };
}

/** Local YMD to start fetching (180-day lookback including today). */
export function orgActivityFetchStartYmd(timeZone: string, now = new Date()): string {
  const today = orgActivityYmdInTimeZone(now, timeZone || 'Europe/Nicosia');
  return addOrgActivityCalendarDays(today, -(ORG_ACTIVITY_FETCH_LOOKBACK_DAYS - 1));
}
