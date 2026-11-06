import {
  SHIFT_OCCUPYING_ASSIGNMENT_STATUSES,
  SHIFT_STATUSES,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  buildShiftCoverageTrend,
  countDraftShifts,
  countFilledUpcoming,
  countOpenShifts,
  isOccupyingAssignmentStatus,
  filterCalendarShifts,
  isWorkerRole,
  mapShiftToCalendarEvent,
  positionsAvailabilityLabel,
  type ShiftStatus,
} from '@bridge-hive/domain';
import { formatInTimeZone } from 'date-fns-tz';
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Layers,
  LayoutList,
  MapPin,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sun,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { KpiCard } from '@/components/org/dashboard-widgets';
import { OrgClientFilterForm } from '@/components/org/org-client-filter-form';
import {
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
import { ShiftScheduleCalendar } from '@/components/org/shift-schedule-calendar';
import { ShiftWeekNavigator } from '@/components/org/shift-week-navigator';
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

  // Prefer positions column when migrated; fall back so the list still loads
  // against environments that have not applied shift-positions capacity yet.
  const shiftListSelectWithPositions =
    'id, title, status, starts_at, ends_at, required_role, required_positions, rate_minor, currency, location_id, location:locations(name), ward:wards(name)' as const;
  const shiftListSelectLegacy =
    'id, title, status, starts_at, ends_at, required_role, rate_minor, currency, location_id, location:locations(name), ward:wards(name)' as const;

  function buildShiftListQuery(select: string, withCount = false) {
    let query = supabase
      .from('shifts')
      .select(select, withCount ? { count: 'exact' } : undefined)
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
  }

  const searchQ = q?.trim() ?? '';
  const paginateInDb = listView && searchQ.length === 0;
  const listFrom = (requestedPage: number) => (requestedPage - 1) * PAGE_SIZE;
  const applyPageRange = (
    query: ReturnType<typeof buildShiftListQuery>,
    requestedPage: number,
  ) => {
    const from = listFrom(requestedPage);
    return query.range(from, from + PAGE_SIZE - 1);
  };

  const emptyList = {
    data: [] as never[],
    error: null,
    count: 0,
  };

  const [
    listPrimary,
    { data: locationsList },
    { data: metricShifts },
    { data: calendarRows, error: calendarError },
  ] = await Promise.all([
    listView
      ? paginateInDb
        ? applyPageRange(
            buildShiftListQuery(shiftListSelectWithPositions, true),
            page,
          )
        : buildShiftListQuery(shiftListSelectWithPositions)
      : Promise.resolve(emptyList),
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
          .select(shiftListSelectWithPositions)
          .eq('organization_id', ctx.org.id)
          .lt('starts_at', fetchEnd)
          .gt('ends_at', fetchStart)
          .order('starts_at', { ascending: true }),
  ]);

  const listResult =
    listPrimary.error &&
    /required_positions/i.test(listPrimary.error.message ?? '')
      ? await (listView
          ? paginateInDb
            ? applyPageRange(
                buildShiftListQuery(shiftListSelectLegacy, true),
                page,
              )
            : buildShiftListQuery(shiftListSelectLegacy)
          : Promise.resolve(emptyList))
      : listPrimary;
  type ShiftListRow = {
    id: string;
    title: string | null;
    status: string;
    starts_at: string;
    ends_at: string;
    required_role: string;
    required_positions?: number | null;
    rate_minor: number;
    currency: string;
    location_id: string | null;
    location: { name: string } | { name: string }[] | null;
    ward: { name: string } | { name: string }[] | null;
  };
  const shiftsRaw = (listResult.data ?? null) as ShiftListRow[] | null;
  const listError =
    listResult.error &&
    !/required_positions/i.test(listResult.error.message ?? '')
      ? listResult.error
      : null;

  const qLower = searchQ.toLowerCase();
  const allFiltered = paginateInDb
    ? (shiftsRaw ?? [])
    : (shiftsRaw ?? []).filter((shift) => {
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

  const total = paginateInDb
    ? (listResult.count ?? allFiltered.length)
    : allFiltered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  let pageShifts = paginateInDb
    ? allFiltered
    : allFiltered.slice(pageStart, pageStart + PAGE_SIZE);

  if (paginateInDb && total > 0 && page > pageCount) {
    const retry = await applyPageRange(
      buildShiftListQuery(shiftListSelectWithPositions, true),
      safePage,
    );
    const retryResult =
      retry.error && /required_positions/i.test(retry.error.message ?? '')
        ? await applyPageRange(
            buildShiftListQuery(shiftListSelectLegacy, true),
            safePage,
          )
        : retry;
    pageShifts = (retryResult.data ?? []) as unknown as ShiftListRow[];
  }

  const shownFrom = total === 0 ? 0 : pageStart + 1;
  const shownTo = Math.min(pageStart + PAGE_SIZE, total);
  const shownCount = total === 0 ? 0 : Math.max(0, shownTo - shownFrom + 1);
  const coveragePct = total === 0 ? 0 : Math.round((shownCount / total) * 100);

  const listShiftIds = pageShifts.map((s) => s.id);
  const calendarShiftIds = !listView
    ? ((calendarRows ?? []) as Array<{ id: string }>).map((s) => s.id)
    : [];
  const capacityShiftIds = [...new Set([...listShiftIds, ...calendarShiftIds])];
  const { data: assignmentRows } =
    capacityShiftIds.length > 0
      ? await supabase
          .from('shift_assignments')
          .select(
            'shift_id, status, worker:worker_profiles!shift_assignments_worker_id_fkey(user_id, worker_role, profile:profiles!worker_profiles_user_id_fkey(full_name))',
          )
          .in('shift_id', capacityShiftIds)
          .in('status', [...SHIFT_OCCUPYING_ASSIGNMENT_STATUSES])
      : { data: [] as Array<{ shift_id: string; status: string; worker: unknown }> };

  const assigneeByShift = new Map<string, string>();
  const filledCountByShift = new Map<string, number>();
  for (const row of assignmentRows ?? []) {
    if (!isOccupyingAssignmentStatus(row.status)) continue;
    filledCountByShift.set(
      row.shift_id,
      (filledCountByShift.get(row.shift_id) ?? 0) + 1,
    );
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

  const activeFilterCount = [
    q,
    statusFilter,
    roleFilter,
    locationFilter,
    range,
    batchFilter,
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  const toCalendarInput = (shift: (typeof calendarRows extends (infer T)[] | null ? T : never) & object) => {
    const location = Array.isArray(shift.location) ? shift.location[0] : shift.location;
    const ward = Array.isArray(shift.ward) ? shift.ward[0] : shift.ward;
    const requiredPositions =
      'required_positions' in shift &&
      typeof (shift as { required_positions?: unknown }).required_positions ===
        'number'
        ? ((shift as { required_positions: number }).required_positions ?? 1)
        : 1;
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
      required_positions: requiredPositions,
      filled_positions: filledCountByShift.get(shift.id as string) ?? 0,
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
        <div className="min-w-0">
          <p className="mb-2.5 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bh-teal-strong">
            <span
              aria-hidden
              className="h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
            />
            Schedule
          </p>
          <h1 className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-[#071d30]">
            Shifts
          </h1>
          <p className="mt-3 max-w-md border-l-2 border-[#e4b334] pl-3 text-[15px] leading-6 tracking-[-0.011em] text-bh-text-secondary">
            Create, publish and manage staffing across your locations.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-3.5 sm:items-end">
          {ctx.capabilities.canManageShifts && ctx.capabilities.canOperate ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                asChild
                className="group relative h-14 min-h-14 overflow-hidden rounded-2xl border border-[#e4b334]/55 bg-[linear-gradient(165deg,#f6e2a4_0%,#e4b334_46%,#c9920f_100%)] px-4 pr-5 text-[15px] font-bold tracking-tight text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_16px_34px_rgba(201,146,15,0.36)] transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(165deg,#fbeec0_0%,#edbf48_46%,#d4a318_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_20px_40px_rgba(201,146,15,0.46)] focus-visible:ring-[#e4b334] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Link href={`/org/${slug}/shifts/new`}>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-6 -top-8 h-20 w-20 rounded-full bg-white/35 blur-2xl"
                  />
                  <span
                    aria-hidden
                    className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-70 bg-[linear-gradient(115deg,transparent_12%,rgba(255,255,255,0.55)_48%,transparent_78%)]"
                  />
                  <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#071d30] text-[#e4b334] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_16px_rgba(7,29,48,0.28)]">
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden />
                  </span>
                  <span className="relative">Create shift</span>
                  <ArrowUpRight
                    className="relative h-4 w-4 text-[#071d30]/70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button
                asChild
                className="group relative h-14 min-h-14 overflow-hidden rounded-2xl border border-white/18 bg-[linear-gradient(155deg,#16384f_0%,#071d30_56%,#0c3a42_100%)] px-4 pr-5 text-[15px] font-bold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_34px_rgba(7,29,48,0.38)] transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(155deg,#1d4d68_0%,#0c2844_56%,#146067_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_20px_40px_rgba(7,29,48,0.46)] focus-visible:ring-[#e4b334] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Link href={`/org/${slug}/shifts/new/bulk`}>
                  <span
                    aria-hidden
                    className="bh-orb-drift pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-[linear-gradient(90deg,#071d30_0%,#e4b334_52%,#16a6b6_100%)]"
                  />
                  <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.35)]">
                    <Layers className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
                  </span>
                  <span className="relative">Create multiple shifts</span>
                  <ArrowUpRight
                    className="relative h-4 w-4 text-[#f3d27a] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
            </div>
          ) : null}
          <ShiftWeekNavigator
            dateLabel={dateLabel}
            weekLabel={weekLabel}
            dateYmd={dateYmd}
            timeZone={timeZone}
            prevHref={filterHref({ date: prevWeek, page: undefined })}
            nextHref={filterHref({ date: nextWeek, page: undefined })}
            todayHref={filterHref({ date: todayYmd, page: undefined })}
            initialNowIso={now.toISOString()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open shifts"
          value={openCount}
          supporting="Published and claimable"
          href={filterHref({
            status: 'published',
            range: 'upcoming',
            role: undefined,
            location: undefined,
            q: undefined,
            batch: undefined,
            view: undefined,
            page: '1',
          })}
          icon={CalendarDays}
          tint="info"
          series={openSeries}
          trendPercent={trendFromSeries(openSeries)}
        />
        <KpiCard
          label="Filled shifts"
          value={filledCount}
          supporting="Assigned and confirmed"
          href={filterHref({
            status: 'filled',
            range: 'upcoming',
            role: undefined,
            location: undefined,
            q: undefined,
            batch: undefined,
            view: undefined,
            page: '1',
          })}
          icon={Briefcase}
          tint="success"
          series={filledSeries}
          trendPercent={trendFromSeries(filledSeries)}
        />
        <KpiCard
          label="Draft shifts"
          value={draftCount}
          supporting="Not yet published"
          href={filterHref({
            status: 'draft',
            range: undefined,
            role: undefined,
            location: undefined,
            q: undefined,
            batch: undefined,
            view: undefined,
            page: '1',
          })}
          icon={FileEdit}
          tint="honey"
          series={draftSeries}
          trendPercent={trendFromSeries(draftSeries)}
        />
        <KpiCard
          label="Scheduled this week"
          value={scheduledThisWeek}
          supporting="Across all locations"
          href={filterHref({
            status: undefined,
            range: 'upcoming',
            role: undefined,
            location: undefined,
            q: undefined,
            batch: undefined,
            view: undefined,
            page: '1',
          })}
          icon={CalendarDays}
          tint="violet"
          series={weekSeries}
          trendPercent={trendFromSeries(weekSeries)}
        />
      </div>

      <OrgClientFilterForm
        pathname={`/org/${slug}/shifts`}
        className="relative overflow-hidden rounded-2xl border border-[#16384f]/25 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)]"
      >
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-4 py-3.5 sm:px-5">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/35 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-orb-drift pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
          />
          <div className="relative flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.35)]">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
                Filters
                {hasFilters ? (
                  <span className="bh-tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e4b334] px-1.5 text-[10px] font-bold tracking-normal text-[#071d30]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-sm font-medium text-white/80">
                Narrow the schedule by status, role, or site
              </p>
            </div>
          </div>
          <div
            role="group"
            aria-label="Shifts view"
            className="relative inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-white/20"
          >
            <Link
              href={filterHref({ view: undefined, page: '1' })}
              aria-current={listView ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                listView
                  ? 'bg-[#e4b334] text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.35)]'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              )}
            >
              <LayoutList className="h-3.5 w-3.5" aria-hidden />
              List
            </Link>
            <Link
              href={filterHref({ view: 'calendar', page: undefined })}
              aria-current={!listView ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                !listView
                  ? 'bg-[#e4b334] text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.35)]'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Calendar
            </Link>
          </div>
        </div>

        <div className="relative space-y-3 bg-[linear-gradient(180deg,#d7eef2_0%,#eef6fa_48%,#f4f9fb_100%)] p-4 sm:p-5">
          {viewRaw === 'calendar' ? (
            <input type="hidden" name="view" value="calendar" />
          ) : null}
          {dateYmd !== todayYmd ? (
            <input type="hidden" name="date" value={dateYmd} />
          ) : null}

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-[#071d30] text-[#e4b334]">
                <Search className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              <label htmlFor="q" className="sr-only">
                Search shifts
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search shifts, locations or wards…"
                className="h-11 w-full rounded-xl border-2 border-[#16384f]/15 bg-white pl-11 pr-3.5 text-sm font-medium text-[#071d30] shadow-[0_8px_20px_rgba(7,29,48,0.06)] placeholder:text-bh-text-muted transition-[border-color,box-shadow] focus-visible:border-bh-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/30"
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="submit"
                variant="honey"
                size="lg"
                className="group min-h-11 rounded-xl border border-[#e4b334]/40 bg-[#e4b334] px-5 font-semibold text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_22px_rgba(228,179,52,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0c14a] hover:shadow-[0_14px_28px_rgba(228,179,52,0.48)] motion-reduce:hover:translate-y-0"
              >
                Apply
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Button>
              {hasFilters ? (
                <Link
                  href={filterHref({
                    q: undefined,
                    status: undefined,
                    role: undefined,
                    location: undefined,
                    range: undefined,
                    batch: undefined,
                    page: undefined,
                  })}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-[#16384f]/20 bg-white px-3.5 text-sm font-semibold text-[#071d30] shadow-[0_8px_20px_rgba(7,29,48,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#16384f]/40 hover:bg-[#071d30] hover:text-white motion-reduce:hover:translate-y-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Clear
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  id: 'status',
                  name: 'status',
                  label: 'Status',
                  value: statusFilter ?? '',
                  options: [
                    { value: '', label: 'All statuses' },
                    ...SHIFT_STATUSES.map((s) => ({
                      value: s,
                      label: s.replace(/_/g, ' '),
                    })),
                  ],
                },
                {
                  id: 'role',
                  name: 'role',
                  label: 'Role',
                  value: roleFilter ?? '',
                  options: [
                    { value: '', label: 'All roles' },
                    ...WORKER_ROLES.map((role) => ({
                      value: role,
                      label: WORKER_ROLE_LABELS[role],
                    })),
                  ],
                },
                {
                  id: 'location',
                  name: 'location',
                  label: 'Location',
                  value: locationFilter ?? '',
                  options: [
                    { value: '', label: 'All locations' },
                    ...locations.map((loc) => ({
                      value: loc.id,
                      label: loc.name,
                    })),
                  ],
                },
                {
                  id: 'range',
                  name: 'range',
                  label: 'Date',
                  value: range ?? '',
                  options: [
                    { value: '', label: 'All dates' },
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'past', label: 'Past' },
                  ],
                },
              ] as const
            ).map((field) => (
              <label
                key={field.id}
                htmlFor={field.id}
                className="group relative min-w-0"
              >
                <span
                  className={cn(
                    'mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]',
                    field.value ? 'text-[#c9920f]' : 'text-[#071d30]',
                  )}
                >
                  {field.label}
                </span>
                <select
                  id={field.id}
                  name={field.name}
                  defaultValue={field.value}
                  aria-label={field.label}
                  className={cn(
                    'h-11 w-full appearance-none truncate rounded-xl border-2 py-2 pl-3 pr-9 text-sm font-semibold text-[#071d30] transition-[border-color,box-shadow,background] focus-visible:border-bh-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/30',
                    field.value
                      ? 'border-[#e4b334]/70 bg-[#fff8e8] shadow-[0_8px_18px_rgba(228,179,52,0.18)]'
                      : 'border-[#16384f]/15 bg-white shadow-[0_8px_20px_rgba(7,29,48,0.06)] hover:border-[#16384f]/35',
                  )}
                >
                  {field.options.map((option) => (
                    <option key={`${field.id}-${option.value || 'all'}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span
                  className={cn(
                    'pointer-events-none absolute bottom-3.5 right-3 transition-colors',
                    field.value ? 'text-[#c9920f]' : 'text-bh-teal-strong group-hover:text-[#071d30]',
                  )}
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </span>
              </label>
            ))}
          </div>
        </div>
      </OrgClientFilterForm>

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
      ) : listError ? (
        <EmptyState
          title="Couldn’t load shifts"
          description="Something went wrong loading the shift list. Try again in a moment."
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
                  const filledForShift = filledCountByShift.get(shift.id) ?? 0;
                  const requiredForShift =
                    typeof shift.required_positions === 'number'
                      ? shift.required_positions
                      : 1;
                  const capacityLabel = positionsAvailabilityLabel(
                    requiredForShift,
                    filledForShift,
                  );
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
                        <div className="space-y-1">
                          {assignee ? (
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bh-teal-soft text-[10px] font-bold text-bh-teal-strong">
                                {initials}
                              </span>
                              <span className="truncate text-sm font-medium text-bh-text">
                                {requiredForShift > 1
                                  ? `${filledForShift} assigned`
                                  : assignee}
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
                          {requiredForShift > 1 ? (
                            <p className="text-xs text-bh-text-muted">
                              {capacityLabel}
                            </p>
                          ) : null}
                        </div>
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
              const filledForShift = filledCountByShift.get(shift.id) ?? 0;
              const requiredForShift =
                typeof shift.required_positions === 'number'
                  ? shift.required_positions
                  : 1;
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
                          {requiredForShift > 1
                            ? positionsAvailabilityLabel(
                                requiredForShift,
                                filledForShift,
                              )
                            : (assignee ?? 'Unassigned')}
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

          <div className="relative overflow-hidden rounded-2xl border border-[#16384f]/20 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-4 py-3.5 shadow-[0_16px_36px_rgba(7,29,48,0.22)] sm:px-5">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-bh-teal/30 blur-2xl"
            />
            <span
              aria-hidden
              className="bh-orb-drift pointer-events-none absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-[#e4b334]/22 blur-2xl"
            />
            <span
              aria-hidden
              className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-white/75">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.32)]">
                <LayoutList className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
                On this page
              </span>
              <span className="bh-tabular inline-flex items-center rounded-lg bg-white/10 px-2.5 py-1 text-[15px] font-bold tracking-tight text-white ring-1 ring-white/15">
                {shownFrom}–{shownTo}
              </span>
              <span>of</span>
              <span className="bh-tabular font-bold text-white">{total}</span>
              <span>shifts</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4b334]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3d27a] ring-1 ring-[#e4b334]/35">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e4b334] motion-reduce:animate-none"
                />
                {coveragePct}% in view
              </span>
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
                    'flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white',
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
                        className="px-1 text-white/40"
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        key={n}
                        href={filterHref({ page: String(n) })}
                        aria-current={n === safePage ? 'page' : undefined}
                        className={cn(
                          'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors',
                          n === safePage
                            ? 'bg-[#e4b334] text-[#071d30] shadow-[0_8px_16px_rgba(228,179,52,0.35)]'
                            : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
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
                    'flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white',
                    safePage >= pageCount && 'pointer-events-none opacity-40',
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </nav>
            ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
