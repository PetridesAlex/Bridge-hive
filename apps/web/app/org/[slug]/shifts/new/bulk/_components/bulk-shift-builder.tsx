'use client';

import {
  BULK_SHIFT_MAX,
  WORKER_ROLES,
  WORKER_ROLE_LABELS,
  assertBulkShiftCount,
  deadlineHoursBeforeStart,
  expandIndividualDates,
  expandWeekdayRecurrence,
  findExactDuplicateShifts,
  findOverlappingShifts,
  formatMoneyMinor,
  newBulkRequestKey,
  resolveShiftLocalWindow,
  sumRequiredPositions,
  summarizeBulkBatch,
  type BulkCreationMode,
  type BulkPreviewShift,
  type BulkRequestedStatus,
  type IsoWeekday,
  type WorkerRole,
} from '@bridge-hive/domain';
import {
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Rows3,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  useMemo,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import {
  createShiftsBatchAction,
  type CreateShiftsBatchInput,
} from '@/app/actions/bulk-shifts';
import { ShiftLocationSetupGate } from '@/components/org/shift-location-setup-gate';
import { WardLibraryDialog } from '@/components/org/ward-library-dialog';
import { WardUnitSelector } from '@/components/org/ward-unit-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { eurosToMinor, localInputToIsoWithTimezone, minorToEurosInput } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  createStarterCustomRows,
  todayYmdLocal,
  type BulkCustomRow,
  type BulkCustomRowSeed,
} from './custom-row-model';
import { CustomRowsWorkspace } from './custom-rows-workspace';

export type BulkTemplateDefaults = {
  locationId: string;
  wardId: string | null;
  requiredRole: WorkerRole;
  startHm: string;
  endHm: string;
  breakMinutes: number;
  rateMinor: number;
  currency: string;
  title: string | null;
  notes: string | null;
  deadlineHoursBefore: number | null;
};

type LocationOption = { id: string; name: string; timezone: string };
type WardOption = { id: string; name: string; locationId: string };

type Step = 'build' | 'review' | 'confirm' | 'success';

