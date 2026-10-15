'use client';

import {
  BULK_SHIFT_MAX,
  BULK_SHIFT_MIN,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  type WorkerRole,
} from '@bridge-hive/domain';
import {
  Clock3,
  Copy,
  Eraser,
  Moon,
  Plus,
  Rows3,
  Trash2,
} from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import { OrgTableShell } from '@/components/org/data-table';
import { WardLibraryDialog } from '@/components/org/ward-library-dialog';
import { WardUnitSelector } from '@/components/org/ward-unit-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  addCustomRow,
  clearCustomRows,
  copyFirstRowFieldsToAll,
  deleteCustomRow,
  duplicateCustomRow,
  isOvernightShift,
  parsePositionsInput,
  sumCustomRowPositions,
  validateCustomRowFields,
  weekdayLabelForYmd,
  withLocationChange,
  type BulkCustomRow,
  type BulkCustomRowSeed,
} from './custom-row-model';

type LocationOption = { id: string; name: string; timezone: string };
type WardOption = { id: string; name: string; locationId: string };

const fieldInputClass =
  'h-9 min-w-0 rounded-xl border-bh-border/80 bg-white px-2.5 text-sm font-medium text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-[border-color,box-shadow,background] duration-150 focus-visible:border-bh-teal focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-bh-teal/25';

const premiumTableHeadClassName =
  'sticky top-0 z-10 border-b border-[#16384f]/12 bg-[linear-gradient(180deg,#16384f_0%,#0d2a3d_100%)] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/72';

function TableHeadCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn('px-2.5 py-3.5 first:pl-4 last:pr-4', className)}>
      {children}
    </th>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] font-medium text-bh-danger">{message}</p>;
}

function invalidClass(hasError: boolean) {
  return hasError
    ? 'border-bh-danger focus-visible:border-bh-danger focus-visible:ring-bh-danger/25'
    : '';
}

