'use client';

import {
  STANDARD_WARD_LIBRARY,
  wardNameExistsAmong,
} from '@bridge-hive/domain';
import { Building2, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { WardLibraryDialog } from '@/components/org/ward-library-dialog';
import type { WardUnitOption } from '@/components/org/ward-unit-selector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type LocationOption = { id: string; name: string };

export function WardLibraryPanel({
  slug,
  locations,
  wards: initialWards,
  defaultLocationId = '',
  canManageWards,
}: {
  slug: string;
  locations: LocationOption[];
  wards: WardUnitOption[];
  defaultLocationId?: string;
  canManageWards: boolean;
}) {
  const router = useRouter();
  const [wards, setWards] = useState(initialWards);
  const [locationId, setLocationId] = useState(
    defaultLocationId || locations[0]?.id || '',
  );

  const grouped = useMemo(() => {
    return locations.map((location) => ({
      location,
      wards: wards
        .filter((ward) => ward.locationId === location.id)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [locations, wards]);

  const selectedSavedNames = useMemo(
    () =>
      wards
        .filter((ward) => ward.locationId === locationId)
        .map((ward) => ward.name),
    [wards, locationId],
  );

  function handleCreated(
    created: Array<{ id: string; name: string; locationId: string }>,
  ) {
    setWards((prev) => {
      const next = [...prev];
      for (const row of created) {
        if (!next.some((ward) => ward.id === row.id)) {
          next.push({
            id: row.id,
            name: row.name,
            locationId: row.locationId,
          });
        }
      }
      return next;
    });
    router.refresh();
  }

  if (!locations.length) {
    return (
      <section className="rounded-2xl border border-dashed border-bh-border bg-bh-subtle/30 p-6 text-center">
        <p className="text-sm font-medium text-bh-text">
          Add a location before building your Ward / Unit Library.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-bh-border bg-bh-surface p-5 shadow-[0_1px_2px_rgba(7,29,48,0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bh-teal-soft text-bh-teal-strong">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-bh-text">
              Ward / Unit Library
            </h2>
            <p className="mt-0.5 max-w-xl text-sm text-bh-text-secondary">
              Standard healthcare units for your locations. Saved wards stay
              private to this organization.
            </p>
          </div>
        </div>
        {canManageWards ? (
          <WardLibraryDialog
            slug={slug}
            locations={locations}
            wards={wards}
            defaultLocationId={locationId}
            compactTrigger={false}
            triggerLabel="Add from ward library"
            onCreated={(created) => handleCreated(created)}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor="ward-library-panel-location">Destination location</Label>
          <Select
            id="ward-library-panel-location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded-lg border-bh-border"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          {canManageWards ? (
            <p className="text-xs text-bh-text-muted">
              Choose a location, then add starter units or a custom name.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
            Starter suggestions
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {STANDARD_WARD_LIBRARY.map((label) => {
              const saved = wardNameExistsAmong(label, selectedSavedNames);
              return (
                <li
                  key={label}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm',
                    saved
                      ? 'border-bh-border/70 bg-bh-subtle/50 text-bh-text-muted'
                      : 'border-bh-border bg-bh-surface text-bh-text',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium leading-snug">{label}</span>
                    {saved ? (
                      <span className="shrink-0 text-[11px] font-medium">
                        Saved
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {canManageWards ? (
            <div className="pt-1">
              <WardLibraryDialog
                slug={slug}
                locations={locations}
                wards={wards}
                defaultLocationId={locationId}
                onCreated={(created) => handleCreated(created)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t border-bh-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
          Saved wards by location
        </p>
        <ul className="space-y-3">
          {grouped.map(({ location, wards: locationWards }) => (
            <li
              key={location.id}
              className="rounded-xl border border-bh-border/80 bg-bh-subtle/20 p-3.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-bh-teal-strong" aria-hidden />
                <p className="text-sm font-semibold text-bh-text">
                  {location.name}
                </p>
                <span className="text-xs text-bh-text-muted">
                  {locationWards.length === 1
                    ? '1 unit'
                    : `${locationWards.length} units`}
                </span>
              </div>
              {locationWards.length === 0 ? (
                <p className="text-sm text-bh-text-muted">No wards saved yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {locationWards.map((ward) => (
                    <li
                      key={ward.id}
                      className="rounded-lg border border-bh-border bg-bh-surface px-2.5 py-1 text-xs font-medium text-bh-text"
                    >
                      {ward.name}
                    </li>
                  ))}
                </ul>
              )}
              {canManageWards ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-xs text-bh-teal-strong"
                    onClick={() => setLocationId(location.id)}
                  >
                    Add units to this location
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
