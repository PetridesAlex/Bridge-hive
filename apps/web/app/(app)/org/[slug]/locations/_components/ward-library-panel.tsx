'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { WardLibraryDialog } from '@/components/org/ward-library-dialog';
import type { WardUnitOption } from '@/components/org/ward-unit-selector';
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

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === locationId) ?? null,
    [locations, locationId],
  );

  const locationWards = useMemo(
    () =>
      wards
        .filter((ward) => ward.locationId === locationId)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
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
    if (created[0]?.locationId) setLocationId(created[0].locationId);
    router.refresh();
  }

  if (!locations.length) {
    return (
      <section className="rounded-2xl border border-bh-border/70 bg-bh-surface px-6 py-10 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-[#071d30]">
          Ward library
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-bh-text-secondary">
          Add a location first. Units are saved per location and stay private to
          this organization.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-bh-border/70 bg-bh-surface">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0 max-w-lg">
          <h2 className="text-lg font-semibold tracking-tight text-[#071d30]">
            Ward library
          </h2>
          <p className="mt-1 text-sm leading-6 text-bh-text-secondary">
            Standard units for your locations — private to this organization.
          </p>
        </div>
        {canManageWards ? (
          <WardLibraryDialog
            slug={slug}
            locations={locations}
            wards={wards}
            defaultLocationId={locationId}
            compactTrigger={false}
            triggerLabel="Add wards"
            onCreated={(created) => handleCreated(created)}
          />
        ) : null}
      </header>

      <div className="mt-5 border-t border-bh-border/60 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div
          role="tablist"
          aria-label="Locations"
          className="flex gap-6 overflow-x-auto"
        >
          {locations.map((location) => {
            const count = wards.filter(
              (ward) => ward.locationId === location.id,
            ).length;
            const active = location.id === locationId;
            return (
              <button
                key={location.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLocationId(location.id)}
                className={cn(
                  'relative shrink-0 pb-2.5 text-left transition-colors',
                  active
                    ? 'text-[#071d30]'
                    : 'text-bh-text-muted hover:text-bh-text',
                )}
              >
                <span className="block text-sm font-medium tracking-tight">
                  {location.name}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-xs',
                    active ? 'text-bh-text-secondary' : 'text-bh-text-muted',
                  )}
                >
                  {count === 1 ? '1 unit' : `${count} units`}
                </span>
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#071d30]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          aria-label={
            selectedLocation
              ? `Units at ${selectedLocation.name}`
              : 'Location units'
          }
          className="mt-5"
        >
          {locationWards.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-bh-text-secondary">
                No units at {selectedLocation?.name ?? 'this location'} yet.
              </p>
              {canManageWards ? (
                <WardLibraryDialog
                  slug={slug}
                  locations={locations}
                  wards={wards}
                  defaultLocationId={locationId}
                  compactTrigger
                  triggerLabel="Add from library"
                  onCreated={(created) => handleCreated(created)}
                />
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {locationWards.map((ward) => (
                <li
                  key={ward.id}
                  className="rounded-lg border border-bh-border/70 bg-[#f7fafc] px-3 py-1.5 text-sm text-[#071d30]"
                >
                  {ward.name}
                </li>
              ))}
              {canManageWards ? (
                <li className="flex items-center">
                  <WardLibraryDialog
                    slug={slug}
                    locations={locations}
                    wards={wards}
                    defaultLocationId={locationId}
                    compactTrigger
                    triggerLabel="+ Add more"
                    onCreated={(created) => handleCreated(created)}
                  />
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
