'use client';

import {
  BULK_SHIFT_MAX,
  BULK_SHIFT_MIN,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  type WorkerRole,
} from '@bridge-hive/domain';
import {
  Copy,
  Eraser,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import {
  OrgTableShell,
  orgTableHeadClassName,
  orgTableRowClassName,
} from '@/components/org/data-table';
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
  validateCustomRowFields,
  weekdayLabelForYmd,
  withLocationChange,
  type BulkCustomRow,
  type BulkCustomRowSeed,
} from './custom-row-model';

type LocationOption = { id: string; name: string; timezone: string };
type WardOption = { id: string; name: string; locationId: string };

const fieldInputClass =
  'h-9 min-w-0 rounded-lg border-bh-border bg-bh-surface px-2.5 text-sm focus-visible:border-bh-teal focus-visible:ring-bh-teal/30';

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
      <div className="flex flex-col gap-3 rounded-2xl border border-bh-border bg-bh-surface p-3 shadow-[0_1px_2px_rgba(7,29,48,0.04)] sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-deadline" className="text-bh-text">
              Claim deadline
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="custom-deadline"
                type="number"
                min={0}
                className={cn(fieldInputClass, 'w-28')}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(e.target.value)}
              />
              <span className="text-sm text-bh-text-secondary">
                hours before start
              </span>
            </div>
            <p className="max-w-xl text-xs leading-5 text-bh-text-muted">
              Applies to every shift in this batch.
            </p>
          </div>
          <p className="rounded-xl border border-bh-border bg-bh-subtle/70 px-3 py-2 text-sm font-semibold text-bh-text">
            <span className="bh-tabular text-base text-[#071d30]">
              {rows.length}
            </span>
            <span className="text-bh-text-muted"> / {BULK_SHIFT_MAX} shifts</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-xl"
            disabled={rows.length >= BULK_SHIFT_MAX}
            onClick={() => setRows((prev) => addCustomRow(prev, seed))}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add shift row
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-xl"
            onClick={() => setRows((prev) => copyFirstRowFieldsToAll(prev))}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy first row to all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setRows(clearCustomRows(seed))}
          >
            <Eraser className="h-4 w-4" aria-hidden />
            Clear rows
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <OrgTableShell className="overflow-hidden">
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full min-w-[78rem] text-left text-sm">
              <thead className={cn(orgTableHeadClassName, 'sticky top-0 z-10')}>
                <tr>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Day</th>
                  <th className="px-3 py-3">Professional role</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Ward / unit</th>
                  <th className="px-3 py-3">Start</th>
                  <th className="px-3 py-3">End</th>
                  <th className="px-3 py-3">Break</th>
                  <th className="px-3 py-3">Rate (€ / hour)</th>
                  <th className="px-3 py-3">Shift label</th>
                  <th className="px-3 py-3">Actions</th>
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

  return (
    <tr className={orgTableRowClassName}>
      <td className="px-3 py-2.5 align-top text-xs font-semibold text-bh-text-muted">
        {index + 1}
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          type="date"
          aria-label={`Row ${index + 1} date`}
          className={cn(fieldInputClass, 'w-[9.5rem]', invalidClass(Boolean(errors.dateYmd)))}
          value={row.dateYmd}
          onChange={(e) => onUpdate({ dateYmd: e.target.value })}
        />
        <FieldError message={errors.dateYmd} />
      </td>
      <td className="px-3 py-2.5 align-top">
        <span className="inline-flex h-9 items-center rounded-lg bg-bh-subtle px-2.5 text-xs font-semibold text-bh-text-secondary">
          {weekdayLabelForYmd(row.dateYmd)}
        </span>
      </td>
      <td className="px-2 py-2 align-top">
        <Select
          aria-label={`Row ${index + 1} professional role`}
          className={cn(fieldInputClass, 'w-[11rem]', invalidClass(Boolean(errors.requiredRole)))}
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
      <td className="px-2 py-2 align-top">
        <Select
          aria-label={`Row ${index + 1} location`}
          className={cn(fieldInputClass, 'w-[10.5rem]', invalidClass(Boolean(errors.locationId)))}
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
      <td className="px-2 py-2 align-top">
        <div className="w-[11.5rem] space-y-1">
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
      <td className="px-2 py-2 align-top">
        <Input
          type="time"
          aria-label={`Row ${index + 1} start time`}
          className={cn(fieldInputClass, 'w-[7.5rem]', invalidClass(Boolean(errors.startHm)))}
          value={row.startHm}
          onChange={(e) => onUpdate({ startHm: e.target.value })}
        />
        <FieldError message={errors.startHm} />
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          type="time"
          aria-label={`Row ${index + 1} end time`}
          className={cn(fieldInputClass, 'w-[7.5rem]', invalidClass(Boolean(errors.endHm)))}
          value={row.endHm}
          onChange={(e) => onUpdate({ endHm: e.target.value })}
        />
        <FieldError message={errors.endHm} />
        {overnight ? (
          <p className="mt-1 text-[11px] font-medium text-bh-teal-strong">
            Overnight
          </p>
        ) : null}
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          type="number"
          min={0}
          aria-label={`Row ${index + 1} break minutes`}
          className={cn(fieldInputClass, 'w-[5.5rem]', invalidClass(Boolean(errors.breakMinutes)))}
          value={row.breakMinutes}
          onChange={(e) =>
            onUpdate({ breakMinutes: Number.parseInt(e.target.value, 10) || 0 })
          }
        />
        <FieldError message={errors.breakMinutes} />
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          inputMode="decimal"
          aria-label={`Row ${index + 1} hourly rate`}
          className={cn(fieldInputClass, 'w-[6.5rem]', invalidClass(Boolean(errors.rateEuros)))}
          value={row.rateEuros}
          onChange={(e) => onUpdate({ rateEuros: e.target.value })}
        />
        <FieldError message={errors.rateEuros} />
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          aria-label={`Row ${index + 1} shift label`}
          className={cn(fieldInputClass, 'w-[9rem]', invalidClass(Boolean(errors.title)))}
          value={row.title}
          maxLength={200}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <FieldError message={errors.title} />
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={`Duplicate row ${index + 1}`}
            title="Duplicate row"
            disabled={!canDuplicate}
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-bh-danger hover:text-bh-danger"
            aria-label={`Delete row ${index + 1}`}
            title="Delete row"
            disabled={!canDelete}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
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
        <MobileField label="Shift label" error={errors.title}>
          <Input
            className={cn(fieldInputClass, invalidClass(Boolean(errors.title)))}
            value={row.title}
            maxLength={200}
            onChange={(e) => onUpdate({ title: e.target.value })}
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
