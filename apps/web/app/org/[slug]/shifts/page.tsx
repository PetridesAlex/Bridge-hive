import {
  SHIFT_STATUSES,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  buildShiftCoverageTrend,
  countDraftShifts,
  countFilledUpcoming,
  countOpenShifts,
  filterCalendarShifts,
  isWorkerRole,
  mapShiftToCalendarEvent,
  type ShiftStatus,
} from '@bridge-hive/domain';
import { formatInTimeZone } from 'date-fns-tz';
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  LayoutList,
  MapPin,
  Moon,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sun,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { KpiCard } from '@/components/org/dashboard-widgets';
import {
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
import { ShiftScheduleCalendar } from '@/components/org/shift-schedule-calendar';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
import { Button } from '@/components/ui/button';
import { requireOrgMembership } from '@/lib/auth';
import { formatRate, roleLabel } from '@/lib/format';
import {
  resolveCalendarPeriod,
  shiftCalendarAnchor,
  todayYmdInTimezone,
} from '@/lib/org-calendar-time';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trendFromSeries(series: number[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2] ?? 0;
  const curr = series[series.length - 1] ?? 0;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

function weekBoundsIso(timeZone: string, dateYmd: string): { start: string; end: string } {
  const period = resolveCalendarPeriod({
    timeZone,
    viewRaw: 'week',
    dateRaw: dateYmd,
  });
  return { start: period.rangeStartIso, end: period.rangeEndIso };
}

export default async function ShiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    role?: string;
    status?: string;
    range?: string;
    q?: string;
    location?: string;
    view?: string;
    date?: string;
    page?: string;
    cal?: string;
    batch?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const {
    role: roleFilterRaw,
    status: statusFilter,
    range,
    q,
    location: locationRaw,
    view: viewRaw,
    date: dateRaw,
    page: pageRaw,
    cal: calRaw,
    batch: batchRaw,
  } = sp;

  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();
  const now = new Date();
  const timeZone = ctx.org.timezone || 'Europe/Nicosia';
  const todayYmd = todayYmdInTimezone(timeZone, now);
  const dateYmd = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : todayYmd;
  const listView = viewRaw !== 'calendar';
  const calendarMode = resolveCalendarPeriod({
    timeZone,
    viewRaw: calRaw === 'day' || calRaw === 'month' ? calRaw : 'week',
    dateRaw: dateYmd,
    now,
  });

  const roleFilter = isWorkerRole(roleFilterRaw) ? roleFilterRaw : null;
  const locationFilter =
    locationRaw && UUID_RE.test(locationRaw) ? locationRaw : null;
  const batchFilter = batchRaw && UUID_RE.test(batchRaw) ? batchRaw : null;

  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  const nowIso = now.toISOString();
  const { start: weekStart, end: weekEnd } = weekBoundsIso(timeZone, todayYmd);

  if (!ctx.capabilities.canOperate) {
    return (
      <EmptyState
        title="Organization not active"
        description="Shifts are available after Bridge Hive activates this organization."
      />
    );
  }

  const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString();
  const sixWeeksAhead = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString();

  const fetchStart = new Date(
    new Date(calendarMode.rangeStartIso).getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const fetchEnd = new Date(
    new Date(calendarMode.rangeEndIso).getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { data: shiftsRaw },
    { data: locationsList },
    { data: metricShifts },
    { data: calendarRows, error: calendarError },
  ] = await Promise.all([
    (() => {
      let query = supabase
        .from('shifts')
        .select(
          'id, title, status, starts_at, ends_at, required_role, rate_minor, currency, location_id, location:locations(name), ward:wards(name)',
        )
        .eq('organization_id', ctx.org.id)
        .order('starts_at', { ascending: range !== 'past' });

      if (roleFilter) query = query.eq('required_role', roleFilter);
      if (
        statusFilter &&
        (SHIFT_STATUSES as readonly string[]).includes(statusFilter)
      ) {
        query = query.eq('status', statusFilter as ShiftStatus);
      }
      if (locationFilter) query = query.eq('location_id', locationFilter);
      if (batchFilter) query = query.eq('creation_batch_id', batchFilter);
      if (range === 'upcoming') query = query.gte('starts_at', nowIso);
      else if (range === 'past') query = query.lt('starts_at', nowIso);

      return query;
    })(),
    supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', ctx.org.id)
      .order('name'),
    supabase
      .from('shifts')
      .select('id, status, starts_at, required_role')
      .eq('organization_id', ctx.org.id)
      .gte('starts_at', sixWeeksAgo)
      .lte('starts_at', sixWeeksAhead),
    listView
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from('shifts')
          .select(
            'id, title, status, starts_at, ends_at, required_role, rate_minor, currency, location_id, location:locations(name), ward:wards(name)',
          )
          .eq('organization_id', ctx.org.id)
          .lt('starts_at', fetchEnd)
          .gt('ends_at', fetchStart)
          .order('starts_at', { ascending: true }),
  ]);

  const qLower = q?.trim().toLowerCase() ?? '';
  const allFiltered = (shiftsRaw ?? []).filter((shift) => {
    if (!qLower) return true;
    const location = Array.isArray(shift.location) ? shift.location[0] : shift.location;
    const ward = Array.isArray(shift.ward) ? shift.ward[0] : shift.ward;
    const hay = [
      shift.title,
      location && typeof location === 'object' && 'name' in location
        ? (location as { name: string }).name
        : '',
      ward && typeof ward === 'object' && 'name' in ward
        ? (ward as { name: string }).name
        : '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(qLower);
  });

  const total = allFiltered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageShifts = allFiltered.slice(pageStart, pageStart + PAGE_SIZE);

  const shiftIds = pageShifts.map((s) => s.id);
  const { data: assignmentRows } =
    shiftIds.length > 0
      ? await supabase
          .from('shift_assignments')
          .select(
            'shift_id, status, worker:worker_profiles!shift_assignments_worker_id_fkey(user_id, worker_role, profile:profiles!worker_profiles_user_id_fkey(full_name))',
          )
          .in('shift_id', shiftIds)
          .not('status', 'in', '(withdrawn,cancelled)')
      : { data: [] as Array<{ shift_id: string; worker: unknown }> };

  const assigneeByShift = new Map<string, string>();
  for (const row of assignmentRows ?? []) {
    if (assigneeByShift.has(row.shift_id)) continue;
    const worker = Array.isArray(row.worker) ? row.worker[0] : row.worker;
    const profile =
      worker && typeof worker === 'object' && 'profile' in worker
        ? Array.isArray((worker as { profile: unknown }).profile)
          ? (worker as { profile: Array<{ full_name?: string }> }).profile[0]
          : (worker as { profile: { full_name?: string } | null }).profile
        : null;
    const name = profile?.full_name?.trim();
    if (name) assigneeByShift.set(row.shift_id, name);
    else assigneeByShift.set(row.shift_id, 'Assigned worker');
  }

  const metrics = metricShifts ?? [];
  const openCount = countOpenShifts(metrics, now);
  const filledCount = countFilledUpcoming(metrics, now, 30);
  const draftCount = countDraftShifts(metrics);
  const scheduledThisWeek = metrics.filter((s) => {
    const t = new Date(s.starts_at).getTime();
    return (
      t >= new Date(weekStart).getTime() &&
      t < new Date(weekEnd).getTime() &&
      s.status !== 'cancelled'
    );
  }).length;

  const trend = buildShiftCoverageTrend(metrics, now, 6);
  const openSeries = trend.map((b) => b.published);
  const filledSeries = trend.map((b) => b.filled);
  const draftSeries = trend.map((b) =>
    metrics.filter((s) => {
      const t = new Date(s.starts_at).getTime();
      const start = new Date(b.weekStartIso).getTime();
      const end = start + 7 * 24 * 60 * 60 * 1000;
      return s.status === 'draft' && t >= start && t < end;
    }).length,
  );
  const weekSeries = trend.map((b) => b.published + b.filled);

  const dateLabel = formatInTimeZone(
    new Date(`${dateYmd}T12:00:00`),
    timeZone,
    'EEE, d MMM yyyy',
  );
  const weekLabel = `Week ${formatInTimeZone(
    new Date(`${dateYmd}T12:00:00`),
    timeZone,
    'I',
  )}`;
  const prevWeek = shiftCalendarAnchor({
    timeZone,
    view: 'week',
    dateYmd,
    direction: 'prev',
  });
  const nextWeek = shiftCalendarAnchor({
    timeZone,
    view: 'week',
    dateYmd,
    direction: 'next',
  });

  const filterHref = (patch: Record<string, string | undefined>) => {
    const next = {
      role: roleFilter ?? undefined,
      status: statusFilter,
      range,
      q,
      location: locationFilter ?? undefined,
      batch: batchFilter ?? undefined,
      view: listView ? undefined : 'calendar',
      date: dateYmd !== todayYmd ? dateYmd : undefined,
      page: undefined as string | undefined,
      cal: !listView && calendarMode.view !== 'week' ? calendarMode.view : undefined,
      ...patch,
    };
    const paramsOut = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v) paramsOut.set(k, v);
    }
    const s = paramsOut.toString();
    return s ? `/org/${slug}/shifts?${s}` : `/org/${slug}/shifts`;
  };

  const hasFilters = Boolean(
    q || statusFilter || roleFilter || locationFilter || range || batchFilter,
  );

  const toCalendarInput = (shift: (typeof calendarRows extends (infer T)[] | null ? T : never) & object) => {
    const location = Array.isArray(shift.location) ? shift.location[0] : shift.location;
    const ward = Array.isArray(shift.ward) ? shift.ward[0] : shift.ward;
    return {
      id: shift.id as string,
      title: shift.title as string | null,
      status: shift.status as string,
      starts_at: shift.starts_at as string,
      ends_at: shift.ends_at as string,
      required_role: shift.required_role as string,
      rate_minor: shift.rate_minor as number | null,
      currency: shift.currency as string | null,
      location_id: shift.location_id as string | null,
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

  const calendarEvents = !listView
    ? filterCalendarShifts(
        (calendarRows ?? []).map(toCalendarInput),
        { locationId: locationFilter, role: roleFilter },
      ).map((s) => mapShiftToCalendarEvent(s, slug))
    : [];

  const locations = (locationsList ?? []).map((l) => ({
    id: l.id as string,
    name: l.name as string,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[28px] font-bold leading-9 tracking-tight text-bh-text">
            Shifts
          </h1>
          <p className="max-w-xl text-sm leading-6 text-bh-text-secondary">
            Create, publish and manage staffing across your locations.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {ctx.capabilities.canManageShifts && ctx.capabilities.canOperate ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild variant="honey">
                <Link href={`/org/${slug}/shifts/new`}>Create shift</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/org/${slug}/shifts/new/bulk`}>Create multiple shifts</Link>
              </Button>
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-2xl border border-bh-border bg-bh-surface px-3 py-2.5 shadow-[0_4px_16px_rgba(7,29,48,0.04)]">
          <Link
            href={filterHref({ date: prevWeek, page: undefined })}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-bh-text-muted hover:bg-bh-subtle hover:text-bh-text"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bh-accent-blue-soft text-bh-accent-blue">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-[9.5rem] px-1">
            <p className="text-sm font-semibold text-bh-text">{dateLabel}</p>
            <p className="text-xs font-medium text-bh-text-muted">{weekLabel}</p>
          </div>
          <Link
            href={filterHref({ date: nextWeek, page: undefined })}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-bh-text-muted hover:bg-bh-subtle hover:text-bh-text"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open shifts"
          value={openCount}
          supporting="Published and claimable"
          href={filterHref({ status: 'published', view: undefined, page: '1' })}
          icon={CalendarDays}
          tint="info"
          series={openSeries}
          trendPercent={trendFromSeries(openSeries)}
        />
        <KpiCard
          label="Filled shifts"
          value={filledCount}
          supporting="Assigned and confirmed"
          href={filterHref({ status: 'filled', view: undefined, page: '1' })}
          icon={Briefcase}
          tint="success"
          series={filledSeries}
          trendPercent={trendFromSeries(filledSeries)}
        />
        <KpiCard
          label="Draft shifts"
          value={draftCount}
          supporting="Not yet published"
          href={filterHref({ status: 'draft', view: undefined, page: '1' })}
          icon={FileEdit}
          tint="honey"
          series={draftSeries}
          trendPercent={trendFromSeries(draftSeries)}
        />
        <KpiCard
          label="Scheduled this week"
          value={scheduledThisWeek}
          supporting="Across all locations"
          href={filterHref({ range: 'upcoming', view: undefined, page: '1' })}
          icon={CalendarDays}
          tint="violet"
          series={weekSeries}
          trendPercent={trendFromSeries(weekSeries)}
        />
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-2xl border border-bh-border bg-bh-surface p-3 shadow-[0_4px_16px_rgba(7,29,48,0.04)] lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5 lg:p-3.5"
      >
        {viewRaw === 'calendar' ? (
          <input type="hidden" name="view" value="calendar" />
        ) : null}
        {dateYmd !== todayYmd ? (
          <input type="hidden" name="date" value={dateYmd} />
        ) : null}

        <div className="relative min-w-0 flex-1 lg:min-w-[220px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
            aria-hidden
          />
          <label htmlFor="q" className="sr-only">
            Search shifts
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search shifts, locations or wards…"
            className="h-10 w-full rounded-full border border-bh-border bg-bh-subtle/40 pl-9 pr-3 text-sm text-bh-text placeholder:text-bh-text-muted focus-visible:border-bh-accent-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-accent-blue/20"
          />
        </div>

        <select
          id="status"
          name="status"
          defaultValue={statusFilter ?? ''}
          aria-label="Status"
          className="h-10 rounded-full border border-bh-border bg-bh-surface px-3 text-sm font-medium text-bh-text"
        >
          <option value="">Status (All statuses)</option>
          {SHIFT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          id="role"
          name="role"
          defaultValue={roleFilter ?? ''}
          aria-label="Role"
          className="h-10 rounded-full border border-bh-border bg-bh-surface px-3 text-sm font-medium text-bh-text"
        >
          <option value="">Role (All roles)</option>
          {WORKER_ROLES.map((role) => (
            <option key={role} value={role}>
              {WORKER_ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <select
          id="location"
          name="location"
          defaultValue={locationFilter ?? ''}
          aria-label="Location"
          className="h-10 max-w-[200px] truncate rounded-full border border-bh-border bg-bh-surface px-3 text-sm font-medium text-bh-text"
        >
          <option value="">Location (All locations)</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        <select
          id="range"
          name="range"
          defaultValue={range ?? ''}
          aria-label="Date range"
          className="h-10 rounded-full border border-bh-border bg-bh-surface px-3 text-sm font-medium text-bh-text"
        >
          <option value="">Date (All dates)</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>

        <Button type="submit" variant="secondary" className="h-10 rounded-full px-4">
          Apply
        </Button>

        {hasFilters ? (
          <Link
            href={filterHref({
              q: undefined,
              status: undefined,
              role: undefined,
              location: undefined,
              range: undefined,
              page: undefined,
            })}
            className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-bh-text-secondary hover:text-bh-accent-blue"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </Link>
        ) : null}

        <div
          role="group"
          aria-label="Shifts view"
          className="ml-auto inline-flex rounded-xl border border-bh-border bg-bh-subtle/50 p-1"
        >
          <Link
            href={filterHref({ view: undefined, page: '1' })}
            aria-current={listView ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              listView
                ? 'bg-bh-sidebar text-white shadow-sm'
                : 'text-bh-text-secondary hover:text-bh-text',
            )}
          >
            <LayoutList className="h-3.5 w-3.5" aria-hidden />
            List
          </Link>
          <Link
            href={filterHref({ view: 'calendar', page: undefined })}
            aria-current={!listView ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              !listView
                ? 'bg-bh-sidebar text-white shadow-sm'
                : 'text-bh-text-secondary hover:text-bh-text',
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Calendar
          </Link>
        </div>
      </form>

      {!listView ? (
        <ShiftScheduleCalendar
          slug={slug}
          basePath={`/org/${slug}/shifts`}
          embedInShiftsList
          timeZone={timeZone}
          view={calendarMode.view}
          dateYmd={calendarMode.dateYmd}
          periodLabel={calendarMode.label}
          dayKeys={calendarMode.dayKeys}
          dayStartMs={calendarMode.dayStartMs}
          todayYmd={todayYmd}
          events={calendarEvents}
          locations={locations}
          locationFilter={locationFilter}
          roleFilter={roleFilter}
          canCreateShift={ctx.capabilities.canManageShifts}
          canReviewTimesheets={ctx.capabilities.canReviewTimesheets}
          loadError={Boolean(calendarError)}
          filteredEmpty={
            !calendarError &&
            Boolean(locationFilter || roleFilter) &&
            calendarEvents.length === 0
          }
        />
      ) : !pageShifts.length ? (
        <EmptyState
          title="No shifts match"
          description="Adjust filters or create a new shift."
          action={
            ctx.capabilities.canManageShifts ? (
              <Button asChild variant="honey">
                <Link href={`/org/${slug}/shifts/new`}>Create shift</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <OrgTableShell className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className={orgTableHeadClassName}>
                <tr>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Shift
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Date &amp; time
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Location / ward
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Role
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Rate
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Assignment
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageShifts.map((shift) => {
                  const location = Array.isArray(shift.location)
                    ? shift.location[0]
                    : shift.location;
                  const ward = Array.isArray(shift.ward) ? shift.ward[0] : shift.ward;
                  const locationName =
                    location && typeof location === 'object' && 'name' in location
                      ? (location as { name: string }).name
                      : null;
                  const wardName =
                    ward && typeof ward === 'object' && 'name' in ward
                      ? (ward as { name: string }).name
                      : null;
                  const hour = Number(
                    formatInTimeZone(new Date(shift.starts_at), timeZone, 'H'),
                  );
                  const isNight = hour < 6 || hour >= 20;
                  const ShiftIcon = isNight ? Moon : Sun;
                  const dateLine = formatInTimeZone(
                    new Date(shift.starts_at),
                    timeZone,
                    'EEE, d MMM yyyy',
                  );
                  const timeLine = `${formatInTimeZone(
                    new Date(shift.starts_at),
                    timeZone,
                    'HH:mm',
                  )} – ${formatInTimeZone(new Date(shift.ends_at), timeZone, 'HH:mm')}`;
                  const assignee = assigneeByShift.get(shift.id);
                  const initials = (assignee ?? 'U')
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={shift.id} className={orgTableRowClassName}>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/org/${slug}/shifts/${shift.id}`}
                          className="group flex items-start gap-3"
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                              isNight
                                ? 'bg-bh-sidebar/90 text-bh-honey'
                                : 'bg-bh-honey-soft text-bh-honey-strong',
                            )}
                          >
                            <ShiftIcon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-bh-text group-hover:text-bh-accent-blue">
                              {shift.title || roleLabel(shift.required_role)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-bh-text-secondary">
                              {isNight ? 'Night coverage' : 'Day coverage'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-bh-text">{dateLine}</p>
                        <p className="bh-tabular mt-0.5 text-xs text-bh-text-secondary">
                          {timeLine}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex min-w-0 max-w-[14rem] items-start gap-1.5">
                          <MapPin
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bh-teal-strong"
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-bh-text">
                              {locationName ?? '—'}
                            </span>
                            {wardName ? (
                              <span className="mt-0.5 block truncate text-xs text-bh-text-secondary">
                                {wardName}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
                            shift.required_role === 'registered_nurse' &&
                              'bg-bh-accent-blue-soft text-bh-accent-blue',
                            shift.required_role === 'ward_assistant' &&
                              'bg-bh-success-soft text-bh-success',
                            shift.required_role === 'physiotherapist' &&
                              'bg-bh-honey-soft text-bh-honey-strong',
                            shift.required_role !== 'registered_nurse' &&
                              shift.required_role !== 'ward_assistant' &&
                              shift.required_role !== 'physiotherapist' &&
                              'bg-bh-subtle text-bh-text-secondary',
                          )}
                        >
                          {WORKER_ROLE_LABELS[
                            shift.required_role as keyof typeof WORKER_ROLE_LABELS
                          ] ?? roleLabel(shift.required_role)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bh-tabular font-bold text-bh-text">
                          {formatRate(shift.rate_minor ?? 0, shift.currency ?? 'EUR')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {assignee ? (
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bh-teal-soft text-[10px] font-bold text-bh-teal-strong">
                              {initials}
                            </span>
                            <span className="truncate text-sm font-medium text-bh-text">
                              {assignee}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-sm text-bh-text-muted">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bh-subtle text-bh-text-muted">
                              <UserPlus className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <ShiftStatusBadge status={shift.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-bh-text-muted"
                        >
                          <Link
                            href={`/org/${slug}/shifts/${shift.id}`}
                            aria-label={`View ${shift.title || 'shift'}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </OrgTableShell>

          <ul className="space-y-3 md:hidden">
            {pageShifts.map((shift) => {
              const location = Array.isArray(shift.location)
                ? shift.location[0]
                : shift.location;
              const locationName =
                location && typeof location === 'object' && 'name' in location
                  ? (location as { name: string }).name
                  : null;
              const assignee = assigneeByShift.get(shift.id);
              return (
                <li key={shift.id}>
                  <Link
                    href={`/org/${slug}/shifts/${shift.id}`}
                    className="block rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-bh-text">
                          {shift.title || roleLabel(shift.required_role)}
                        </p>
                        <p className="mt-1 text-xs text-bh-text-secondary">
                          {formatInTimeZone(
                            new Date(shift.starts_at),
                            timeZone,
                            'EEE d MMM · HH:mm',
                          )}
                          {locationName ? ` · ${locationName}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-bh-text-muted">
                          {assignee ?? 'Unassigned'}
                        </p>
                      </div>
                      <ShiftStatusBadge status={shift.status} />
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bh-accent-blue">
                      View
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-bh-text-secondary">
              Showing{' '}
              <span className="font-semibold text-bh-text">
                {total === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, total)}
              </span>{' '}
              of <span className="font-semibold text-bh-text">{total}</span> shifts
            </p>
            {pageCount > 1 ? (
              <nav
                className="inline-flex items-center gap-1"
                aria-label="Pagination"
              >
                <Link
                  href={filterHref({
                    page: String(Math.max(1, safePage - 1)),
                  })}
                  aria-disabled={safePage <= 1}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border border-bh-border text-bh-text-secondary hover:bg-bh-subtle',
                    safePage <= 1 && 'pointer-events-none opacity-40',
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 ||
                      n === pageCount ||
                      Math.abs(n - safePage) <= 1,
                  )
                  .reduce<number[]>((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1]! > 1) acc.push(-1);
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n < 0 ? (
                      <span
                        key={`e-${idx}`}
                        className="px-1 text-bh-text-muted"
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        key={n}
                        href={filterHref({ page: String(n) })}
                        aria-current={n === safePage ? 'page' : undefined}
                        className={cn(
                          'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold',
                          n === safePage
                            ? 'bg-bh-sidebar text-white'
                            : 'border border-bh-border text-bh-text-secondary hover:bg-bh-subtle',
                        )}
                      >
                        {n}
                      </Link>
                    ),
                  )}
                <Link
                  href={filterHref({
                    page: String(Math.min(pageCount, safePage + 1)),
                  })}
                  aria-disabled={safePage >= pageCount}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border border-bh-border text-bh-text-secondary hover:bg-bh-subtle',
                    safePage >= pageCount && 'pointer-events-none opacity-40',
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </nav>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