export function CustomRowsWorkspace({
  slug,
  rows,
  setRows,
  locations,
  wards,
  onWardsCreated,
  deadlineHours,
  setDeadlineHours,
  seed,
  showFieldErrors,
}: {
  slug: string;
  rows: BulkCustomRow[];
  setRows: Dispatch<SetStateAction<BulkCustomRow[]>>;
  locations: LocationOption[];
  wards: WardOption[];
  onWardsCreated: (
    created: Array<{ id: string; name: string; locationId: string }>,
    autoSelectWardId: string | null,
    rowIndex: number | null,
  ) => void;
  deadlineHours: string;
  setDeadlineHours: (value: string) => void;
  seed: BulkCustomRowSeed;
  showFieldErrors: boolean;
}) {
  function updateRow(index: number, patch: Partial<BulkCustomRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function updateLocation(index: number, locationId: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? withLocationChange(row, locationId, wards) : row,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-bh-border/80 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-bh-border/70 bg-[linear-gradient(180deg,#f7fafc_0%,#ffffff_100%)] px-4 py-4 sm:px-5">
          <div className="min-w-0 space-y-2.5">
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bh-teal-strong">
              <span
                aria-hidden
                className="h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
              />
              Batch settings
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="custom-deadline"
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#071d30]"
                >
                  <Clock3 className="h-3.5 w-3.5 text-bh-teal-strong" aria-hidden />
                  Claim deadline
                </Label>
                <div className="flex items-center gap-2 rounded-xl border border-bh-border bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <Input
                    id="custom-deadline"
                    type="number"
                    min={0}
                    className="h-9 w-[4.75rem] border-0 bg-transparent px-2.5 text-sm font-semibold text-[#071d30] shadow-none focus-visible:border-transparent focus-visible:ring-0"
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(e.target.value)}
                  />
                  <span className="pr-2.5 text-xs font-medium text-bh-text-secondary">
                    hours before start
                  </span>
                </div>
              </div>
              <p className="max-w-xs border-l-2 border-[#e4b334] pl-3 text-xs leading-5 text-bh-text-muted">
                Applies to every shift in this batch.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-[#16384f]/12 bg-[linear-gradient(155deg,#16384f_0%,#071d30_62%,#0c3a42_100%)] px-3.5 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_22px_rgba(7,29,48,0.22)]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <Rows3 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="leading-none">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
                  In this batch
                </p>
                <p className="mt-1 text-sm font-semibold">
                  <span className="bh-tabular text-lg tracking-tight">
                    {rows.length}
                  </span>
                  <span className="text-white/70"> / {BULK_SHIFT_MAX} shifts</span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-bh-border bg-white px-3.5 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-text-muted">
                Total positions
              </p>
              <p className="mt-1 bh-tabular text-lg font-semibold tracking-tight text-[#071d30]">
                {sumCustomRowPositions(rows)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 bg-bh-surface px-4 py-3 sm:px-5">
          <Button
            type="button"
            size="sm"
            disabled={rows.length >= BULK_SHIFT_MAX}
            onClick={() => setRows((prev) => addCustomRow(prev, seed))}
            className="h-10 rounded-xl border border-[#e4b334]/40 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-3 pr-3.5 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(7,29,48,0.24)] transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(155deg,#1d4d68_0%,#0c2844_58%,#146067_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_24px_rgba(7,29,48,0.3)] focus-visible:ring-[#e4b334] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </span>
            Add shift row
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setRows((prev) => copyFirstRowFieldsToAll(prev))}
            className="h-10 rounded-xl border border-white/20 bg-[linear-gradient(155deg,#1ab4c4_0%,#087f8c_52%,#065860_100%)] px-3 pr-3.5 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_rgba(8,127,140,0.28)] transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(155deg,#2ec6d4_0%,#0a96a6_52%,#087f8c_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_24px_rgba(8,127,140,0.36)] focus-visible:ring-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-white/15 text-white ring-1 ring-white/30">
              <Copy className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </span>
            Copy first row to all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows(clearCustomRows(seed))}
            className="h-10 rounded-xl border-bh-border bg-white px-3 pr-3.5 font-semibold text-bh-text-secondary shadow-sm transition-[transform,background,color] duration-200 hover:-translate-y-0.5 hover:bg-bh-subtle hover:text-bh-text motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-bh-subtle text-bh-text-secondary">
              <Eraser className="h-3.5 w-3.5" aria-hidden />
            </span>
            Clear rows
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <OrgTableShell className="overflow-hidden border-bh-border/80 shadow-[0_10px_32px_rgba(7,29,48,0.08)] ring-1 ring-[rgba(22,56,79,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-bh-border/70 bg-[linear-gradient(180deg,#f7fafc_0%,#ffffff_100%)] px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bh-teal-strong">
                <span
                  aria-hidden
                  className="h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
                />
                Shift rows
              </p>
              <p className="mt-1 text-xs text-bh-text-muted">
                Edit each opening independently — changes stay in this batch until you review.
              </p>
            </div>
            <p className="shrink-0 rounded-full border border-bh-border bg-white px-3 py-1 text-[11px] font-semibold text-bh-text-secondary shadow-sm">
              {rows.length} editable
            </p>
          </div>
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <thead className={premiumTableHeadClassName}>
                <tr>
                  <TableHeadCell className="w-9">#</TableHeadCell>
                  <TableHeadCell className="w-[8rem]">Date</TableHeadCell>
                  <TableHeadCell className="w-[8.25rem]">Role</TableHeadCell>
                  <TableHeadCell className="w-[8rem]">Location</TableHeadCell>
                  <TableHeadCell className="w-[8.5rem]">Ward / unit</TableHeadCell>
                  <TableHeadCell className="w-[6rem]">Start</TableHeadCell>
                  <TableHeadCell className="w-[6rem]">End</TableHeadCell>
                  <TableHeadCell className="w-[4.25rem]">Break</TableHeadCell>
                  <TableHeadCell className="w-[4.75rem]">Rate €</TableHeadCell>
                  <TableHeadCell className="w-[4.5rem]">Positions</TableHeadCell>
                  <TableHeadCell className="w-[5rem] text-right">Actions</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <CustomRowTableRow
                    key={row.key}
                    slug={slug}
                    row={row}
                    index={index}
                    locations={locations}
                    wards={wards}
                    showFieldErrors={showFieldErrors}
                    canDelete={rows.length > BULK_SHIFT_MIN}
                    canDuplicate={rows.length < BULK_SHIFT_MAX}
                    onUpdate={(patch) => updateRow(index, patch)}
                    onLocationChange={(locationId) =>
                      updateLocation(index, locationId)
                    }
                    onWardsCreated={(created, autoSelectWardId) =>
                      onWardsCreated(created, autoSelectWardId, index)
                    }
                    onDuplicate={() =>
                      setRows((prev) => duplicateCustomRow(prev, index))
                    }
                    onDelete={() =>
                      setRows((prev) => deleteCustomRow(prev, index))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </OrgTableShell>
      </div>

      <ul className="space-y-3 lg:hidden">
        {rows.map((row, index) => (
          <CustomRowMobileCard
            key={row.key}
            slug={slug}
            row={row}
            index={index}
            locations={locations}
            wards={wards}
            showFieldErrors={showFieldErrors}
            canDelete={rows.length > BULK_SHIFT_MIN}
            canDuplicate={rows.length < BULK_SHIFT_MAX}
            onUpdate={(patch) => updateRow(index, patch)}
            onLocationChange={(locationId) => updateLocation(index, locationId)}
            onWardsCreated={(created, autoSelectWardId) =>
              onWardsCreated(created, autoSelectWardId, index)
            }
            onDuplicate={() =>
              setRows((prev) => duplicateCustomRow(prev, index))
            }
            onDelete={() => setRows((prev) => deleteCustomRow(prev, index))}
          />
        ))}
      </ul>
    </div>
  );
}

function CustomRowTableRow({
  slug,
  row,
  index,
  locations,
  wards,
  showFieldErrors,
  canDelete,
  canDuplicate,
  onUpdate,
  onLocationChange,
  onWardsCreated,
  onDuplicate,
  onDelete,
}: {
  slug: string;
  row: BulkCustomRow;
  index: number;
  locations: LocationOption[];
  wards: WardOption[];
  showFieldErrors: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  onUpdate: (patch: Partial<BulkCustomRow>) => void;
  onLocationChange: (locationId: string) => void;
  onWardsCreated: (
    created: Array<{ id: string; name: string; locationId: string }>,
    autoSelectWardId: string | null,
  ) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const errors = showFieldErrors ? validateCustomRowFields(row) : {};
  const overnight = isOvernightShift(row.startHm, row.endHm);
  const dayLabel = weekdayLabelForYmd(row.dateYmd);
  const zebra = index % 2 === 1;

  return (
    <tr
      className={cn(
        'group relative border-b border-bh-border/50 transition-[background-color,box-shadow] duration-150 last:border-0',
        zebra ? 'bg-[#f5f8fa]/70' : 'bg-white',
        'hover:bg-bh-teal-soft/35 hover:shadow-[inset_3px_0_0_0_#16a6b6]',
      )}
    >
      <td className="px-1.5 py-3 align-top first:pl-3">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] px-1.5 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          {index + 1}
        </span>
      </td>
      <td className="px-1.5 py-3 align-top">
        <Input
          type="date"
          aria-label={`Row ${index + 1} date`}
          className={cn(fieldInputClass, 'w-full min-w-0', invalidClass(Boolean(errors.dateYmd)))}
          value={row.dateYmd}
          onChange={(e) => onUpdate({ dateYmd: e.target.value })}
        />
        <span
          className={cn(
            'mt-1 inline-flex h-6 items-center rounded-md border px-1.5 text-[10px] font-bold tracking-wide',
            dayLabel === 'Sat' || dayLabel === 'Sun'
              ? 'border-[#e4b334]/35 bg-[#fff8e8] text-[#8a6a10]'
              : 'border-bh-teal/25 bg-bh-teal-soft/60 text-bh-teal-strong',
          )}
        >
          {dayLabel}
        </span>
        <FieldError message={errors.dateYmd} />
      </td>
      <td className="px-1.5 py-3 align-top">
        <Select
          aria-label={`Row ${index + 1} professional role`}
          className={cn(fieldInputClass, 'w-full min-w-0', invalidClass(Boolean(errors.requiredRole)))}
          value={row.requiredRole}
          onChange={(e) =>
            onUpdate({ requiredRole: e.target.value as WorkerRole })
          }
        >
          {WORKER_ROLES.map((role) => (
            <option key={role} value={role}>
              {WORKER_ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-1.5 py-3 align-top">
        <Select
          aria-label={`Row ${index + 1} location`}
          className={cn(fieldInputClass, 'w-full min-w-0', invalidClass(Boolean(errors.locationId)))}
          value={row.locationId}
          onChange={(e) => onLocationChange(e.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
        <FieldError message={errors.locationId} />
      </td>
      <td className="px-1.5 py-3 align-top">
        <div className="min-w-0 space-y-1">
          <WardUnitSelector
            locationId={row.locationId}
            wardId={row.wardId}
            wards={wards}
            onWardChange={(wardId) => onUpdate({ wardId })}
            aria-label={`Row ${index + 1} ward or unit`}
          />
          <WardLibraryDialog
            slug={slug}
            locations={locations}
            wards={wards}
            defaultLocationId={row.locationId}
            onCreated={onWardsCreated}
          />
        </div>
      </td>
      <td className="px-1.5 py-3 align-top">
        <Input
          type="time"
          aria-label={`Row ${index + 1} start time`}
          className={cn(fieldInputClass, 'w-full min-w-0 px-1.5', invalidClass(Boolean(errors.startHm)))}
          value={row.startHm}
          onChange={(e) => onUpdate({ startHm: e.target.value })}
        />
        <FieldError message={errors.startHm} />
      </td>
      <td className="px-1.5 py-3 align-top">
        <Input
          type="time"
          aria-label={`Row ${index + 1} end time`}
          className={cn(fieldInputClass, 'w-full min-w-0 px-1.5', invalidClass(Boolean(errors.endHm)))}
          value={row.endHm}
          onChange={(e) => onUpdate({ endHm: e.target.value })}
        />
        <FieldError message={errors.endHm} />
        {overnight ? (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#16384f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
            <Moon className="h-3 w-3 text-[#e4b334]" aria-hidden />
            Overnight
          </p>
        ) : null}
      </td>
      <td className="px-1.5 py-3 align-top">
        <Input
          type="number"
          min={0}
          aria-label={`Row ${index + 1} break minutes`}
          className={cn(fieldInputClass, 'w-full min-w-0 px-1.5', invalidClass(Boolean(errors.breakMinutes)))}
          value={row.breakMinutes}
          onChange={(e) =>
            onUpdate({ breakMinutes: Number.parseInt(e.target.value, 10) || 0 })
          }
        />
        <FieldError message={errors.breakMinutes} />
      </td>
      <td className="px-1.5 py-3 align-top">
        <Input
          inputMode="decimal"
          aria-label={`Row ${index + 1} hourly rate`}
          className={cn(fieldInputClass, 'w-full min-w-0 px-1.5', invalidClass(Boolean(errors.rateEuros)))}
          value={row.rateEuros}
          onChange={(e) => onUpdate({ rateEuros: e.target.value })}
        />
        <FieldError message={errors.rateEuros} />
      </td>
      <td className="px-1.5 py-3 align-top">
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          title="Number of professionals needed for this shift"
          aria-label={`Row ${index + 1}: Number of professionals needed for this shift`}
          className={cn(fieldInputClass, 'w-full min-w-0 px-1.5', invalidClass(Boolean(errors.positions)))}
          value={row.positions}
          onChange={(e) => {
            const parsed = parsePositionsInput(e.target.value);
            onUpdate({
              positions: parsed ?? (e.target.value === '' ? 0 : row.positions),
            });
          }}
        />
        <FieldError message={errors.positions} />
      </td>
      <td className="px-1.5 py-3 align-top last:pr-3">
        <div className="flex items-center justify-end gap-0.5 opacity-80 transition-opacity duration-150 group-hover:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-bh-border bg-white shadow-sm hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong"
            aria-label={`Duplicate row ${index + 1}`}
            title="Duplicate row"
            disabled={!canDuplicate}
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-bh-border bg-white text-bh-danger shadow-sm hover:border-bh-danger/40 hover:bg-bh-danger-soft hover:text-bh-danger"
            aria-label={`Delete row ${index + 1}`}
            title="Delete row"
            disabled={!canDelete}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CustomRowMobileCard({
  slug,
  row,
  index,
  locations,
  wards,
  showFieldErrors,
  canDelete,
  canDuplicate,
  onUpdate,
  onLocationChange,
  onWardsCreated,
  onDuplicate,
  onDelete,
}: {
  slug: string;
  row: BulkCustomRow;
  index: number;
  locations: LocationOption[];
  wards: WardOption[];
  showFieldErrors: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  onUpdate: (patch: Partial<BulkCustomRow>) => void;
  onLocationChange: (locationId: string) => void;
  onWardsCreated: (
    created: Array<{ id: string; name: string; locationId: string }>,
    autoSelectWardId: string | null,
  ) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const errors = showFieldErrors ? validateCustomRowFields(row) : {};
  const overnight = isOvernightShift(row.startHm, row.endHm);

  return (
    <li className="rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-teal-strong">
            Shift {index + 1}
          </p>
          <p className="mt-1 text-sm font-semibold text-bh-text">
            {weekdayLabelForYmd(row.dateYmd)} · {row.dateYmd || '—'}
          </p>
        </div>
        {overnight ? (
          <span className="rounded-full bg-bh-teal-soft px-2.5 py-1 text-[11px] font-semibold text-bh-teal-strong">
            Overnight
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MobileField label="Date" error={errors.dateYmd}>
          <Input
            type="date"
            className={cn(fieldInputClass, invalidClass(Boolean(errors.dateYmd)))}
            value={row.dateYmd}
            onChange={(e) => onUpdate({ dateYmd: e.target.value })}
          />
        </MobileField>
        <MobileField label="Day">
          <div className="flex h-9 items-center rounded-lg border border-bh-border bg-bh-subtle px-3 text-sm font-semibold text-bh-text-secondary">
            {weekdayLabelForYmd(row.dateYmd)}
          </div>
        </MobileField>
        <MobileField label="Professional role" error={errors.requiredRole}>
          <Select
            className={cn(fieldInputClass, invalidClass(Boolean(errors.requiredRole)))}
            value={row.requiredRole}
            onChange={(e) =>
              onUpdate({ requiredRole: e.target.value as WorkerRole })
            }
          >
            {WORKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {WORKER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </MobileField>
        <MobileField label="Location" error={errors.locationId}>
          <Select
            className={cn(fieldInputClass, invalidClass(Boolean(errors.locationId)))}
            value={row.locationId}
            onChange={(e) => onLocationChange(e.target.value)}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </MobileField>
        <MobileField label="Ward / unit">
          <div className="space-y-1">
            <WardUnitSelector
              locationId={row.locationId}
              wardId={row.wardId}
              wards={wards}
              onWardChange={(wardId) => onUpdate({ wardId })}
              aria-label={`Row ${index + 1} ward or unit`}
            />
            <WardLibraryDialog
              slug={slug}
              locations={locations}
              wards={wards}
              defaultLocationId={row.locationId}
              onCreated={onWardsCreated}
            />
          </div>
        </MobileField>
        <MobileField label="Break (minutes)" error={errors.breakMinutes}>
          <Input
            type="number"
            min={0}
            className={cn(fieldInputClass, invalidClass(Boolean(errors.breakMinutes)))}
            value={row.breakMinutes}
            onChange={(e) =>
              onUpdate({ breakMinutes: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </MobileField>
        <MobileField label="Start" error={errors.startHm}>
          <Input
            type="time"
            className={cn(fieldInputClass, invalidClass(Boolean(errors.startHm)))}
            value={row.startHm}
            onChange={(e) => onUpdate({ startHm: e.target.value })}
          />
        </MobileField>
        <MobileField label="End" error={errors.endHm}>
          <Input
            type="time"
            className={cn(fieldInputClass, invalidClass(Boolean(errors.endHm)))}
            value={row.endHm}
            onChange={(e) => onUpdate({ endHm: e.target.value })}
          />
        </MobileField>
        <MobileField label="Rate (€ / hour)" error={errors.rateEuros}>
          <Input
            inputMode="decimal"
            className={cn(fieldInputClass, invalidClass(Boolean(errors.rateEuros)))}
            value={row.rateEuros}
            onChange={(e) => onUpdate({ rateEuros: e.target.value })}
          />
        </MobileField>
        <MobileField label="Positions" error={errors.positions}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            title="Number of professionals needed for this shift"
            aria-label={`Row ${index + 1}: Number of professionals needed for this shift`}
            className={cn(fieldInputClass, invalidClass(Boolean(errors.positions)))}
            value={row.positions}
            onChange={(e) => {
              const parsed = parsePositionsInput(e.target.value);
              onUpdate({
                positions: parsed ?? (e.target.value === '' ? 0 : row.positions),
              });
            }}
          />
        </MobileField>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl"
          aria-label={`Duplicate row ${index + 1}`}
          title="Duplicate row"
          disabled={!canDuplicate}
          onClick={onDuplicate}
        >
          <Copy className="h-4 w-4" aria-hidden />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          aria-label={`Delete row ${index + 1}`}
          title="Delete row"
          disabled={!canDelete}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </Button>
      </div>
    </li>
  );
}

function MobileField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-bh-text">{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
