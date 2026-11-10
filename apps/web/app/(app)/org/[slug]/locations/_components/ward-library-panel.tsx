'use client';

import { Building2, Layers } from 'lucide-react';
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
      <section className="relative overflow-hidden rounded-2xl border border-[#16384f]/20 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-6 py-10 text-center text-white shadow-[0_18px_40px_rgba(7,29,48,0.16)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/30 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
        />
        <span className="relative mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.35)]">
          <Layers className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        </span>
        <h2 className="relative mt-3 text-lg font-semibold tracking-tight">
          Ward library
        </h2>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-6 text-white/75">
          Add a location first. Units are saved per location and stay private to
          this organization.
        </p>
      </section>
    );
  }

  return (
    <section className="bh-org-enter relative overflow-hidden rounded-2xl border border-[#16384f]/25 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)]">
      <header className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-5 py-4 text-white sm:px-6">
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
        <div className="relative flex min-w-0 max-w-lg items-start gap-3.5">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.35)]">
            <Layers className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
              Standard units
            </p>
            <h2 className="mt-1 text-[20px] font-bold leading-none tracking-[-0.03em] text-white">
              Ward library
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Standard units for your locations — private to this organization.
            </p>
          </div>
        </div>
        {canManageWards ? (
          <div className="relative">
            <WardLibraryDialog
              slug={slug}
              locations={locations}
              wards={wards}
              defaultLocationId={locationId}
              compactTrigger={false}
              triggerTone="gold"
              triggerLabel="Add wards"
              onCreated={(created) => handleCreated(created)}
            />
          </div>
        ) : null}
      </header>

      <div className="bg-[linear-gradient(180deg,rgba(22,166,182,0.1)_0%,rgba(232,242,250,0.55)_38%,#ffffff_100%)] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div
          role="tablist"
          aria-label="Locations"
          className="flex flex-wrap gap-2"
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
                  'group relative min-w-[11.5rem] overflow-hidden rounded-2xl px-4 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  active
                    ? 'bg-[linear-gradient(155deg,#16384f_0%,#071d30_80%)] text-white shadow-[0_12px_24px_rgba(7,29,48,0.22)]'
                    : 'bg-white/80 text-bh-text ring-1 ring-[#16384f]/10 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_22px_rgba(7,29,48,0.08)]',
                )}
              >
                <span className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      active
                        ? 'bg-[#e4b334] text-[#071d30]'
                        : 'bg-bh-teal-soft text-bh-teal-strong',
                    )}
                  >
                    <Building2 className="h-3.5 w-3.5" strokeWidth={2.3} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold tracking-tight">
                      {location.name}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                        active
                          ? 'bg-white/12 text-[#f3d27a]'
                          : 'bg-bh-subtle text-bh-text-muted',
                      )}
                    >
                      {count === 1 ? '1 unit' : `${count} units`}
                    </span>
                  </span>
                </span>
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
          className="mt-4"
        >
          {locationWards.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-[#16384f]/10 bg-white/75 px-6 py-9 text-center shadow-[0_10px_24px_rgba(7,29,48,0.05)]">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-bh-teal/20 blur-2xl"
              />
              <span
                aria-hidden
                className="bh-orb-drift pointer-events-none absolute -bottom-10 right-6 h-20 w-20 rounded-full bg-[#e4b334]/20 blur-2xl"
              />
              <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_20px_rgba(228,179,52,0.35)]">
                <Layers className="h-5 w-5" strokeWidth={2.4} aria-hidden />
              </span>
              <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
                Units
              </p>
              <h3 className="relative mt-1 text-lg font-bold tracking-tight text-[#071d30]">
                No units yet
              </h3>
              <p className="relative mx-auto mt-1.5 max-w-sm text-sm leading-6 text-bh-text-secondary">
                {selectedLocation?.name ?? 'This location'} has no saved wards.
                Add from the library so shifts can target departments.
              </p>
              {canManageWards ? (
                <div className="relative mt-5 flex justify-center">
                  <WardLibraryDialog
                    slug={slug}
                    locations={locations}
                    wards={wards}
                    defaultLocationId={locationId}
                    compactTrigger={false}
                    triggerTone="navy"
                    triggerLabel="Add from library"
                    onCreated={(created) => handleCreated(created)}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {locationWards.map((ward) => (
                <li
                  key={ward.id}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-[#071d30] ring-1 ring-[#16384f]/10 shadow-[0_4px_12px_rgba(7,29,48,0.04)]"
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
