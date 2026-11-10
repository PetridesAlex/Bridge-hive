import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
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
import { OrgClientFilterForm } from '@/components/org/org-client-filter-form';
import { PageHeader } from '@/components/org/page-header';
import { PermissionGuard } from '@/components/permission-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { LocationForm } from './_components/location-form';
import { WardLibraryPanel } from './_components/ward-library-panel';

const WARD_ICON_TONES = [
  'bg-bh-accent-blue-soft text-bh-accent-blue',
  'bg-bh-accent-violet-soft text-violet-700',
  'bg-bh-success-soft text-bh-success',
  'bg-bh-honey-soft text-bh-honey-strong',
  'bg-bh-teal-soft text-bh-teal-strong',
  'bg-bh-danger-soft text-bh-danger',
] as const;

type WardRow = { id: string; name: string; instructions: string | null };

function toWardRows(value: unknown): WardRow[] {
  if (!Array.isArray(value)) return [];
  const rows: WardRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { id?: unknown; name?: unknown; instructions?: unknown };
    if (typeof row.id !== 'string' || typeof row.name !== 'string') continue;
    rows.push({
      id: row.id,
      name: row.name,
      instructions: typeof row.instructions === 'string' ? row.instructions : null,
    });
  }
  return rows;
}

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
        wards: toWardRows(loc.wards),
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
      <PageHeader
        eyebrow="Operations"
        title="Locations & wards"
        subtitle="Facilities and sites where shifts take place."
        actions={
          <PermissionGuard allowed={ctx.capabilities.canManageLocations}>
            <Button
              asChild
              size="lg"
              className="group relative min-h-11 justify-between gap-3 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_72%)] px-3.5 font-semibold text-white shadow-[0_12px_28px_rgba(7,29,48,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(155deg,#1a425c_0%,#0a283c_72%)] hover:shadow-[0_16px_32px_rgba(7,29,48,0.36)] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Link href={filterHref(slug, filterState, { new: '1' })}>
                <span className="inline-flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  Add location
                </span>
                <ArrowRight
                  className="h-4 w-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

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

      <WardLibraryPanel
        slug={slug}
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
        }))}
        wards={locations.flatMap((location) =>
          location.wards.map((ward) => ({
            id: ward.id,
            name: ward.name,
            locationId: location.id,
          })),
        )}
        canManageWards={ctx.capabilities.canManageWards}
      />

      <PermissionGuard allowed={ctx.capabilities.canManageLocations && showNew === '1'}>
        <Card className="bh-org-surface border-0 shadow-none">
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

      <OrgClientFilterForm
        pathname={`/org/${slug}/locations`}
        className="bh-org-surface flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5 lg:p-3.5"
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
      </OrgClientFilterForm>

      {!locations.length ? (
        <EmptyState
          title="Add a location before creating shifts"
          description="Create a location and wards so schedulers can publish openings."
          action={
            ctx.capabilities.canManageLocations ? (
              <Button
                asChild
                size="lg"
                className="group relative min-h-11 justify-between gap-3 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_72%)] px-3.5 font-semibold text-white shadow-[0_12px_28px_rgba(7,29,48,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(155deg,#1a425c_0%,#0a283c_72%)] hover:shadow-[0_16px_32px_rgba(7,29,48,0.36)] motion-reduce:hover:translate-y-0"
              >
                <Link href={`/org/${slug}/locations?new=1`}>
                  <span className="inline-flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </span>
                    Add location
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
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
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#071d30] px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b2a40]"
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
          {filtered.map((location, index) => {
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
            const siteStats = [
              {
                icon: Layers,
                label: 'Wards',
                value: location.wards.length,
              },
              {
                icon: CalendarDays,
                label: 'Upcoming shifts',
                value: upcoming,
              },
              {
                icon: Users,
                label: 'Assigned staff',
                value: staff,
              },
            ] as const;

            return (
              <li
                key={location.id}
                className="bh-org-enter group/site relative overflow-hidden rounded-2xl border border-[#16384f]/25 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(7,29,48,0.18)] motion-reduce:transform-none motion-reduce:hover:translate-y-0"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="relative overflow-hidden bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-4 py-4 text-white sm:px-5 sm:py-5">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/35 blur-2xl"
                  />
                  <span
                    aria-hidden
                    className="bh-orb-drift pointer-events-none absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
                  />
                  <span
                    aria-hidden
                    className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
                  />

                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      {location.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={location.imageUrl}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-[#e4b334]/80 sm:h-[4.5rem] sm:w-[4.5rem]"
                        />
                      ) : (
                        <span
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e4b334] text-[22px] font-bold text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_22px_rgba(228,179,52,0.35)] sm:h-[4.5rem] sm:w-[4.5rem]"
                          aria-hidden
                        >
                          {initial}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="bh-soft-pulse h-1.5 w-1.5 rounded-full bg-[#e4b334] shadow-[0_0_8px_rgba(228,179,52,0.85)]"
                              aria-hidden
                            />
                            Added location
                          </span>
                          <span className="text-white/35" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#b8f0d0]">
                            <span
                              className="bh-soft-pulse h-1.5 w-1.5 rounded-full bg-[#b8f0d0]"
                              aria-hidden
                            />
                            Active
                          </span>
                        </p>
                        <h2 className="mt-1.5 truncate text-[22px] font-bold leading-none tracking-[-0.03em] text-white">
                          {location.name}
                        </h2>
                        <p className="mt-1.5 flex items-center gap-1.5 truncate text-sm text-white/70">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#e4b334]" aria-hidden />
                          {addressLine || 'No address set'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/org/${slug}/locations/${location.id}`}
                        className="group/manage inline-flex items-center gap-2 rounded-xl bg-[#e4b334] px-4 py-2.5 text-sm font-semibold text-[#071d30] shadow-[0_10px_22px_rgba(228,179,52,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0c14d] hover:shadow-[0_14px_28px_rgba(228,179,52,0.48)] motion-reduce:hover:translate-y-0"
                      >
                        Manage
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform duration-200 group-hover/manage:translate-x-0.5 group-hover/manage:-translate-y-0.5"
                          aria-hidden
                        />
                      </Link>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
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

                  <dl className="relative mt-4 grid grid-cols-3 gap-2">
                    {siteStats.map((stat, statIndex) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className="bh-drop-in rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm"
                          style={{ animationDelay: `${120 + statIndex * 70}ms` }}
                        >
                          <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                            <Icon className="h-3.5 w-3.5 text-[#e4b334]" aria-hidden />
                            {stat.label}
                          </dt>
                          <dd className="bh-tabular mt-1 text-[22px] font-bold leading-none tracking-tight text-white">
                            {stat.value}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>

                <div className="bg-[linear-gradient(180deg,rgba(22,166,182,0.1)_0%,rgba(232,242,250,0.45)_48%,#ffffff_100%)] p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[#071d30]">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-bh-teal-soft text-bh-teal-strong">
                        <Layers className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      Wards ({location.wards.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/org/${slug}/locations/${location.id}`}
                        className="inline-flex items-center rounded-xl bg-[#071d30] px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b2a40] motion-reduce:hover:translate-y-0"
                      >
                        View all wards
                      </Link>
                      {ctx.capabilities.canManageLocations ? (
                        <Link
                          href={`/org/${slug}/locations/${location.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#e4b334] px-3 text-sm font-semibold text-[#071d30] shadow-[0_8px_16px_rgba(228,179,52,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0c14d] motion-reduce:hover:translate-y-0"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Add ward
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {!location.wards.length ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[#16384f]/10 bg-white/80 px-5 py-8 text-center shadow-[0_10px_24px_rgba(7,29,48,0.05)]">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-bh-teal/20 blur-2xl"
                      />
                      <span
                        aria-hidden
                        className="bh-orb-drift pointer-events-none absolute -bottom-10 right-8 h-20 w-20 rounded-full bg-[#e4b334]/20 blur-2xl"
                      />
                      <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_20px_rgba(228,179,52,0.35)]">
                        <Layers className="h-5 w-5" strokeWidth={2.4} aria-hidden />
                      </span>
                      <p className="relative mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Site on file
                      </p>
                      <h4 className="relative mt-1 text-base font-bold tracking-tight text-[#071d30]">
                        No wards on this location yet
                      </h4>
                      <p className="relative mx-auto mt-1 max-w-sm text-sm leading-6 text-bh-text-secondary">
                        {location.name} is added. Add wards so shifts can target
                        departments.
                      </p>
                    </div>
                  ) : (
                    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {wardsPreview.map((ward, idx) => {
                        const wardUpcoming = upcomingByWard.get(ward.id) ?? 0;
                        const tone = WARD_ICON_TONES[idx % WARD_ICON_TONES.length]!;
                        return (
                          <li key={ward.id} className="bh-drop-in" style={{ animationDelay: `${idx * 60}ms` }}>
                            <Link
                              href={`/org/${slug}/locations/${location.id}`}
                              className="flex h-full flex-col rounded-xl bg-white/85 p-3.5 ring-1 ring-[#16384f]/10 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_24px_rgba(7,29,48,0.1)] motion-reduce:hover:translate-y-0"
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
                            className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl bg-[#071d30] p-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b2a40] motion-reduce:hover:translate-y-0"
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
