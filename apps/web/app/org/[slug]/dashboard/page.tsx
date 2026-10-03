import {
  buildAttentionQueue,
  buildDashboardQuickActions,
  buildRoleCoverage,
  buildShiftCoverageTrend,
  countFilledUpcoming,
  countOpenShifts,
  filterCalendarShifts,
  isOwnedOrganizationLogoPath,
  locationWorkload,
  mapShiftToCalendarEvent,
  ORG_STATUS_LABELS,
  orgLifecycleBannerTone,
  orgOperationalBlockedMessage,
  orgPendingSubmitMessage,
  orgProfileCompleteness,
  orgSubmitCtaLabel,
  type OrgStatus,
} from '@bridge-hive/domain';
import { CalendarDays, ClipboardList, MapPin } from 'lucide-react';
import Link from 'next/link';

import { CoverageTrendChart, LocationWorkloadList, RoleCoverageBars } from '@/components/org/charts';
import { DashboardGreeting } from '@/components/org/dashboard-greeting';
import { DashboardQuickActions } from '@/components/org/dashboard-quick-actions';
import { OrgDashboardBanner } from '@/components/org/org-dashboard-banner';
import {
  AttentionQueueList,
  DashboardPanel,
  KpiCard,
  StatusBanner,
} from '@/components/org/dashboard-widgets';
import { ShiftScheduleCalendar } from '@/components/org/shift-schedule-calendar';
import { UpcomingShiftsRail } from '@/components/org/upcoming-shifts-rail';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import {
  resolveCalendarPeriod,
  todayYmdInTimezone,
} from '@/lib/org-calendar-time';
import { createClient } from '@/lib/supabase/server';
import { formatInTimeZone } from 'date-fns-tz';

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
    viewRaw: sp.view,
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
  const roleFilter =
    sp.role === 'registered_nurse' || sp.role === 'ward_assistant'
      ? sp.role
      : null;

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

  const [
    calendarResult,
    locationsListResult,
    { count: locationsCount },
    { data: locationWardRows },
    { data: upcomingRows },
    { data: assignmentTimesheets },
    { data: drafts },
    { data: openNear },
    { data: kpiShifts },
    { data: metricShifts },
    { data: locationShiftRows },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select(
        'id, title, status, starts_at, ends_at, required_role, rate_minor, currency, location_id, location:locations(name), ward:wards(name)',
      )
      .eq('organization_id', ctx.org.id)
      .lt('starts_at', fetchEnd)
      .gt('ends_at', fetchStart)
      .order('starts_at', { ascending: true }),
    supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', ctx.org.id)
      .order('name'),
    supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.org.id),
    supabase
      .from('locations')
      .select('id, wards(count)')
      .eq('organization_id', ctx.org.id),
    supabase
      .from('shifts')
      .select(
        'id, title, starts_at, ends_at, status, required_role, rate_minor, currency, location_id, location:locations(name), ward:wards(name)',
      )
      .eq('organization_id', ctx.org.id)
      .in('status', ['published', 'filled', 'draft', 'in_progress'])
      .gte('starts_at', now.toISOString())
      .order('starts_at', { ascending: true })
      .limit(5),
    supabase
      .from('shift_assignments')
      .select(
        'id, timesheet:timesheets(status), shift:shifts!inner(organization_id)',
      )
      .eq('shift.organization_id', ctx.org.id)
      .not('status', 'in', '(withdrawn,cancelled)'),
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
      .select('id, status, starts_at, required_role, acceptance_deadline')
      .eq('organization_id', ctx.org.id)
      .in('status', ['published', 'filled', 'draft'])
      .gte('starts_at', now.toISOString())
      .lte('starts_at', inPeriod.toISOString()),
    supabase
      .from('shifts')
      .select('id, title, status, starts_at, required_role, acceptance_deadline')
      .eq('organization_id', ctx.org.id)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', sixWeeksEnd.toISOString()),
    supabase
      .from('shifts')
      .select('id, location_id, location:locations(id, name)')
      .eq('organization_id', ctx.org.id)
      .in('status', ['published', 'filled'])
      .gte('starts_at', now.toISOString())
      .lte('starts_at', inPeriod.toISOString()),
  ]);

  const calendarLoadError = Boolean(calendarResult.error);
  const rawCalendarShifts = calendarResult.data ?? [];

  let orgLogoUrl: string | null = null;
  if (isOwnedOrganizationLogoPath(ctx.org.id, ctx.org.logo_path)) {
    const { data: signed } = await supabase.storage
      .from('organization-logos')
      .createSignedUrl(ctx.org.logo_path!, 60 * 15);
    orgLogoUrl = signed?.signedUrl ?? null;
  }

  const wardTotal = (locationWardRows ?? []).reduce((sum, loc) => {
    const c = Array.isArray(loc.wards)
      ? (loc.wards[0] as { count?: number })?.count ?? 0
      : 0;
    return sum + c;
  }, 0);

  const submittedCount = (assignmentTimesheets ?? []).filter((a) => {
    const ts = Array.isArray(a.timesheet) ? a.timesheet[0] : a.timesheet;
    return ts && (ts as { status: string }).status === 'submitted';
  }).length;

  const openCount = countOpenShifts(kpiShifts ?? [], now);
  const filledCount = countFilledUpcoming(kpiShifts ?? [], now, periodDays);
  const trend = buildShiftCoverageTrend(metricShifts ?? [], now, 6);
  const roleCoverage = buildRoleCoverage(metricShifts ?? [], now, 6);
  const workload = locationWorkload(
    (locationShiftRows ?? []).map((row) => {
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

  const upcomingEvents = (upcomingRows ?? [])
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

  const locations = (locationsListResult.data ?? []).map((l) => ({
    id: l.id as string,
    name: l.name as string,
  }));

  const dateLabel = formatInTimeZone(now, timeZone, 'EEEE, d MMM yyyy');
  const weekLabel = `Week ${formatInTimeZone(now, timeZone, 'I')}`;
  const openSeries = trend.map((b) => b.published);
  const filledSeries = trend.map((b) => b.filled);
  const timesheetSeries = trend.map((b) => Math.min(b.published + b.filled, submittedCount || 0));
  const locationSeries = trend.map((_, i) =>
    Math.max(0, (locationsCount ?? 0) - Math.max(0, 5 - i)),
  );

  return (
    <div className="space-y-6 bh-fade-up">
      <OrgDashboardBanner />

      <DashboardGreeting
        firstName={firstName}
        orgName={ctx.org.display_name}
        orgLogoUrl={orgLogoUrl}
        dateLabel={dateLabel}
        weekLabel={weekLabel}
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
              href={`/org/${slug}/shifts?status=published`}
              icon={CalendarDays}
              tint="info"
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
              tint={submittedCount > 0 ? 'warning' : 'violet'}
              highlight={submittedCount > 0}
              series={timesheetSeries}
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
              series={locationSeries}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:gap-6">
            <div className="flex min-w-0 flex-col gap-5 xl:col-span-8 2xl:col-span-9">
              <ShiftScheduleCalendar
                slug={slug}
                timeZone={timeZone}
                view={period.view}
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

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <DashboardPanel
                  eyebrow="Forecast"
                  title="Shift coverage trend"
                  description="Published and filled · next six weeks"
                  accent="teal"
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
                  className="sm:col-span-2 xl:col-span-1"
                >
                  <LocationWorkloadList
                    rows={workload}
                    slug={slug}
                    periodDays={periodDays}
                  />
                </DashboardPanel>
              </div>
            </div>

            <aside className="flex min-w-0 flex-col gap-5 xl:col-span-4 2xl:col-span-3">
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
                />
              </DashboardPanel>
            </aside>
          </div>
        </>
      ) : (
        <DashboardPanel title="Workspace locked">
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
