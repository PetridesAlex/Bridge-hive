'use client';

import {
  STANDARD_WARD_LIBRARY,
  normalizeWardName,
  wardNameExistsAmong,
} from '@bridge-hive/domain';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  createWardsBatchAction,
  type CreatedWardRow,
} from '@/app/actions/locations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { WardUnitOption } from './ward-unit-selector';

type LocationOption = { id: string; name: string };

export function WardLibraryDialog({
  slug,
  locations,
  wards,
  defaultLocationId = '',
  canManage = true,
  triggerLabel = '+ Add from ward library',
  compactTrigger = true,
  onCreated,
  autoSelectSingle = true,
}: {
  slug: string;
  locations: LocationOption[];
  wards: WardUnitOption[];
  defaultLocationId?: string;
  canManage?: boolean;
  triggerLabel?: string;
  compactTrigger?: boolean;
  /** Called with newly created wards; parent should merge into local wards state. */
  onCreated?: (created: CreatedWardRow[], autoSelectWardId: string | null) => void;
  /** When exactly one new ward is added, return its id for auto-select. */
  autoSelectSingle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [selected, setSelected] = useState<string[]>([]);
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [pending, startTransition] = useTransition();

  const savedNames = useMemo(
    () =>
      wards
        .filter((ward) => ward.locationId === locationId)
        .map((ward) => ward.name),
    [wards, locationId],
  );

  const filteredLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return [...STANDARD_WARD_LIBRARY];
    return STANDARD_WARD_LIBRARY.filter((label) =>
      label.toLowerCase().includes(q),
    );
  }, [libraryQuery]);

  function resetForm(nextLocation = defaultLocationId) {
    setLocationId(nextLocation);
    setSelected([]);
    setCustomName('');
    setCustomError(null);
    setLibraryQuery('');
  }

  function toggleLabel(label: string) {
    if (wardNameExistsAmong(label, savedNames)) return;
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetForm(defaultLocationId || locationId);
  }

  function handleSave() {
    if (!locationId) {
      toast.error('Select a location first.');
      return;
    }

    const trimmedCustom = normalizeWardName(customName);
    if (customName && !trimmedCustom) {
      setCustomError('Ward / unit name cannot be blank.');
      return;
    }
    if (trimmedCustom && wardNameExistsAmong(trimmedCustom, savedNames)) {
      setCustomError(
        `“${trimmedCustom}” is already saved for this location.`,
      );
      return;
    }
    if (
      trimmedCustom &&
      selected.some((label) =>
        label.toLowerCase() === trimmedCustom.toLowerCase(),
      )
    ) {
      setCustomError('That custom name is already selected above.');
      return;
    }

    const names = [...selected];
    if (trimmedCustom) names.push(trimmedCustom);

    if (names.length === 0) {
      toast.error('Select at least one ward / unit to add.');
      return;
    }

    setCustomError(null);
    startTransition(async () => {
      const result = await createWardsBatchAction({
        slug,
        locationId,
        names,
      });

      if (result.error && !result.created?.length) {
        toast.error(result.error);
        return;
      }

      const created = result.created ?? [];
      const autoSelectWardId =
        autoSelectSingle && created.length === 1 ? created[0].id : null;

      if (created.length > 0) {
        toast.success(
          created.length === 1
            ? `Added “${created[0].name}”`
            : `Added ${created.length} wards / units`,
        );
      } else if (result.skippedNames?.length) {
        toast.error('Those ward / unit names are already saved for this location.');
        return;
      }

      onCreated?.(created, autoSelectWardId);
      setOpen(false);
      resetForm(locationId);
    });
  }

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={compactTrigger ? 'link' : 'honey'}
          size={compactTrigger ? 'sm' : 'lg'}
          className={cn(
            compactTrigger
              ? 'h-auto px-0 py-0 text-xs font-medium text-bh-teal-strong transition-colors hover:text-[#071d30]'
              : 'group min-h-11 justify-between gap-3 rounded-xl px-4 font-semibold shadow-[0_10px_24px_rgba(228,179,52,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(228,179,52,0.38)] active:translate-y-0 active:shadow-[0_6px_16px_rgba(228,179,52,0.22)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          )}
        >
          {compactTrigger ? (
            triggerLabel
          ) : (
            <>
              <span className="inline-flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#071d30]/10 text-[#071d30] ring-1 ring-[#071d30]/10 transition-colors group-hover:bg-[#071d30]/14">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                {triggerLabel.replace(/^\+\s*/, '')}
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          'left-1/2 top-1/2 max-h-[min(90vh,40rem)] w-[min(100vw-1.5rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl sm:max-w-md',
        )}
      >
        <div className="space-y-1 pr-6">
          <DialogTitle>Ward / Unit Library</DialogTitle>
          <DialogDescription>
            Add standard healthcare units to one of your locations. Names are
            saved only for your organization.
          </DialogDescription>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ward-library-location">Location</Label>
          <Select
            id="ward-library-location"
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setSelected([]);
              setCustomError(null);
            }}
            className="rounded-lg border-bh-border"
          >
            <option value="">Select location…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ward-library-search">Standard units</Label>
            <span className="text-[11px] text-bh-text-muted">
              {selected.length} selected
            </span>
          </div>
          <Input
            id="ward-library-search"
            type="search"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            placeholder="Search library…"
            disabled={!locationId}
            className="h-9 rounded-lg border-bh-border"
          />
          <ul className="grid max-h-56 gap-1.5 overflow-y-auto pr-0.5">
            {filteredLibrary.map((label) => {
              const alreadySaved = wardNameExistsAmong(label, savedNames);
              const isSelected = selected.includes(label);
              return (
                <li key={label}>
                  <button
                    type="button"
                    disabled={!locationId || alreadySaved}
                    onClick={() => toggleLabel(label)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      alreadySaved &&
                        'cursor-not-allowed border-bh-border/70 bg-bh-subtle/60 text-bh-text-muted',
                      !alreadySaved &&
                        isSelected &&
                        'border-bh-teal bg-bh-teal-soft/40 text-bh-text ring-1 ring-bh-teal/30',
                      !alreadySaved &&
                        !isSelected &&
                        'border-bh-border bg-bh-surface text-bh-text hover:border-bh-teal/50 hover:bg-bh-subtle/50',
                    )}
                  >
                    <span className="font-medium leading-snug">{label}</span>
                    {alreadySaved ? (
                      <span className="shrink-0 text-[11px] font-medium text-bh-text-muted">
                        Already added
                      </span>
                    ) : isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-bh-teal-strong" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-2 border-t border-bh-border pt-3">
          <Label htmlFor="ward-library-custom">Create custom ward / unit</Label>
          <Input
            id="ward-library-custom"
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              setCustomError(null);
            }}
            placeholder="e.g. Day Surgery Unit"
            disabled={!locationId || pending}
            className="rounded-lg border-bh-border"
          />
          {customError ? (
            <p className="text-xs font-medium text-bh-danger" role="alert">
              {customError}
            </p>
          ) : (
            <p className="text-[11px] text-bh-text-muted">
              Names are trimmed; duplicates within the same location are blocked.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !locationId}
            onClick={handleSave}
          >
            {pending ? 'Adding…' : 'Add to location'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
