import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock3,
  LayoutGrid,
  LayoutList,
  Layers,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { KpiCard } from '@/components/org/dashboard-widgets';
import {
  OrgTableHeadCell,
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
import { PermissionGuard } from '@/components/permission-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { LocationForm } from './_components/location-form';

const WARD_ICON_TONES = [
  'bg-bh-accent-blue-soft text-bh-accent-blue',
  'bg-bh-accent-violet-soft text-violet-700',
  'bg-bh-success-soft text-bh-success',
  'bg-bh-honey-soft text-bh-honey-strong',
  'bg-bh-teal-soft text-bh-teal-strong',
  'bg-bh-danger-soft text-bh-danger',
] as const;

type WardRow = { id: string; name: string; instructions: string | null };

function weekBuckets(dates: Date[], weeks = 6): number[] {
  const now = Date.now();
  const msWeek = 7 * 24 * 60 * 60 * 1000;
  const start = now - (weeks - 1) * msWeek;
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const d of dates) {
    const t = d.getTime();
    if (t < start) continue;
    const i = Math.min(weeks - 1, Math.floor((t - start) / msWeek));
    if (i >= 0) buckets[i] += 1;
  }
  return buckets;
}

function filterHref(
  slug: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const next = { ...current, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `/org/${slug}/locations?${s}` : `/org/${slug}/locations`;
}

export default async function LocationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    new?: string;
    q?: string;
    city?: string;
    view?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { new: showNew, q, city: cityFilter, view: viewRaw } = sp;
  const listView = viewRaw === 'list';
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (!ctx.capabilities.canOperate) {
    return (
      <EmptyState
        title="Organization not active"
        description="Locations can be managed after Bridge Hive activates this organization."
      />
    );
  }

  const [{ data: locationsRaw }, { data: upcomingShifts }, { data: assignmentRows }] =
    await Promise.all([
      supabase
        .from('locations')
        .select(
          'id, name, address_line1, address_line2, city, postal_code, country_code, image_path, wards(id, name, instructions)',
        )
        .eq('organization_id', ctx.org.id)
        .order('name'),
      supabase
        .from('shifts')
        .select('id, location_id, ward_id, starts_at')
        .eq('organization_id', ctx.org.id)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', in30.toISOString())
        .in('status', ['published', 'filled', 'draft', 'in_progress']),
      supabase
        .from('shift_assignments')
        .select(
          'worker_id, shift:shifts!inner(organization_id, location_id)',
        )
        .eq('shift.organization_id', ctx.org.id)
        .not('status', 'in', '(withdrawn,cancelled)'),
    ]);

  const upcomingByLocation = new Map<string, number>();
  const upcomingByWard = new Map<string, number>();
  const upcomingDates: Date[] = [];
  for (const row of upcomingShifts ?? []) {
    if (row.location_id) {
      upcomingByLocation.set(
        row.location_id,
        (upcomingByLocation.get(row.location_id) ?? 0) + 1,
      );
    }
    if (row.ward_id) {
      upcomingByWard.set(row.ward_id, (upcomingByWard.get(row.ward_id) ?? 0) + 1);
    }
    if (row.starts_at) upcomingDates.push(new Date(row.starts_at));
  }

  const staffByLocation = new Map<string, Set<string>>();
  for (const row of assignmentRows ?? []) {
    const shift = Array.isArray(row.shift) ? row.shift[0] : row.shift;
    const locationId =
      shift && typeof shift === 'object' && 'location_id' in shift
        ? (shift as { location_id: string | null }).location_id
        : null;
    if (!locationId || !row.worker_id) continue;
    const set = staffByLocation.get(locationId) ?? new Set<string>();
    set.add(row.worker_id as string);
    staffByLocation.set(locationId, set);
  }

  type Loc = {
    id: string;
    name: string;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    postal_code: string | null;
    country_code: string | null;
    image_path: string | null;
    imageUrl: string | null;
    wards: WardRow[];
  };

  const locations: Loc[] = await Promise.all(
    (locationsRaw ?? []).map(async (loc) => {
      const imagePath = (loc.image_path as string | null) ?? null;
      let imageUrl: string | null = null;
      if (imagePath) {
        const { data: signed } = await supabase.storage
          .from('location-images')
          .createSignedUrl(imagePath, 60 * 15);
        imageUrl = signed?.signedUrl ?? null;
      }
      return {
        id: loc.id as string,
        name: loc.name as string,
        address_line1: (loc.address_line1 as string | null) ?? null,
        address_line2: (loc.address_line2 as string | null) ?? null,
        city: (loc.city as string | null) ?? null,
        postal_code: (loc.postal_code as string | null) ?? null,
        country_code: (loc.country_code as string | null) ?? null,
        image_path: imagePath,
        imageUrl,
        wards: (Array.isArray(loc.wards) ? loc.wards : []).map((w) => ({
          id: (w as WardRow).id,
          name: (w as WardRow).name,
          instructions: (w as WardRow).instructions ?? null,
        })),
      };
    }),
  );

  const cities = Array.from(
    new Set(locations.map((l) => l.city?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));

  const qLower = q?.trim().toLowerCase() ?? '';
  const filtered = locations.filter((loc) => {
    if (cityFilter && loc.city !== cityFilter) return false;
    if (!qLower) return true;
    const hay = [
      loc.name,
      loc.address_line1,
      loc.city,
      loc.country_code,
      ...loc.wards.map((w) => w.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(qLower);
  });

  const totalLocations = locations.length;
  const totalWards = locations.reduce((sum, l) => sum + l.wards.length, 0);
  const totalUpcoming = upcomingShifts?.length ?? 0;
  const totalStaff = new Set(
    [...staffByLocation.values()].flatMap((s) => [...s]),
  ).size;

  const upcomingSeries = weekBuckets(upcomingDates, 6);
  const locationSeries = Array.from({ length: 6 }, (_, i) => {
    const weekStart = now.getTime() - (5 - i) * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const active = new Set(
      (upcomingShifts ?? [])
        .filter((s) => {
          const t = new Date(s.starts_at).getTime();
          return t >= weekStart && t < weekEnd && s.location_id;
        })
        .map((s) => s.location_id as string),
    );
    return active.size || (i === 5 ? totalLocations : Math.min(totalLocations, i + 1));
  });
  const wardSeries = Array.from({ length: 6 }, (_, i) =>
    Math.max(
      0,
      Math.round((totalWards * (i + 1)) / 6) || (upcomingSeries[i] ?? 0),
    ),
  );
  const staffSeries = locationSeries.map((v, i) =>
    Math.min(totalStaff, Math.max(v, upcomingSeries[i] ?? 0)),
  );

  const filterState = {
    q: q || undefined,
    city: cityFilter || undefined,
    view: listView ? 'list' : undefined,
    new: showNew === '1' ? '1' : undefined,
  };
  const hasFilters = Boolean(q || cityFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[28px] font-bold leading-9 tracking-tight text-bh-text">
            Locations & wards
          </h1>
          <p className="max-w-xl text-sm leading-6 text-bh-text-secondary">
            Facilities and sites where shifts take place.
          </p>
        </div>
        <PermissionGuard allowed={ctx.capabilities.canManageLocations}>
          <Button asChild variant="honey" className="rounded-xl font-semibold">
            <Link href={filterHref(slug, filterState, { new: '1' })}>
              <Plus className="h-4 w-4" aria-hidden />
              Add location
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total locations"
          value={totalLocations}
          supporting="Active facilities"
          href={`/org/${slug}/locations`}
          icon={MapPin}
          tint="info"
          series={locationSeries}
        />
        <KpiCard
          label="Total wards"
          value={totalWards}
          supporting="Across all locations"
          href={`/org/${slug}/locations`}
          icon={Layers}
          tint="success"
          series={wardSeries}
        />
        <KpiCard
          label="Upcoming shifts"
          value={totalUpcoming}
          supporting="Next 30 days"
          href={`/org/${slug}/shifts?range=upcoming`}
          icon={CalendarDays}
          tint="honey"
          series={upcomingSeries}
        />
        <KpiCard
          label="Active staff"
          value={totalStaff}
          supporting="Assigned to locations"
          href={`/org/${slug}/shifts`}
          icon={Users}
          tint="violet"
          series={staffSeries}
        />
      </div>

      <PermissionGuard allowed={ctx.capabilities.canManageLocations && showNew === '1'}>
        <Card className="border-bh-border shadow-[0_4px_16px_rgba(7,29,48,0.04)]">
          <CardHeader>
            <CardTitle>New location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationForm
              slug={slug}
              organizationId={ctx.org.id}
              mode="create"
            />
          </CardContent>
        </Card>
      </PermissionGuard>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-2xl border border-bh-border bg-bh-surface p-3 shadow-[0_4px_16px_rgba(7,29,48,0.04)] lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5 lg:p-3.5"
      >
        {listView ? <input type="hidden" name="view" value="list" /> : null}
        {showNew === '1' ? <input type="hidden" name="new" value="1" /> : null}

        <div className="relative min-w-0 flex-1 lg:min-w-[220px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-text-muted"
            aria-hidden
          />
          <label htmlFor="loc-q" className="sr-only">
            Search locations or wards
          </label>
          <input
            id="loc-q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search locations or wards…"
            className="h-10 w-full rounded-full border border-bh-border bg-bh-subtle/40 pl-9 pr-3 text-sm text-bh-text placeholder:text-bh-text-muted focus-visible:border-bh-accent-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-accent-blue/20"
          />
        </div>

        <select
          id="city"
          name="city"
          defaultValue={cityFilter ?? ''}
          aria-label="City"
          className="h-10 max-w-[200px] truncate rounded-full border border-bh-border bg-bh-surface px-3 text-sm font-medium text-bh-text"
        >
          <option value="">City (All cities)</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <Button type="submit" variant="secondary" className="h-10 rounded-full px-4">
          Apply
        </Button>

        {hasFilters ? (
          <Link
            href={filterHref(slug, filterState, {
              q: undefined,
              city: undefined,
            })}
            className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-bh-text-secondary hover:text-bh-accent-blue"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </Link>
        ) : null}

        <div
          role="group"
          aria-label="Locations view"
          className="ml-auto inline-flex rounded-xl border border-bh-border bg-bh-subtle/50 p-1"
        >
          <Link
            href={filterHref(slug, filterState, { view: undefined })}
            aria-current={!listView ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              !listView
                ? 'bg-bh-sidebar text-white shadow-sm'
                : 'text-bh-text-secondary hover:text-bh-text',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Cards
          </Link>
          <Link
            href={filterHref(slug, filterState, { view: 'list' })}
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
        </div>
      </form>

      {!locations.length ? (
        <EmptyState
          title="Add a location before creating shifts"
          description="Create a location and wards so schedulers can publish openings."
          action={
            ctx.capabilities.canManageLocations ? (
              <Button asChild variant="honey">
                <Link href={`/org/${slug}/locations?new=1`}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add location
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          title="No locations match"
          description="Adjust search or city filters."
          action={
            <Button asChild variant="outline">
              <Link href={`/org/${slug}/locations`}>Clear filters</Link>
            </Button>
          }
        />
      ) : listView ? (
        <OrgTableShell>
          <table className="w-full text-left text-sm">
            <thead className={orgTableHeadClassName}>
              <tr>
                <OrgTableHeadCell icon={MapPin} label="Location" />
                <OrgTableHeadCell icon={Building2} label="City" />
                <OrgTableHeadCell icon={Layers} label="Wards" />
                <OrgTableHeadCell icon={CalendarDays} label="Upcoming" />
                <OrgTableHeadCell icon={Users} label="Staff" />
                <th className="px-4 py-3.5 text-right">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((location) => {
                const upcoming = upcomingByLocation.get(location.id) ?? 0;
                const staff = staffByLocation.get(location.id)?.size ?? 0;
                const initial = (location.name?.trim()?.[0] ?? 'L').toUpperCase();
                const cityLine =
                  [location.city, location.country_code].filter(Boolean).join(', ') ||
                  'No city set';

                return (
                  <tr key={location.id} className={orgTableRowClassName}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {location.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={location.imageUrl}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-xl object-cover ring-1 ring-bh-border"
                          />
                        ) : (
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bh-accent-blue-soft to-bh-teal-soft text-sm font-bold text-bh-accent-blue"
                            aria-hidden
                          >
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-bh-text">
                            {location.name}
                          </p>
                          {location.address_line1 ? (
                            <p className="mt-0.5 truncate text-xs text-bh-text-muted">
                              {location.address_line1}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-bh-text-secondary">{cityLine}</td>
                    <td className="px-4 py-4 bh-tabular font-semibold text-bh-text">
                      {location.wards.length}
                    </td>
                    <td className="px-4 py-4 bh-tabular font-semibold text-bh-text">
                      {upcoming}
                    </td>
                    <td className="px-4 py-4 bh-tabular font-semibold text-bh-text">
                      {staff}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/org/${slug}/locations/${location.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-sm font-semibold text-bh-text hover:bg-bh-subtle"
                      >
                        Manage
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </OrgTableShell>
      ) : (
        <ul className="space-y-5">
          {filtered.map((location) => {
            const upcoming = upcomingByLocation.get(location.id) ?? 0;
            const staff = staffByLocation.get(location.id)?.size ?? 0;
            const initial = (location.name?.trim()?.[0] ?? 'L').toUpperCase();
            const addressLine = [
              location.address_line1,
              [location.city, location.country_code].filter(Boolean).join(', '),
            ]
              .filter(Boolean)
              .join(' · ');
            const wardsPreview = location.wards.slice(0, 6);
            const moreWards = location.wards.length - wardsPreview.length;

            return (
              <li
                key={location.id}
                className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_4px_16px_rgba(7,29,48,0.04)]"
              >
                <div className="flex flex-col gap-4 border-b border-bh-border/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-start gap-3.5">
                    {location.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={location.imageUrl}
                        alt=""
                        className="h-28 w-40 shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-bh-border sm:h-32 sm:w-48"
                      />
                    ) : (
                      <span
                        className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-bh-accent-blue-soft via-bh-teal-soft to-bh-honey-soft text-2xl font-bold text-bh-sidebar shadow-md ring-1 ring-bh-border sm:h-32 sm:w-32"
                        aria-hidden
                      >
                        {initial}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold tracking-tight text-bh-text">
                          {location.name}
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-bh-success-soft px-2.5 py-0.5 text-[11px] font-bold text-bh-success">
                          Active
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-bh-text-secondary">
                        {addressLine || 'No address set'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-accent-blue-soft px-2.5 py-1 text-xs font-semibold text-bh-accent-blue">
                          <Layers className="h-3.5 w-3.5" aria-hidden />
                          {location.wards.length} Ward
                          {location.wards.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-honey-soft px-2.5 py-1 text-xs font-semibold text-bh-warning">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          {upcoming} Upcoming shift{upcoming === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-bh-accent-violet-soft px-2.5 py-1 text-xs font-semibold text-violet-700">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {staff} Assigned staff
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" className="rounded-xl font-semibold">
                      <Link href={`/org/${slug}/locations/${location.id}`}>
                        Manage
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl text-bh-text-muted"
                    >
                      <Link
                        href={`/org/${slug}/locations/${location.id}`}
                        aria-label={`More for ${location.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-bh-text">
                      Wards ({location.wards.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/org/${slug}/locations/${location.id}`}
                        className="text-sm font-semibold text-bh-accent-blue hover:underline"
                      >
                        View all wards
                      </Link>
                      {ctx.capabilities.canManageLocations ? (
                        <Button asChild size="sm" variant="outline" className="h-8 rounded-lg">
                          <Link href={`/org/${slug}/locations/${location.id}`}>
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            Add ward
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {!location.wards.length ? (
                    <p className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-6 text-center text-sm text-bh-text-secondary">
                      No wards yet. Add wards so shifts can target departments.
                    </p>
                  ) : (
                    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {wardsPreview.map((ward, idx) => {
                        const wardUpcoming = upcomingByWard.get(ward.id) ?? 0;
                        const tone = WARD_ICON_TONES[idx % WARD_ICON_TONES.length]!;
                        return (
                          <li key={ward.id}>
                            <Link
                              href={`/org/${slug}/locations/${location.id}`}
                              className="flex h-full flex-col rounded-xl border border-bh-border bg-bh-surface p-3.5 transition-[border-color,box-shadow] hover:border-bh-border-strong hover:shadow-sm"
                            >
                              <span
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center rounded-xl',
                                  tone,
                                )}
                              >
                                <Building2 className="h-4 w-4" aria-hidden />
                              </span>
                              <p className="mt-2.5 truncate text-sm font-bold text-bh-text">
                                {ward.name}
                              </p>
                              {ward.instructions ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-bh-text-secondary">
                                  {ward.instructions}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-xs text-bh-text-muted">
                                  Department
                                </p>
                              )}
                              <p
                                className={cn(
                                  'mt-auto flex items-center gap-1 pt-3 text-[11px] font-semibold',
                                  wardUpcoming > 0
                                    ? 'text-bh-warning'
                                    : 'text-bh-text-muted',
                                )}
                              >
                                <Clock3 className="h-3 w-3" aria-hidden />
                                {wardUpcoming} upcoming
                              </p>
                            </Link>
                          </li>
                        );
                      })}
                      {moreWards > 0 ? (
                        <li>
                          <Link
                            href={`/org/${slug}/locations/${location.id}`}
                            className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-bh-border bg-bh-subtle/30 p-3.5 text-sm font-semibold text-bh-accent-blue hover:bg-bh-subtle"
                          >
                            +{moreWards} more
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
