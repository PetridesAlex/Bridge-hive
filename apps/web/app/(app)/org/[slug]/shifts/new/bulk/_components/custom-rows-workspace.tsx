'use client';

import {
  BULK_SHIFT_MAX,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  type WorkerRole,
} from '@bridge-hive/domain';
import {
  Clock3,
  Copy,
  Eraser,
  Minus,
  Moon,
  Plus,
  Rows3,
  Trash2,
  Users,
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
import { Hm24Field } from './hm24-field';

type LocationOption = { id: string; name: string; timezone: string };
type WardOption = { id: string; name: string; locationId: string };

const fieldInputClass =
  'h-9 min-w-0 rounded-xl border-[#16384f]/15 bg-white/95 px-2.5 text-sm font-medium text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(7,29,48,0.04)] transition-[border-color,box-shadow,background,transform] duration-150 hover:border-[#16384f]/30 focus-visible:border-bh-teal focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-bh-teal/25';

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
      <div className="overflow-hidden rounded-2xl border border-[#16384f]/15 bg-bh-surface shadow-[0_14px_34px_rgba(7,29,48,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section
            aria-labelledby="custom-deadline-label"
            className="border-b border-bh-border/70 bg-[linear-gradient(180deg,#f7fafc_0%,#ffffff_100%)] p-4 sm:p-5 lg:border-b-0 lg:border-r"
          >
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bh-teal-strong">
              <span
                aria-hidden
                className="h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
              />
              Batch settings
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div>
                <Label
                  id="custom-deadline-label"
                  htmlFor="custom-deadline"
                  className="flex items-center gap-1.5 text-sm font-bold text-[#071d30]"
                >
                  <Clock3 className="h-4 w-4 text-bh-teal-strong" aria-hidden />
                  Claim deadline
                </Label>
                <div className="mt-2 inline-flex items-center rounded-2xl border-2 border-[#16384f]/15 bg-white p-1 shadow-[0_6px_16px_rgba(7,29,48,0.06)] transition-colors focus-within:border-bh-teal">
                  <button
                    type="button"
                    aria-label="Decrease hours"
                    onClick={() =>
                      setDeadlineHours(String(Math.max(0, (Number(deadlineHours) || 0) - 1)))
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl text-[#071d30] transition-colors hover:bg-bh-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <Input
                    id="custom-deadline"
                    type="number"
                    min={0}
                    className="bh-tabular h-9 w-16 border-0 bg-transparent px-1 text-center text-lg font-bold text-[#071d30] shadow-none [appearance:textfield] focus-visible:border-transparent focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Increase hours"
                    onClick={() =>
                      setDeadlineHours(String((Number(deadlineHours) || 0) + 1))
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl text-[#071d30] transition-colors hover:bg-bh-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="pl-1.5 pr-3 text-xs font-semibold text-bh-text-secondary">
                    hours before start
                  </span>
                </div>
              </div>
              <div className="min-w-[12rem] flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
                  Quick pick
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[2, 6, 12, 24, 48].map((hours) => {
                    const active = Number(deadlineHours) === hours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setDeadlineHours(String(hours))}
                        className={cn(
                          'h-8 rounded-full px-3 text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:transition-none',
                          active
                            ? 'bg-[#071d30] text-white shadow-[0_6px_14px_rgba(7,29,48,0.25)]'
                            : 'bg-white text-[#071d30] ring-1 ring-[#16384f]/15 hover:-translate-y-0.5 hover:ring-bh-teal motion-reduce:hover:translate-y-0',
                        )}
                      >
                        {hours}h
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-3 border-l-2 border-[#e4b334] pl-3 text-xs leading-5 text-bh-text-muted">
              Workers can claim each shift until this long before it starts. Applies to
              every shift in this batch.
            </p>
          </section>

          <section
            aria-label="Batch summary"
            className="relative overflow-hidden bg-[#071d30] p-4 text-white sm:p-5"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#5ec8ff]/25 blur-2xl"
            />
            <div className="relative grid gap-4 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5ec8ff]">
                  <Rows3 className="h-3.5 w-3.5" aria-hidden />
                  In this batch
                </p>
                <p className="mt-1.5 leading-none">
                  <span className="bh-tabular text-3xl font-bold tracking-tight">
                    {rows.length}
                  </span>
                  <span className="text-sm font-medium text-white/65"> / {BULK_SHIFT_MAX} shifts</span>
                </p>
                <div
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-label="Shifts used"
                  aria-valuemin={0}
                  aria-valuemax={BULK_SHIFT_MAX}
                  aria-valuenow={rows.length}
                >
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#e4b334,#f3d27a)] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${Math.min(100, (rows.length / BULK_SHIFT_MAX) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5ec8ff]">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Total positions
                </p>
                <p className="bh-tabular mt-1.5 text-3xl font-bold leading-none tracking-tight">
                  {sumCustomRowPositions(rows)}
                </p>
                <p className="mt-2.5 text-xs text-white/65">Workers needed across all shifts</p>
              </div>
            </div>
          </section>
        </div>

        <div
          role="toolbar"
          aria-label="Shift row actions"
          className="flex flex-wrap items-center gap-2.5 border-t border-bh-border/70 bg-[#f7fafc] px-4 py-3 sm:px-5"
        >
          <Button
            type="button"
            size="sm"
            disabled={rows.length >= BULK_SHIFT_MAX}
            onClick={() => setRows((prev) => addCustomRow(prev, seed))}
            className="h-10 rounded-xl border border-[#e4b334]/40 bg-[#071d30] px-3 pr-4 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(7,29,48,0.24)] transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:bg-[#0a283c] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_24px_rgba(7,29,48,0.3)] focus-visible:ring-[#e4b334] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </span>
            Add shift row
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length < 2}
            title="Copies the first row's times, location, ward, role, break, rate and positions to every row (dates stay as they are)"
            onClick={() => setRows((prev) => copyFirstRowFieldsToAll(prev))}
            className="h-10 rounded-xl border-2 border-bh-teal/40 bg-white px-3 pr-4 font-semibold text-bh-teal-strong shadow-sm transition-[transform,background,color,border-color] duration-200 hover:-translate-y-0.5 hover:border-bh-teal hover:bg-bh-teal-soft motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-bh-teal-soft text-bh-teal-strong">
              <Copy className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </span>
            Copy first row to all
          </Button>
          <span aria-hidden className="mx-1 hidden h-6 w-px bg-bh-border sm:block" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => setRows(() => clearCustomRows())}
            className="h-10 rounded-xl px-3 pr-4 font-semibold text-bh-text-secondary transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
          >
            <Eraser className="mr-1.5 h-4 w-4" aria-hidden />
            Clear rows
          </Button>
          <p className="ml-auto hidden text-xs text-bh-text-muted md:block">
            Tip: fill the first row, then copy it to all rows.
          </p>
        </div>
      </div>

      <div className="hidden lg:block">
        <OrgTableShell className="overflow-hidden border-[#16384f]/20 shadow-[0_18px_40px_rgba(7,29,48,0.12)] ring-1 ring-[rgba(22,56,79,0.08)]">
          <div className="relative flex items-center justify-between gap-3 overflow-hidden bg-[#071d30] px-4 py-3.5 text-white">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#5ec8ff]/25 blur-2xl"
            />
            <span
              aria-hidden
              className="bh-orb-drift pointer-events-none absolute -bottom-10 right-8 h-20 w-20 rounded-full bg-[#5ec8ff]/15 blur-2xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,transparent,#5ec8ff,transparent)]"
            />
            <div className="relative min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5ec8ff]">
                Shift rows
              </p>
              <p className="mt-1 text-xs text-white/70">
                Edit each opening independently — changes stay in this batch until you review.
              </p>
            </div>
            <p className="relative shrink-0 rounded-full bg-[#e4b334] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.35)]">
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
                  <TableHeadCell className="w-[7.25rem]">Start</TableHeadCell>
                  <TableHeadCell className="w-[7.25rem]">End</TableHeadCell>
                  <TableHeadCell className="w-[4rem]">Break</TableHeadCell>
                  <TableHeadCell className="w-[4.5rem]">Rate €</TableHeadCell>
                  <TableHeadCell className="w-[4.25rem]">Positions</TableHeadCell>
                  <TableHeadCell className="w-[4.75rem] text-right">Actions</TableHeadCell>
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
        'group relative border-b border-[#16384f]/10 transition-[background-color,box-shadow] duration-200 last:border-0',
        zebra ? 'bg-[rgba(232,242,250,0.55)]' : 'bg-white/85',
        'hover:bg-white hover:shadow-[inset_3px_0_0_0_#e4b334,0_8px_18px_rgba(7,29,48,0.05)]',
      )}
    >
      <td className="px-1.5 py-3 align-top first:pl-3">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[#071d30] px-1.5 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          {index + 1}
        </span>
      </td>
      <td className="px-1.5 py-3 align-top">
        <span
          className={cn(
            'mb-1.5 inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[10px] font-bold uppercase tracking-[0.14em]',
            dayLabel === 'Sat' || dayLabel === 'Sun'
              ? 'bg-[#e4b334] text-[#071d30]'
              : 'bg-[#071d30] text-[#5ec8ff]',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              dayLabel === 'Sat' || dayLabel === 'Sun'
                ? 'bg-[#071d30]'
                : 'bh-soft-pulse bg-[#e4b334]',
            )}
            aria-hidden
          />
          {dayLabel}
        </span>
        <Input
          type="date"
          aria-label={`Row ${index + 1} date`}
          className={cn(fieldInputClass, 'w-full min-w-0', invalidClass(Boolean(errors.dateYmd)))}
          value={row.dateYmd}
          onChange={(e) => onUpdate({ dateYmd: e.target.value })}
        />
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
        <div className="min-w-0 space-y-1 rounded-xl bg-white/90 p-1.5 ring-1 ring-[#16384f]/10">
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
        <Hm24Field
          aria-label={`Row ${index + 1} start time`}
          selectClassName={cn(fieldInputClass, 'w-full min-w-0 px-1')}
          invalid={Boolean(errors.startHm)}
          value={row.startHm}
          onChange={(startHm) => onUpdate({ startHm })}
        />
        <FieldError message={errors.startHm} />
      </td>
      <td className="px-1.5 py-3 align-top">
        <Hm24Field
          aria-label={`Row ${index + 1} end time`}
          selectClassName={cn(fieldInputClass, 'w-full min-w-0 px-1')}
          invalid={Boolean(errors.endHm)}
          value={row.endHm}
          onChange={(endHm) => onUpdate({ endHm })}
        />
        <FieldError message={errors.endHm} />
        {overnight ? (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#16384f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
            <Moon className="h-3 w-3 text-[#e4b334]" aria-hidden />
            Overnight · ends next day
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
        <MobileField label="Start (24h)" error={errors.startHm}>
          <Hm24Field
            aria-label={`Row ${index + 1} start time`}
            selectClassName={cn(fieldInputClass, invalidClass(Boolean(errors.startHm)))}
            invalid={Boolean(errors.startHm)}
            value={row.startHm}
            onChange={(startHm) => onUpdate({ startHm })}
          />
        </MobileField>
        <MobileField
          label={overnight ? 'End (24h, next day)' : 'End (24h)'}
          error={errors.endHm}
        >
          <Hm24Field
            aria-label={`Row ${index + 1} end time`}
            selectClassName={cn(fieldInputClass, invalidClass(Boolean(errors.endHm)))}
            invalid={Boolean(errors.endHm)}
            value={row.endHm}
            onChange={(endHm) => onUpdate({ endHm })}
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
