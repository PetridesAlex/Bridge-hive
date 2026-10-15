'use client';

import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type WardUnitOption = {
  id: string;
  name: string;
  locationId: string;
};

const SEARCH_THRESHOLD = 6;

export function WardUnitSelector({
  locationId,
  wardId,
  wards,
  onWardChange,
  id,
  name,
  disabled,
  className,
  'aria-label': ariaLabel = 'Ward / unit',
}: {
  locationId: string;
  wardId: string;
  wards: WardUnitOption[];
  onWardChange: (wardId: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [query, setQuery] = useState('');
  const locationReady = Boolean(locationId);
  const locationWards = useMemo(
    () => wards.filter((ward) => ward.locationId === locationId),
    [wards, locationId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locationWards;
    return locationWards.filter((ward) =>
      ward.name.toLowerCase().includes(q),
    );
  }, [locationWards, query]);

  const showSearch = locationReady && locationWards.length >= SEARCH_THRESHOLD;
  const selectDisabled = disabled || !locationReady;

  return (
    <div className={cn('space-y-1.5', className)}>
      {showSearch ? (
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wards…"
          aria-label={`${ariaLabel} search`}
          disabled={selectDisabled}
          className="h-8 rounded-lg border-bh-border bg-bh-surface px-2.5 text-xs"
        />
      ) : null}
      <Select
        id={id}
        name={name}
        value={wardId}
        disabled={selectDisabled}
        aria-label={ariaLabel}
        onChange={(e) => onWardChange(e.target.value)}
        className="h-9 min-w-0 rounded-lg border-bh-border bg-bh-surface px-2.5 text-sm focus-visible:border-bh-teal focus-visible:ring-bh-teal/30"
      >
        <option value="">No ward / not specified</option>
        {filtered.map((ward) => (
          <option key={ward.id} value={ward.id}>
            {ward.name}
          </option>
        ))}
      </Select>
      {!locationReady ? (
        <p className="text-[11px] text-bh-text-muted">Select a location first.</p>
      ) : locationWards.length === 0 ? (
        <p className="text-[11px] text-bh-text-muted">
          No saved wards for this location yet.
        </p>
      ) : showSearch && filtered.length === 0 ? (
        <p className="text-[11px] text-bh-text-muted">No wards match your search.</p>
      ) : null}
    </div>
  );
}