const WEEKDAY_OPTIONS: Array<{ value: IsoWeekday; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function BulkShiftBuilder({
  slug,
  organizationTimezone,
  canPublish,
  locations,
  wards,
  defaults,
}: {
  slug: string;
  organizationTimezone: string;
  canPublish: boolean;
  locations: LocationOption[];
  wards: WardOption[];
  defaults: BulkTemplateDefaults | null;
}) {
  const [step, setStep] = useState<Step>('build');
  const [mode, setMode] = useState<BulkCreationMode>('custom');
  const [pending, startTransition] = useTransition();
  const [wardOptions, setWardOptions] = useState<WardOption[]>(wards);

  const defaultLocationId = defaults?.locationId ?? locations[0]?.id ?? '';
  const customRowSeed: BulkCustomRowSeed = {
    startHm: defaults?.startHm ?? '08:00',
    endHm: defaults?.endHm ?? '16:00',
    locationId: defaultLocationId,
    wardId: defaults?.wardId ?? '',
    requiredRole: (defaults?.requiredRole ?? 'registered_nurse') as WorkerRole,
    breakMinutes: defaults?.breakMinutes ?? 30,
    rateEuros: defaults ? minorToEurosInput(defaults.rateMinor) : '25.00',
    positions: 1,
  };
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [wardId, setWardId] = useState(defaults?.wardId ?? '');
  const [requiredRole, setRequiredRole] = useState<WorkerRole>(
    defaults?.requiredRole ?? 'registered_nurse',
  );
  const [startHm, setStartHm] = useState(defaults?.startHm ?? '08:00');
  const [endHm, setEndHm] = useState(defaults?.endHm ?? '16:00');
  const [breakMinutes, setBreakMinutes] = useState(
    String(defaults?.breakMinutes ?? 30),
  );
  const [rateEuros, setRateEuros] = useState(
    defaults ? minorToEurosInput(defaults.rateMinor) : '25.00',
  );
  const [title, setTitle] = useState(defaults?.title ?? '');
  const [positions, setPositions] = useState('1');
  const [deadlineHours, setDeadlineHours] = useState(
    String(defaults?.deadlineHoursBefore ?? 24),
  );

  // Repeat mode
  const [rangeStart, setRangeStart] = useState(todayYmdLocal());
  const [rangeEnd, setRangeEnd] = useState(addDaysYmd(todayYmdLocal(), 13));
  const [weekdays, setWeekdays] = useState<IsoWeekday[]>([1, 2, 3, 4, 5]);

  // Individual dates
  const [dateDraft, setDateDraft] = useState('');
  const [individualDates, setIndividualDates] = useState<string[]>([]);

  // Custom rows — default experience, including when a template is applied
  const [customRows, setCustomRows] = useState<BulkCustomRow[]>(() =>
    createStarterCustomRows(customRowSeed),
  );

  const [requestedStatus, setRequestedStatus] =
    useState<BulkRequestedStatus>('draft');
  const [allowExactDuplicates, setAllowExactDuplicates] = useState(false);
  const [requestKey] = useState(() => newBulkRequestKey());
  const [buildError, setBuildError] = useState<string | null>(null);
  const [showCustomFieldErrors, setShowCustomFieldErrors] = useState(false);
  const [result, setResult] = useState<{
    batchId: string;
    shiftIds: string[];
    shiftCount: number;
    requestedStatus: BulkRequestedStatus;
  } | null>(null);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const locationTz = selectedLocation?.timezone ?? organizationTimezone;

  function mergeCreatedWards(
    created: Array<{ id: string; name: string; locationId: string }>,
  ) {
    setWardOptions((prev) => {
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
  }

  const locationTzById = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) map.set(loc.id, loc.timezone);
    return map;
  }, [locations]);

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) map.set(loc.id, loc.name);
    return map;
  }, [locations]);

  const wardNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ward of wardOptions) map.set(ward.id, ward.name);
    return map;
  }, [wardOptions]);

  const built = useMemo(() => {
    try {
      if (mode === 'custom') {
        return buildFromCustomRows(
          customRows,
          locationTzById,
          organizationTimezone,
          Number(deadlineHours),
        );
      }

      let dates: string[] = [];
      if (mode === 'repeat') {
        const expanded = expandWeekdayRecurrence({
          startYmd: rangeStart,
          endYmd: rangeEnd,
          weekdays,
        });
        if (!expanded.ok) {
          return { error: expanded.error, rows: [] as BuiltRow[], preview: [] as BulkPreviewShift[] };
        }
        dates = expanded.dates;
      } else {
        const expanded = expandIndividualDates(individualDates);
        if (!expanded.ok) {
          return { error: expanded.error, rows: [] as BuiltRow[], preview: [] as BulkPreviewShift[] };
        }
        dates = expanded.dates;
      }

      if (!locationId) {
        return {
          error: 'Select a location.',
          rows: [] as BuiltRow[],
          preview: [] as BulkPreviewShift[],
        };
      }

      const positionsValue = Number.parseInt(positions, 10);
      if (
        !Number.isInteger(positionsValue) ||
        positionsValue < 1 ||
        positionsValue > 100
      ) {
        return {
          error: 'Positions must be a whole number from 1 to 100.',
          rows: [] as BuiltRow[],
          preview: [] as BulkPreviewShift[],
        };
      }

      return buildFromSharedTemplate({
        dates,
        locationId,
        wardId: wardId || null,
        requiredRole,
        startHm,
        endHm,
        breakMinutes: Number(breakMinutes) || 0,
        rateMinor: eurosToMinor(rateEuros),
        title: title.trim() || null,
        requiredPositions: positionsValue,
        locationTz,
        deadlineHours: Number(deadlineHours),
      });
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Unable to build preview.',
        rows: [] as BuiltRow[],
        preview: [] as BulkPreviewShift[],
      };
    }
  }, [
    locationTzById,
    organizationTimezone,
    mode,
    customRows,
    rangeStart,
    rangeEnd,
    weekdays,
    individualDates,
    locationId,
    wardId,
    requiredRole,
    startHm,
    endHm,
    breakMinutes,
    rateEuros,
    title,
    positions,
    locationTz,
    deadlineHours,
  ]);

  const preview = built.preview;
  const summary = summarizeBulkBatch(preview);
  const totalPositions = sumRequiredPositions(preview);
  const exactDupes = findExactDuplicateShifts(preview);
  const overlaps = findOverlappingShifts(preview);
  const countCheck = assertBulkShiftCount(preview.length);

  function goReview() {
    if (mode === 'custom') {
      setShowCustomFieldErrors(true);
    }
    if (built.error) {
      setBuildError(built.error);
      return;
    }
    if (!countCheck.ok) {
      setBuildError(countCheck.error);
      return;
    }
    setBuildError(null);
    setShowCustomFieldErrors(false);
    setStep('review');
  }

  function submitBatch() {
    if (!built.rows.length) return;
    startTransition(async () => {
      const payload: CreateShiftsBatchInput = {
        requestKey,
        requestedStatus,
        creationMode: mode,
        allowExactDuplicates:
          allowExactDuplicates || exactDupes.length === 0,
        shifts: built.rows.map((r) => ({
          locationId: r.locationId,
          wardId: r.wardId,
          requiredRole: r.requiredRole,
          startsAt: r.startsAt,
          endsAt: r.endsAt,
          breakMinutes: r.breakMinutes,
          rateMinor: r.rateMinor,
          currency: 'EUR',
          acceptanceDeadline: r.acceptanceDeadline,
          title: r.title,
          notes: defaults?.notes ?? null,
          requiredPositions: r.requiredPositions,
        })),
      };

      const res = await createShiftsBatchAction(slug, payload);
      if (!res.success) {
        toast.error(res.error);
        if (res.exactDuplicates?.length) {
          setAllowExactDuplicates(false);
          setStep('review');
        }
        return;
      }
      setResult({
        batchId: res.batchId,
        shiftIds: res.shiftIds,
        shiftCount: res.shiftCount,
        requestedStatus: res.requestedStatus,
      });
      setStep('success');
      toast.success(
        res.idempotentReplay
          ? 'Batch already created (idempotent replay).'
          : `Created ${res.shiftCount} shifts.`,
      );
    });
  }

  if (!locations.length) {
    return <ShiftLocationSetupGate slug={slug} context="bulk" />;
  }

  if (step === 'success' && result) {
    return (
      <div className="rounded-2xl border border-bh-border bg-bh-surface p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bh-success-soft text-bh-success">
          <Check className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-bh-text">
          {result.requestedStatus === 'published'
            ? 'Shifts published'
            : 'Draft shifts created'}
        </h2>
        <p className="mt-2 text-sm text-bh-text-secondary">
          {result.shiftCount} shifts are ready. Filter the schedule by this batch
          or open individual shifts.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="honey">
            <Link href={`/org/${slug}/shifts?batch=${result.batchId}`}>
              View batch on shifts
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/org/${slug}/shifts`}>All shifts</Link>
          </Button>
          {result.shiftIds[0] ? (
            <Button asChild variant="ghost">
              <Link href={`/org/${slug}/shifts/${result.shiftIds[0]}`}>
                Open first shift
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepRail step={step} />

      <p className="text-xs font-medium text-bh-text-muted">
        Times use location timezone
        {selectedLocation ? ` · ${selectedLocation.name} (${locationTz})` : ` · ${organizationTimezone}`}
      </p>

      {step === 'build' ? (
        <div className="space-y-5">
          <ModeCards
            mode={mode}
            onChange={(next) => {
              setMode(next);
              setBuildError(null);
              if (next !== 'custom') setShowCustomFieldErrors(false);
            }}
          />

          {mode !== 'custom' ? (
            <SharedTemplateFields
              slug={slug}
              locations={locations}
              wards={wardOptions}
              locationId={locationId}
              setLocationId={(id) => {
                setLocationId(id);
                const stillValid = wardOptions.some(
                  (ward) => ward.id === wardId && ward.locationId === id,
                );
                if (!stillValid) setWardId('');
              }}
              wardId={wardId}
              setWardId={setWardId}
              onWardsCreated={(created, autoSelectWardId) => {
                mergeCreatedWards(created);
                if (autoSelectWardId) setWardId(autoSelectWardId);
              }}
              requiredRole={requiredRole}
              setRequiredRole={setRequiredRole}
              startHm={startHm}
              setStartHm={setStartHm}
              endHm={endHm}
              setEndHm={setEndHm}
              breakMinutes={breakMinutes}
              setBreakMinutes={setBreakMinutes}
              rateEuros={rateEuros}
              setRateEuros={setRateEuros}
              title={title}
              setTitle={setTitle}
              positions={positions}
              setPositions={setPositions}
              deadlineHours={deadlineHours}
              setDeadlineHours={setDeadlineHours}
            />
          ) : null}

          {mode === 'repeat' ? (
            <div className="grid gap-4 rounded-2xl border border-bh-border bg-bh-surface p-4 sm:grid-cols-2 sm:p-5">
              <div className="space-y-2">
                <Label htmlFor="range-start">From date</Label>
                <Input
                  id="range-start"
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="range-end">To date</Label>
                <Input
                  id="range-end"
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Weekdays</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((d) => {
                    const on = weekdays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setWeekdays((prev) =>
                            on
                              ? prev.filter((x) => x !== d.value)
                              : [...prev, d.value].sort(),
                          )
                        }
                        className={cn(
                          'h-9 min-w-12 rounded-lg border px-3 text-sm font-medium transition-colors',
                          on
                            ? 'border-bh-honey bg-bh-honey-soft text-bh-text'
                            : 'border-bh-border bg-bh-surface text-bh-text-secondary hover:bg-bh-subtle',
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'individual' ? (
            <div className="space-y-3 rounded-2xl border border-bh-border bg-bh-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1 space-y-2">
                  <Label htmlFor="add-date">Add dates</Label>
                  <Input
                    id="add-date"
                    type="date"
                    value={dateDraft}
                    onChange={(e) => setDateDraft(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!dateDraft) return;
                    setIndividualDates((prev) =>
                      [...new Set([...prev, dateDraft])].sort(),
                    );
                    setDateDraft('');
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {individualDates.length ? (
                <ul className="flex flex-wrap gap-2">
                  {individualDates.map((d) => (
                    <li
                      key={d}
                      className="inline-flex items-center gap-1 rounded-lg border border-bh-border bg-bh-subtle/60 px-2.5 py-1 text-sm"
                    >
                      {d}
                      <button
                        type="button"
                        className="text-bh-text-muted hover:text-bh-danger"
                        aria-label={`Remove ${d}`}
                        onClick={() =>
                          setIndividualDates((prev) => prev.filter((x) => x !== d))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-bh-text-muted">
                  Add at least two dates to continue.
                </p>
              )}
            </div>
          ) : null}

          {mode === 'custom' ? (
            <CustomRowsWorkspace
              slug={slug}
              rows={customRows}
              setRows={setCustomRows}
              locations={locations}
              wards={wardOptions}
              onWardsCreated={(created, autoSelectWardId, rowIndex) => {
                mergeCreatedWards(created);
                if (autoSelectWardId != null && rowIndex != null) {
                  setCustomRows((prev) =>
                    prev.map((row, index) =>
                      index === rowIndex
                        ? { ...row, wardId: autoSelectWardId }
                        : row,
                    ),
                  );
                }
              }}
              deadlineHours={deadlineHours}
              setDeadlineHours={setDeadlineHours}
              seed={customRowSeed}
              showFieldErrors={showCustomFieldErrors}
            />
          ) : null}

          {(buildError || built.error) && (
            <p className="text-sm text-bh-danger" role="alert">
              {buildError || built.error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border bg-bh-subtle/40 px-4 py-3">
            <p className="text-sm text-bh-text-secondary">
              Preview:{' '}
              <span className="font-semibold text-bh-text">
                {preview.length} / {BULK_SHIFT_MAX}
              </span>{' '}
              shifts
            </p>
            <Button type="button" variant="honey" onClick={goReview}>
              Review shifts
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'review' || step === 'confirm' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="Shifts"
              value={String(summary.shiftCount)}
            />
            <SummaryTile
              label="Total positions"
              value={String(totalPositions)}
            />
            <SummaryTile
              label="Est. gross"
              value={formatMoneyMinor(
                summary.estimatedGrossMinor,
                summary.currency,
              )}
            />
            <SummaryTile
              label="Roles"
              value={summary.roleCounts
                .filter((r) => r.count > 0)
                .map((r) => `${r.count} ${r.label}`)
                .join(' · ') || '—'}
            />
          </div>

          {exactDupes.length > 0 ? (
            <div className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft/40 px-4 py-3 text-sm text-bh-text">
              <p className="font-medium">
                {exactDupes.length} exact duplicate pair
                {exactDupes.length === 1 ? '' : 's'} detected.
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowExactDuplicates}
                  onChange={(e) => setAllowExactDuplicates(e.target.checked)}
                />
                Create duplicates anyway
              </label>
            </div>
          ) : null}

          {overlaps.length > 0 ? (
            <p className="rounded-xl border border-bh-warning/30 bg-bh-warning-soft/50 px-4 py-3 text-sm text-bh-text">
              {overlaps.length} overlapping shift
              {overlaps.length === 1 ? '' : 's'} at the same location (warning
              only).
            </p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface">
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="sticky top-0 bg-bh-subtle/90 text-[11px] font-semibold uppercase tracking-wide text-bh-text-muted backdrop-blur">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Time</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5">Ward / unit</th>
                    <th className="px-3 py-2.5">Positions</th>
                    <th className="px-3 py-2.5">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className="border-t border-bh-border/70"
                    >
                      <td className="px-3 py-2 text-bh-text-muted">
                        {row.rowIndex + 1}
                      </td>
                      <td className="px-3 py-2 font-medium text-bh-text">
                        {row.dateYmd}
                      </td>
                      <td className="px-3 py-2 text-bh-text-secondary">
                        {row.startsAtIso.slice(11, 16)}–
                        {row.endsAtIso.slice(11, 16)} UTC
                      </td>
                      <td className="px-3 py-2">
                        {WORKER_ROLE_LABELS[row.requiredRole]}
                      </td>
                      <td className="px-3 py-2 text-bh-text-secondary">
                        {locationNameById.get(row.locationId) ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-bh-text-secondary">
                        {row.wardId
                          ? (wardNameById.get(row.wardId) ?? '—')
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-bh-text-secondary">
                        {row.requiredPositions ?? 1}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoneyMinor(row.rateMinor, row.currency)}/hr
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {step === 'confirm' ? (
            <div className="space-y-3 rounded-2xl border border-bh-border bg-bh-surface p-4 sm:p-5">
              <p className="text-sm font-medium text-bh-text">Create as</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRequestedStatus('draft')}
                  className={cn(
                    'rounded-xl border px-4 py-2.5 text-sm font-medium',
                    requestedStatus === 'draft'
                      ? 'border-bh-sidebar bg-bh-sidebar text-white'
                      : 'border-bh-border bg-bh-surface text-bh-text',
                  )}
                >
                  Drafts (default)
                </button>
                {canPublish ? (
                  <button
                    type="button"
                    onClick={() => setRequestedStatus('published')}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-sm font-medium',
                      requestedStatus === 'published'
                        ? 'border-bh-honey bg-bh-honey text-bh-text'
                        : 'border-bh-border bg-bh-surface text-bh-text',
                    )}
                  >
                    Publish now
                  </button>
                ) : null}
              </div>
              {requestedStatus === 'published' ? (
                <p className="text-xs text-bh-text-muted">
                  Published shifts become claimable for matching verified workers.
                </p>
              ) : (
                <p className="text-xs text-bh-text-muted">
                  Drafts stay private to your organization until published.
                </p>
              )}
            </div>
          ) : null}

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bh-border bg-bh-surface/95 px-4 py-3 shadow-lg backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(step === 'confirm' ? 'review' : 'build')}
              disabled={pending}
            >
              Back
            </Button>
            {step === 'review' ? (
              <Button
                type="button"
                variant="honey"
                onClick={() => {
                  if (exactDupes.length && !allowExactDuplicates) {
                    toast.error('Confirm exact duplicates or remove them first.');
                    return;
                  }
                  setStep('confirm');
                }}
              >
                Continue to confirm
              </Button>
            ) : (
              <Button
                type="button"
                variant="honey"
                disabled={pending || (exactDupes.length > 0 && !allowExactDuplicates)}
                onClick={submitBatch}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : requestedStatus === 'published' ? (
                  `Publish ${preview.length} shifts`
                ) : (
                  `Create ${preview.length} drafts`
                )}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type BuiltRow = {
  locationId: string;
  wardId: string | null;
  requiredRole: WorkerRole;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  rateMinor: number;
  acceptanceDeadline: string | null;
  title: string | null;
  requiredPositions: number;
};

function buildFromSharedTemplate(params: {
  dates: string[];
  locationId: string;
  wardId: string | null;
  requiredRole: WorkerRole;
  startHm: string;
  endHm: string;
  breakMinutes: number;
  rateMinor: number;
  title: string | null;
  requiredPositions: number;
  locationTz: string;
  deadlineHours: number;
}): { error: string | null; rows: BuiltRow[]; preview: BulkPreviewShift[] } {
  const rows: BuiltRow[] = [];
  const preview: BulkPreviewShift[] = [];

  for (let i = 0; i < params.dates.length; i++) {
    const dateYmd = params.dates[i]!;
    const window = resolveShiftLocalWindow({
      dateYmd,
      startHm: params.startHm,
      endHm: params.endHm,
    });
    if (!window.ok) {
      return { error: window.error, rows: [], preview: [] };
    }
    let startsAt: string;
    let endsAt: string;
    try {
      startsAt = localInputToIsoWithTimezone(window.startsLocal, params.locationTz);
      endsAt = localInputToIsoWithTimezone(window.endsLocal, params.locationTz);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Invalid local time',
        rows: [],
        preview: [],
      };
    }

    let acceptanceDeadline: string | null = null;
    if (Number.isFinite(params.deadlineHours) && params.deadlineHours > 0) {
      const dl = deadlineHoursBeforeStart(startsAt, params.deadlineHours);
      if (!dl.ok) return { error: dl.error, rows: [], preview: [] };
      acceptanceDeadline = dl.deadlineIso;
    }

    rows.push({
      locationId: params.locationId,
      wardId: params.wardId,
      requiredRole: params.requiredRole,
      startsAt,
      endsAt,
      breakMinutes: params.breakMinutes,
      rateMinor: params.rateMinor,
      acceptanceDeadline,
      title: params.title,
      requiredPositions: params.requiredPositions,
    });
    preview.push({
      rowIndex: i,
      dateYmd,
      startsAtIso: startsAt,
      endsAtIso: endsAt,
      requiredRole: params.requiredRole,
      locationId: params.locationId,
      wardId: params.wardId,
      rateMinor: params.rateMinor,
      currency: 'EUR',
      breakMinutes: params.breakMinutes,
      title: params.title,
      requiredPositions: params.requiredPositions,
    });
  }

  return { error: null, rows, preview };
}

function buildFromCustomRows(
  customRows: BulkCustomRow[],
  locationTzById: Map<string, string>,
  fallbackTz: string,
  deadlineHours: number,
): { error: string | null; rows: BuiltRow[]; preview: BulkPreviewShift[] } {
  const rows: BuiltRow[] = [];
  const preview: BulkPreviewShift[] = [];

  for (let i = 0; i < customRows.length; i++) {
    const row = customRows[i]!;
    if (!row.locationId || !row.dateYmd) {
      return { error: `Row ${i + 1}: location and date are required.`, rows: [], preview: [] };
    }
    if (
      !Number.isInteger(row.positions) ||
      row.positions < 1 ||
      row.positions > 100
    ) {
      return {
        error: `Row ${i + 1}: Positions must be a whole number from 1 to 100.`,
        rows: [],
        preview: [],
      };
    }
    const window = resolveShiftLocalWindow({
      dateYmd: row.dateYmd,
      startHm: row.startHm,
      endHm: row.endHm,
    });
    if (!window.ok) {
      return { error: `Row ${i + 1}: ${window.error}`, rows: [], preview: [] };
    }
    const rowTz = locationTzById.get(row.locationId) ?? fallbackTz;
    let startsAt: string;
    let endsAt: string;
    try {
      startsAt = localInputToIsoWithTimezone(window.startsLocal, rowTz);
      endsAt = localInputToIsoWithTimezone(window.endsLocal, rowTz);
    } catch (e) {
      return {
        error: `Row ${i + 1}: ${e instanceof Error ? e.message : 'Invalid time'}`,
        rows: [],
        preview: [],
      };
    }

    let acceptanceDeadline: string | null = null;
    if (Number.isFinite(deadlineHours) && deadlineHours > 0) {
      const dl = deadlineHoursBeforeStart(startsAt, deadlineHours);
      if (!dl.ok) return { error: dl.error, rows: [], preview: [] };
      acceptanceDeadline = dl.deadlineIso;
    }

    const rateMinor = eurosToMinor(row.rateEuros);
    rows.push({
      locationId: row.locationId,
      wardId: row.wardId || null,
      requiredRole: row.requiredRole,
      startsAt,
      endsAt,
      breakMinutes: row.breakMinutes,
      rateMinor,
      acceptanceDeadline,
      title: null,
      requiredPositions: row.positions,
    });
    preview.push({
      rowIndex: i,
      dateYmd: row.dateYmd,
      startsAtIso: startsAt,
      endsAtIso: endsAt,
      requiredRole: row.requiredRole,
      locationId: row.locationId,
      wardId: row.wardId || null,
      rateMinor,
      currency: 'EUR',
      breakMinutes: row.breakMinutes,
      title: null,
      requiredPositions: row.positions,
    });
  }

  return { error: null, rows, preview };
}

function StepRail({ step }: { step: Step }) {
  const items: Array<{ id: Step; label: string; hint: string }> = [
    { id: 'build', label: 'Build', hint: 'Compose shifts' },
    { id: 'review', label: 'Review', hint: 'Check the batch' },
    { id: 'confirm', label: 'Confirm', hint: 'Create or publish' },
  ];
  const order = { build: 0, review: 1, confirm: 2, success: 3 };
  const currentIndex = order[step] ?? 0;

  return (
    <nav aria-label="Batch creation steps">
      <ol className="grid grid-cols-1 gap-2 rounded-2xl border border-bh-border bg-bh-surface p-2 shadow-[0_1px_2px_rgba(7,29,48,0.04)] sm:grid-cols-3 sm:gap-0 sm:p-1.5">
        {items.map((item, idx) => {
          const done = currentIndex > idx;
          const current = step === item.id || (step === 'success' && idx === 2);
          const upcoming = currentIndex < idx;

          return (
            <li
              key={item.id}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 motion-reduce:transition-none',
                current &&
                  'bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(7,29,48,0.22)]',
                done && !current && 'bg-bh-teal-soft/50 text-bh-text',
                upcoming && 'text-bh-text-muted',
              )}
            >
              {idx < items.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute right-0 top-1/2 hidden h-px w-3 -translate-y-1/2 translate-x-full sm:block',
                    done || current ? 'bg-bh-teal' : 'bg-bh-border',
                  )}
                />
              ) : null}

              <span
                aria-hidden
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold tracking-tight',
                  current &&
                    'bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
                  done &&
                    !current &&
                    'bg-bh-teal text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
                  upcoming && 'border border-bh-border bg-bh-subtle text-bh-text-muted',
                )}
              >
                {done && !current ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  idx + 1
                )}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-[11px] font-semibold uppercase tracking-[0.14em]',
                    current ? 'text-white/70' : done ? 'text-bh-teal-strong' : 'text-bh-text-muted',
                  )}
                >
                  Step {idx + 1}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-sm font-semibold tracking-tight',
                    current ? 'text-white' : 'text-bh-text',
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-xs',
                    current ? 'text-white/65' : 'text-bh-text-muted',
                  )}
                >
                  {item.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ModeCards({
  mode,
  onChange,
}: {
  mode: BulkCreationMode;
  onChange: (m: BulkCreationMode) => void;
}) {
  const modes: Array<{
    id: BulkCreationMode;
    label: string;
    hint: string;
    icon: LucideIcon;
  }> = [
    {
      id: 'repeat',
      label: 'Repeat Schedule',
      hint: 'Create a repeating pattern across selected weekdays.',
      icon: CalendarRange,
    },
    {
      id: 'individual',
      label: 'Individual Dates',
      hint: 'Choose specific dates using one shared shift setup.',
      icon: CalendarDays,
    },
    {
      id: 'custom',
      label: 'Custom Rows',
      hint: 'Create and edit every shift independently.',
      icon: Rows3,
    },
  ];

  return (
    <div
      className="grid gap-3 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Creation mode"
    >
      {modes.map((item) => {
        const selected = mode === item.id;
        const Icon = item.icon;
        const isCustom = item.id === 'custom';
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative rounded-2xl border px-4 py-4 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 motion-reduce:transition-none',
              'hover:-translate-y-0.5 active:translate-y-0 motion-reduce:hover:translate-y-0',
              selected && isCustom
                ? 'border-bh-honey bg-bh-honey-soft shadow-[0_0_0_1px_rgba(224,170,24,0.35),0_10px_28px_rgba(201,146,15,0.18)]'
                : selected
                  ? 'border-bh-sidebar bg-bh-subtle shadow-[0_8px_22px_rgba(7,29,48,0.08)]'
                  : 'border-bh-border bg-bh-surface hover:border-bh-border-strong hover:bg-bh-subtle/50',
            )}
          >
            <span className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-xl',
                  selected && isCustom
                    ? 'bg-bh-honey text-[#071d30]'
                    : selected
                      ? 'bg-bh-sidebar text-white'
                      : 'bg-bh-teal-soft text-bh-teal-strong',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {selected ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-bh-border bg-bh-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bh-text">
                  <CheckCircle2 className="h-3 w-3 text-bh-success" aria-hidden />
                  Selected
                </span>
              ) : null}
            </span>
            <span className="mt-3 block text-sm font-semibold tracking-tight text-bh-text">
              {item.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-bh-text-muted">
              {item.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bh-border bg-bh-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-bh-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-bh-text">{value}</p>
    </div>
  );
}

function SharedTemplateFields({
  slug,
  locations,
  wards,
  locationId,
  setLocationId,
  wardId,
  setWardId,
  onWardsCreated,
  requiredRole,
  setRequiredRole,
  startHm,
  setStartHm,
  endHm,
  setEndHm,
  breakMinutes,
  setBreakMinutes,
  rateEuros,
  setRateEuros,
  title,
  setTitle,
  positions,
  setPositions,
  deadlineHours,
  setDeadlineHours,
}: {
  slug: string;
  locations: LocationOption[];
  wards: WardOption[];
  locationId: string;
  setLocationId: (v: string) => void;
  wardId: string;
  setWardId: (v: string) => void;
  onWardsCreated: (
    created: Array<{ id: string; name: string; locationId: string }>,
    autoSelectWardId: string | null,
  ) => void;
  requiredRole: WorkerRole;
  setRequiredRole: (v: WorkerRole) => void;
  startHm: string;
  setStartHm: (v: string) => void;
  endHm: string;
  setEndHm: (v: string) => void;
  breakMinutes: string;
  setBreakMinutes: (v: string) => void;
  rateEuros: string;
  setRateEuros: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  positions: string;
  setPositions: (v: string) => void;
  deadlineHours: string;
  setDeadlineHours: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 rounded-2xl border border-bh-border bg-bh-surface p-4 sm:grid-cols-2 sm:p-5">
      <div className="space-y-2">
        <Label htmlFor="bulk-location">Location</Label>
        <Select
          id="bulk-location"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="bulk-ward">Ward / Unit</Label>
          <WardLibraryDialog
            slug={slug}
            locations={locations}
            wards={wards}
            defaultLocationId={locationId}
            onCreated={onWardsCreated}
          />
        </div>
        <WardUnitSelector
          id="bulk-ward"
          locationId={locationId}
          wardId={wardId}
          wards={wards}
          onWardChange={setWardId}
          aria-label="Ward / unit"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-role">Required role</Label>
        <Select
          id="bulk-role"
          value={requiredRole}
          onChange={(e) => setRequiredRole(e.target.value as WorkerRole)}
        >
          {WORKER_ROLES.map((r) => (
            <option key={r} value={r}>
              {WORKER_ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-title">Title (optional)</Label>
        <Input
          id="bulk-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-positions">Positions</Label>
        <Input
          id="bulk-positions"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          title="Number of professionals needed for this shift"
          aria-label="Number of professionals needed for this shift"
          value={positions}
          onChange={(e) => setPositions(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-start">Start time</Label>
        <Input
          id="bulk-start"
          type="time"
          value={startHm}
          onChange={(e) => setStartHm(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-end">End time</Label>
        <Input
          id="bulk-end"
          type="time"
          value={endHm}
          onChange={(e) => setEndHm(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-break">Break (minutes)</Label>
        <Input
          id="bulk-break"
          type="number"
          min={0}
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-rate">Hourly rate (EUR)</Label>
        <Input
          id="bulk-rate"
          inputMode="decimal"
          value={rateEuros}
          onChange={(e) => setRateEuros(e.target.value)}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="bulk-deadline">Acceptance deadline (hours before start)</Label>
        <Input
          id="bulk-deadline"
          type="number"
          min={0}
          value={deadlineHours}
          onChange={(e) => setDeadlineHours(e.target.value)}
        />
      </div>
    </div>
  );
}
