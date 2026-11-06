import {
  SHIFT_OCCUPYING_ASSIGNMENT_STATUSES,
  buildAttentionQueue,
  buildDashboardQuickActions,
  buildOrgActivitySeries,
  buildRoleCoverage,
  buildShiftCoverageTrend,
  countFilledUpcoming,
  countOpenShifts,
  filterCalendarShifts,
  isOccupyingAssignmentStatus,
  isWorkerRole,
  locationWorkload,
  mapShiftToCalendarEvent,
  orgActivityFetchStartYmd,
  ORG_STATUS_LABELS,
  orgLifecycleBannerTone,
  orgOperationalBlockedMessage,
  orgPendingSubmitMessage,
  orgProfileCompleteness,
  orgSubmitCtaLabel,
  type OrgActivityRangeDays,
  type OrgStatus,
} from '@bridge-hive/domain';
import {
  BellRing,
  Building2,
  CalendarDays,
  ClipboardList,
  Lock,
  MapPin,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import { CoverageTrendChart, LocationWorkloadList, RoleCoverageBars } from '@/components/org/charts';
import { DashboardGreeting } from '@/components/org/dashboard-greeting';
import { DashboardQuickActions } from '@/components/org/dashboard-quick-actions';
import {
  AttentionQueueList,
  DashboardPanel,
  KpiCard,
  StatusBanner,
} from '@/components/org/dashboard-widgets';
import { OrganizationActivityPanel } from '@/components/org/organization-activity-panel';
import { ShiftScheduleCalendar } from '@/components/org/shift-schedule-calendar';
import { UpcomingShiftsRail } from '@/components/org/upcoming-shifts-rail';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import {
  resolveCalendarPeriod,
  todayYmdInTimezone,
} from '@/lib/org-calendar-time';
import { signedOrgLogoUrl } from '@/lib/org-signed-logo.server';
import { createClient } from '@/lib/supabase/server';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export default async function OrgDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    view?: string;
    date?: string;
    location?: string;
    role?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();
  const now = new Date();
  const timeZone = ctx.org.timezone || 'Europe/Nicosia';
  const todayYmd = todayYmdInTimezone(timeZone, now);
  const period = resolveCalendarPeriod({
    timeZone,
    viewRaw: 'month',
    dateRaw: sp.date,
    now,
  });

  const locationFilter =
    sp.location &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sp.location,
    )
      ? sp.location
      : null;
  const roleFilter = isWorkerRole(sp.role) ? sp.role : null;

  // Pad fetch window for cross-midnight segments
  const fetchStart = new Date(
    new Date(period.rangeStartIso).getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const fetchEnd = new Date(
    new Date(period.rangeEndIso).getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();
  const sixWeeksEnd = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000);
  const periodDays = 30;
  const inPeriod = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const activityFetchStartYmd = orgActivityFetchStartYmd(timeZone, now);
  const activitySinceIso = fromZonedTime(
    `${activityFetchStartYmd}T00:00:00`,
    timeZone,
  ).toISOString();

  const [
    calendarResult,
    locationsListResult,
    { data: upcomingRows },
    submittedTimesheetsResult,
    { data: drafts },
    { data: openNear },
    { data: metricShifts },
    activityShiftsResult,
    activityAssignmentsResult,
    activityTimesheetsResult,
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select(
        'id, title, status, starts_at, ends_at, required_role, required_positions, rate_minor, currency, location_id, location:locations(name), ward:wards(name)',
      )
      .eq('organization_id', ctx.org.id)
      .lt('starts_at', fetchEnd)
      .gt('ends_at', fetchStart)
      .order('starts_at', { ascending: true }),
    supabase
      .from('locations')
      .select('id, name, wards(count)')
      .eq('organization_id', ctx.org.id)
      .order('name'),
    supabase
      .from('shifts')
      .select(
        'id, title, starts_at, ends_at, status, required_role, required_positions, rate_minor, currency, location_id, location:locations(name), ward:wards(name)',
      )
      .eq('organization_id', ctx.org.id)
      .in('status', ['published', 'filled', 'draft', 'in_progress'])
      .gte('starts_at', now.toISOString())
      .order('starts_at', { ascending: true })
      .limit(5),
    supabase
      .from('timesheets')
      .select(
        'id, assignment:shift_assignments!inner(shift:shifts!inner(organization_id))',
        { count: 'exact', head: true },
      )
      .eq('status', 'submitted')
      .eq('assignment.shift.organization_id', ctx.org.id),
    supabase
      .from('shifts')
      .select('id, title, starts_at')
      .eq('organization_id', ctx.org.id)
      .eq('status', 'draft')
      .order('starts_at', { ascending: true })
      .limit(10),
    supabase
      .from('shifts')
      .select('id, title, acceptance_deadline')
      .eq('organization_id', ctx.org.id)
      .eq('status', 'published')
      .not('acceptance_deadline', 'is', null)
      .order('acceptance_deadline', { ascending: true })
      .limit(10),
    supabase
      .from('shifts')
      .select(
        'id, title, status, starts_at, required_role, acceptance_deadline, location_id, location:locations(id, name)',
      )
      .eq('organization_id', ctx.org.id)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', sixWeeksEnd.toISOString()),
    supabase
      .from('shifts')
      .select('id, created_at, status')
      .eq('organization_id', ctx.org.id)
      .gte('created_at', activitySinceIso)
      .order('created_at', { ascending: true }),
    supabase
      .from('shift_assignments')
      .select(
        'id, worker_id, accepted_at, status, shift:shifts!inner(organization_id)',
      )
      .eq('shift.organization_id', ctx.org.id)
      .gte('accepted_at', activitySinceIso)
      .order('accepted_at', { ascending: true }),
    supabase
      .from('timesheets')
      .select(
        'id, status, reviewed_at, assignment:shift_assignments!inner(shift:shifts!inner(organization_id))',
      )
      .eq('assignment.shift.organization_id', ctx.org.id)
      .eq('status', 'approved')
      .gte('reviewed_at', activitySinceIso)
      .order('reviewed_at', { ascending: true }),
  ]);

  const calendarLoadError = Boolean(calendarResult.error);
  const activityLoadError = Boolean(
    activityShiftsResult.error ||
      activityAssignmentsResult.error ||
      activityTimesheetsResult.error,
  );
  const rawCalendarShifts = calendarResult.data ?? [];
  const upcomingRowsSafe = upcomingRows ?? [];
  const capacityShiftIds = [
    ...new Set([
      ...rawCalendarShifts.map((row) => row.id),
      ...upcomingRowsSafe.map((row) => row.id),
    ]),
  ];
  const { data: capacityAssignmentRows } =
    capacityShiftIds.length > 0
      ? await supabase
          .from('shift_assignments')
          .select('shift_id, status')
          .in('shift_id', capacityShiftIds)
          .in('status', [...SHIFT_OCCUPYING_ASSIGNMENT_STATUSES])
      : { data: [] as Array<{ shift_id: string; status: string }> };
  const filledCountByShift = new Map<string, number>();
  for (const row of capacityAssignmentRows ?? []) {
    if (!isOccupyingAssignmentStatus(row.status)) continue;
    filledCountByShift.set(
      row.shift_id,
      (filledCountByShift.get(row.shift_id) ?? 0) + 1,
    );
  }

  const orgLogoUrl = await signedOrgLogoUrl(ctx.org.id, ctx.org.logo_path);

  const locationRows = locationsListResult.data ?? [];
  const locationsCount = locationRows.length;
  const wardTotal = locationRows.reduce((sum, loc) => {
    const c = Array.isArray(loc.wards)
      ? (loc.wards[0] as { count?: number })?.count ?? 0
      : 0;
    return sum + c;
  }, 0);

  const submittedCount = submittedTimesheetsResult.count ?? 0;

  const inPeriodMs = inPeriod.getTime();
  const kpiShifts = (metricShifts ?? []).filter((row) => {
    if (!['published', 'filled', 'draft'].includes(row.status)) return false;
    return new Date(row.starts_at).getTime() <= inPeriodMs;
  });
  const locationShiftRows = (metricShifts ?? []).filter((row) => {
    if (!['published', 'filled'].includes(row.status)) return false;
    return new Date(row.starts_at).getTime() <= inPeriodMs;
  });

  const openCount = countOpenShifts(kpiShifts, now);
  const filledCount = countFilledUpcoming(kpiShifts, now, periodDays);
  const trend = buildShiftCoverageTrend(metricShifts ?? [], now, 6);
  const roleCoverage = buildRoleCoverage(metricShifts ?? [], now, 6);
  const workload = locationWorkload(
    locationShiftRows.map((row) => {
      const loc = Array.isArray(row.location) ? row.location[0] : row.location;
      return {
        location_id: row.location_id,
        location_name:
          loc && typeof loc === 'object' && 'name' in loc
            ? (loc as { name: string }).name
            : null,
      };
    }),
  );

  const activityShifts = (activityShiftsResult.data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    status: row.status,
  }));
  const activityAssignments = (activityAssignmentsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      worker_id: row.worker_id,
      accepted_at: row.accepted_at,
      status: row.status,
    }),
  );
  const activityTimesheets = (activityTimesheetsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      reviewed_at: row.reviewed_at,
      status: row.status,
    }),
  );
  const activityRanges: OrgActivityRangeDays[] = [7, 30, 90];
  const activitySeriesByRange = Object.fromEntries(
    activityRanges.map((rangeDays) => [
      rangeDays,
      buildOrgActivitySeries({
        shifts: activityShifts,
        assignments: activityAssignments,
        timesheets: activityTimesheets,
        timeZone,
        rangeDays,
        now,
      }),
    ]),
  ) as Record<OrgActivityRangeDays, ReturnType<typeof buildOrgActivitySeries>>;

  const attention = buildAttentionQueue({
    slug,
    orgStatus: ctx.org.status as OrgStatus,
    locationCount: locationsCount ?? 0,
    draftShifts: drafts ?? [],
    openNearDeadline: openNear ?? [],
    submittedTimesheetCount: submittedCount,
    now,
  });

  const toCalendarInput = (
    shift: {
      id: string;
      title: string | null;
      status: string;
      starts_at: string;
      ends_at: string;
      required_role: string;
      required_positions?: number | null;
      rate_minor?: number | null;
      currency?: string | null;
      location_id?: string | null;
      location?: unknown;
      ward?: unknown;
    },
  ) => {
    const location = Array.isArray(shift.location)
      ? shift.location[0]
      : shift.location;
    const ward = Array.isArray(shift.ward) ? shift.ward[0] : shift.ward;
    return {
      id: shift.id,
      title: shift.title,
      status: shift.status,
      starts_at: shift.starts_at,
      ends_at: shift.ends_at,
      required_role: shift.required_role,
      rate_minor: shift.rate_minor ?? null,
      currency: shift.currency ?? null,
      location_id: shift.location_id ?? null,
      location_name:
        location && typeof location === 'object' && 'name' in location
          ? (location as { name: string }).name
          : null,
      ward_name:
        ward && typeof ward === 'object' && 'name' in ward
          ? (ward as { name: string }).name
          : null,
      required_positions:
        typeof shift.required_positions === 'number'
          ? shift.required_positions
          : 1,
      filled_positions: filledCountByShift.get(shift.id) ?? 0,
    };
  };

  const calendarInputs = filterCalendarShifts(
    rawCalendarShifts.map(toCalendarInput),
    { locationId: locationFilter, role: roleFilter },
  );
  // Keep events intersecting the visible period
  const rangeStartMs = new Date(period.rangeStartIso).getTime();
  const rangeEndMs = new Date(period.rangeEndIso).getTime();
  const visibleInputs = calendarInputs.filter((s) => {
    const start = new Date(s.starts_at).getTime();
    const end = new Date(s.ends_at).getTime();
    return start < rangeEndMs && end > rangeStartMs;
  });
  const calendarEvents = visibleInputs.map((s) =>
    mapShiftToCalendarEvent(s, slug),
  );

  const upcomingEvents = upcomingRowsSafe
    .map(toCalendarInput)
    .map((s) => mapShiftToCalendarEvent(s, slug));

  const quickActions = buildDashboardQuickActions({
    slug,
    canOperate: ctx.capabilities.canOperate,
    canManageShifts: ctx.capabilities.canManageShifts,
    canReviewTimesheets: ctx.capabilities.canReviewTimesheets,
    canManageLocations: ctx.capabilities.canManageLocations,
    canAccessBilling: ctx.capabilities.canAccessBilling,
  });

  const profileComplete =
    orgProfileCompleteness({
      legalName: ctx.org.legal_name,
      displayName: ctx.org.display_name,
      primaryContactName: ctx.org.primary_contact_name,
      primaryContactEmail: ctx.org.primary_contact_email,
    }).complete === 4;
  const statusMessage =
    orgPendingSubmitMessage({
      status: ctx.org.status as OrgStatus,
      profileComplete,
    }) ?? orgOperationalBlockedMessage(ctx.org.status as OrgStatus);
  const submitCta = orgSubmitCtaLabel({
    status: ctx.org.status as OrgStatus,
    profileComplete,
  });
  const settingsHref =
    ctx.capabilities.canSubmitForReview && profileComplete
      ? `/org/${slug}/settings?tab=verification`
      : `/org/${slug}/settings`;
  const firstName =
    ctx.profile?.full_name?.trim().split(/\s+/)[0] ||
    ctx.user.email?.split('@')[0] ||
    'there';

  const hasFilters = Boolean(locationFilter || roleFilter);
  const filteredEmpty =
    !calendarLoadError && hasFilters && calendarEvents.length === 0;

  const locations = locationRows.map((l) => ({
    id: l.id as string,
    name: l.name as string,
  }));

  const dateLabel = formatInTimeZone(now, timeZone, 'EEEE, d MMM yyyy');
  const weekLabel = `Week ${formatInTimeZone(now, timeZone, 'I')}`;
  const hour = Number(formatInTimeZone(now, timeZone, 'H'));
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  // Forward-looking weekly buckets from real schedule data (not fabricated).
  const openSeries = trend.map((b) => b.published);
  const filledSeries = trend.map((b) => b.filled);

  return (
    <div className="bh-org-stack bh-org-enter">
      <DashboardGreeting
        firstName={firstName}
        orgName={ctx.org.display_name}
        orgLogoUrl={orgLogoUrl}
        dateLabel={dateLabel}
        weekLabel={weekLabel}
        greeting={greeting}
      />

      {statusMessage ? (
        <StatusBanner
          title={
            ORG_STATUS_LABELS[ctx.org.status as OrgStatus] ??
            ctx.org.status.toUpperCase()
          }
          body={statusMessage}
          tone={orgLifecycleBannerTone(ctx.org.status as OrgStatus)}
          action={
            ctx.capabilities.canSubmitForReview ? (
              <Button asChild size="sm" variant="outline">
                <Link href={settingsHref}>{submitCta}</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href={`/org/${slug}/settings`}>View status</Link>
              </Button>
            )
          }
        />
      ) : null}

      {ctx.capabilities.canOperate ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Open shifts"
              value={openCount}
              supporting="Published and claimable"
              href={`/org/${slug}/shifts?status=published&range=upcoming`}
              icon={CalendarDays}
              tint="info"
              featured
              series={openSeries}
            />
            <KpiCard
              label="Filled upcoming shifts"
              value={filledCount}
              supporting={`Next ${periodDays} days`}
              href={`/org/${slug}/shifts?status=filled&range=upcoming`}
              icon={CalendarDays}
              tint="honey"
              series={filledSeries}
            />
            <KpiCard
              label="Timesheets awaiting review"
              value={submittedCount}
              supporting={submittedCount > 0 ? 'Needs review' : 'All clear'}
              href={`/org/${slug}/timesheets`}
              icon={ClipboardList}
              tint={submittedCount > 0 ? 'warning' : 'success'}
              highlight={submittedCount > 0}
            />
            <KpiCard
              label="Active locations"
              value={locationsCount ?? 0}
              supporting={
                wardTotal > 0
                  ? `${wardTotal} ward${wardTotal === 1 ? '' : 's'}`
                  : 'Manage locations'
              }
              href={`/org/${slug}/locations`}
              icon={MapPin}
              tint="teal"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-6 xl:col-span-8 2xl:col-span-9">
              <ShiftScheduleCalendar
                slug={slug}
                timeZone={timeZone}
                view="month"
                monthOnly
                dateYmd={period.dateYmd}
                periodLabel={period.label}
                dayKeys={period.dayKeys}
                dayStartMs={period.dayStartMs}
                todayYmd={todayYmd}
                events={calendarEvents}
                locations={locations}
                locationFilter={locationFilter}
                roleFilter={roleFilter}
                canCreateShift={ctx.capabilities.canManageShifts}
                canReviewTimesheets={ctx.capabilities.canReviewTimesheets}
                loadError={calendarLoadError}
                filteredEmpty={filteredEmpty}
              />
              <OrganizationActivityPanel
                seriesByRange={activitySeriesByRange}
                loadError={activityLoadError}
                createShiftHref={`/org/${slug}/shifts/new`}
              />
            </div>

            <aside className="flex min-w-0 flex-col gap-6 xl:col-span-4 2xl:col-span-3">
              <UpcomingShiftsRail
                slug={slug}
                timeZone={timeZone}
                todayYmd={todayYmd}
                events={upcomingEvents}
                canCreate={ctx.capabilities.canManageShifts}
                showCreateInEmpty={false}
              />
              <DashboardQuickActions actions={quickActions} />
              <DashboardPanel
                title="Needs attention"
                eyebrow="Action queue"
                icon={BellRing}
                accent={attention.length > 0 ? 'honey' : 'emerald'}
                description={
                  attention.length > 0
                    ? `${attention.length} item${attention.length === 1 ? '' : 's'} from live data`
                    : undefined
                }
                className="!p-4 sm:!p-5"
              >
                <AttentionQueueList
                  items={attention}
                  slug={slug}
                  canManageShifts={ctx.capabilities.canManageShifts}
                  canReviewTimesheets={ctx.capabilities.canReviewTimesheets}
                  canManageLocations={ctx.capabilities.canManageLocations}
                  timeZone={timeZone}
                  initialNowIso={now.toISOString()}
                />
              </DashboardPanel>
            </aside>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#16384f]/18 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)]">
            <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-5 py-5 sm:px-6">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-bh-teal/30 blur-2xl"
              />
              <span
                aria-hidden
                className="bh-orb-drift pointer-events-none absolute -bottom-16 right-6 h-40 w-40 rounded-full bg-[#e4b334]/22 blur-2xl"
              />
              <span
                aria-hidden
                className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
              />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_18px_rgba(228,179,52,0.35)]">
                    <TrendingUp className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
                      Upcoming coverage
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e4b334]/15 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[#f3d27a] ring-1 ring-[#e4b334]/35">
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e4b334] motion-reduce:animate-none"
                        />
                        Outlook
                      </span>
                    </p>
                    <h2 className="mt-1 text-[18px] font-bold leading-tight tracking-tight text-white sm:text-[20px]">
                      Forward-looking staffing
                    </h2>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-white/75">
                      Schedule outlook for the next six weeks — separate from
                      historical organization activity.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                    Next 6 weeks
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[#e4b334] px-2.5 py-1 text-[11px] font-bold text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.32)]">
                    {periodDays}d sites
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 bg-[linear-gradient(180deg,#f4f8fb_0%,#eef4f8_100%)] p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              <DashboardPanel
                eyebrow="Forecast"
                title="Shift coverage trend"
                description="Published and filled · next six weeks"
                accent="teal"
                icon={TrendingUp}
                variant="premium"
                enterDelayMs={40}
              >
                <CoverageTrendChart
                  buckets={trend}
                  emptyHref={`/org/${slug}/shifts/new`}
                />
              </DashboardPanel>
              <DashboardPanel
                eyebrow="Staffing mix"
                title="Coverage by role"
                description="Required roles · next six weeks"
                accent="honey"
                icon={UsersRound}
                variant="premium"
                enterDelayMs={120}
              >
                <RoleCoverageBars
                  coverage={roleCoverage}
                  periodLabel="Next 6 weeks"
                />
              </DashboardPanel>
              <DashboardPanel
                eyebrow="Sites"
                title="Location workload"
                description={`Upcoming published and filled · next ${periodDays} days`}
                accent="info"
                icon={Building2}
                variant="premium"
                enterDelayMs={200}
                className="sm:col-span-2 xl:col-span-1"
              >
                <LocationWorkloadList
                  rows={workload}
                  slug={slug}
                  periodDays={periodDays}
                />
              </DashboardPanel>
            </div>
          </section>
        </>
      ) : (
        <DashboardPanel title="Workspace locked" icon={Lock}>
          <p className="text-sm text-bh-text-secondary">
            Operational tools unlock after Bridge Hive activates this organization.
          </p>
          {attention.length > 0 ? (
            <div className="mt-4">
              <AttentionQueueList items={attention} slug={slug} />
            </div>
          ) : null}
        </DashboardPanel>
      )}
    </div>
  );
}
