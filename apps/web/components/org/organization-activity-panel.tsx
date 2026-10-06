'use client';

import { useMemo, useState } from 'react';

import { OrganizationActivityChart } from '@/components/org/charts';
import { cn } from '@/lib/utils';
import {
  isOrgActivityRangeDays,
  type OrgActivityRangeDays,
  type OrgActivitySeries,
} from '@bridge-hive/domain';

const RANGES: OrgActivityRangeDays[] = [7, 30, 90];

type MetricFocus = 'all' | 'created' | 'acceptances' | 'workers' | 'approved';

const FOCUS_OPTIONS: Array<{ id: MetricFocus; label: string }> = [
  { id: 'all', label: 'All metrics' },
  { id: 'created', label: 'Created' },
  { id: 'acceptances', label: 'Acceptances' },
  { id: 'workers', label: 'Workers' },
  { id: 'approved', label: 'Approved' },
];

export function OrganizationActivityPanel({
  seriesByRange,
  loadError,
  createShiftHref,
}: {
  seriesByRange: Record<OrgActivityRangeDays, OrgActivitySeries>;
  loadError: boolean;
  createShiftHref: string;
}) {
  const [rangeDays, setRangeDays] = useState<OrgActivityRangeDays>(30);
  const [focus, setFocus] = useState<MetricFocus>('all');
  const [tableOpen, setTableOpen] = useState(false);

  const series = seriesByRange[rangeDays];
  const hasActivity = useMemo(
    () =>
      series.totals.shiftsCreated +
        series.totals.acceptances +
        series.totals.timesheetsApproved >
      0,
    [series],
  );

  const statusBits = Object.entries(series.totals.statusBreakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([status, n]) => `${n} ${status.replace(/_/g, ' ')}`);

  if (loadError) {
    return (
      <section className="overflow-hidden rounded-2xl border border-bh-danger/30 bg-bh-surface shadow-[0_12px_32px_rgba(7,29,48,0.06)]">
        <div className="border-b border-bh-danger/20 bg-bh-danger-soft/40 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-danger">
            Organization activity
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-bh-text">
            Couldn’t load activity
          </h2>
        </div>
        <div className="px-5 py-6 sm:px-6">
          <p className="text-sm text-bh-text-secondary">
            Historical activity could not be loaded. This is not a zero-activity
            result — refresh the page to retry.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_12px_32px_rgba(7,29,48,0.06)]">
      <div className="relative border-b border-bh-border/80 bg-gradient-to-r from-bh-sidebar/[0.04] via-bh-teal-soft/30 to-bh-honey-soft/35 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-teal-strong">
              Historical · organization timezone
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-bh-sidebar sm:text-2xl">
              Organization activity
            </h2>
            <p className="mt-2 text-sm leading-6 text-bh-text-secondary">
              Shifts created (all statuses, including drafts), shift acceptances
              by claim time (includes later withdrawn or cancelled), distinct
              participating workers, and timesheets approved. Not page views or
              traffic.
            </p>
            <p className="mt-1.5 text-xs font-medium text-bh-text-muted">
              {series.periodLabel} · {series.timeZone}
            </p>
          </div>

          <div
            className="inline-flex shrink-0 rounded-xl border border-bh-border bg-bh-surface/90 p-1 shadow-sm"
            role="group"
            aria-label="Activity period"
          >
            {RANGES.map((days) => {
              const selected = rangeDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (isOrgActivityRangeDays(days)) setRangeDays(days);
                  }}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'bg-bh-sidebar text-white shadow-sm'
                      : 'text-bh-text-secondary hover:bg-bh-subtle hover:text-bh-text',
                  )}
                >
                  {days}d
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TotalChip
            label="Shifts created"
            unit="shifts"
            value={series.totals.shiftsCreated}
            prior={series.priorTotals.shiftsCreated}
            hint={
              statusBits.length > 0
                ? `Current status mix: ${statusBits.join(', ')}`
                : 'Includes drafts; status is current, not publish history'
            }
            accent="teal"
          />
          <TotalChip
            label="Shift acceptances"
            unit="acceptances"
            value={series.totals.acceptances}
            prior={series.priorTotals.acceptances}
            hint="By accepted_at · includes withdrawn/cancelled later"
            accent="blue"
          />
          <TotalChip
            label="Participating workers"
            unit="workers"
            value={series.totals.participatingWorkers}
            prior={series.priorTotals.participatingWorkers}
            hint="Distinct workers who accepted in this period"
            accent="honey"
          />
          <TotalChip
            label="Timesheets approved"
            unit="approvals"
            value={series.totals.timesheetsApproved}
            prior={series.priorTotals.timesheetsApproved}
            hint="Approved via reviewed_at · not the same as completed shifts"
            accent="navy"
          />
        </div>

        <p className="text-xs text-bh-text-muted">
          Prior equivalent window: {series.priorPeriodLabel}. Comparisons show
          raw count change only.
        </p>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chart metrics">
          {FOCUS_OPTIONS.map((opt) => {
            const selected = focus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFocus(opt.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  selected
                    ? 'border-bh-sidebar/20 bg-bh-sidebar text-white'
                    : 'border-bh-border bg-bh-subtle/50 text-bh-text-secondary hover:border-bh-border-strong hover:text-bh-text',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <OrganizationActivityChart
          series={series}
          focus={focus}
          emptyHref={createShiftHref}
          hasActivity={hasActivity}
        />

        <div>
          <button
            type="button"
            className="text-sm font-semibold text-bh-teal-strong hover:underline"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen((v) => !v)}
          >
            {tableOpen ? 'Hide data table' : 'Show data table'}
          </button>
          {tableOpen ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-bh-border">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">
                  Organization activity by {series.granularity} for{' '}
                  {series.periodLabel}
                </caption>
                <thead className="border-b border-bh-border bg-bh-subtle/60 text-xs uppercase tracking-wide text-bh-text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Period</th>
                    <th className="px-3 py-2.5 font-semibold">Created</th>
                    <th className="px-3 py-2.5 font-semibold">Acceptances</th>
                    <th className="px-3 py-2.5 font-semibold">Workers</th>
                    <th className="px-3 py-2.5 font-semibold">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {series.buckets.map((b) => (
                    <tr key={b.key} className="border-b border-bh-border/70 last:border-0">
                      <td className="px-3 py-2 font-medium text-bh-text">{b.label}</td>
                      <td className="bh-tabular px-3 py-2 text-bh-text-secondary">
                        {b.shiftsCreated}
                      </td>
                      <td className="bh-tabular px-3 py-2 text-bh-text-secondary">
                        {b.acceptances}
                      </td>
                      <td className="bh-tabular px-3 py-2 text-bh-text-secondary">
                        {b.participatingWorkers}
                      </td>
                      <td className="bh-tabular px-3 py-2 text-bh-text-secondary">
                        {b.timesheetsApproved}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="sr-only">
            <table>
              <caption>
                Organization activity by {series.granularity} for {series.periodLabel}
              </caption>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Created</th>
                  <th>Acceptances</th>
                  <th>Workers</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {series.buckets.map((b) => (
                  <tr key={b.key}>
                    <td>{b.label}</td>
                    <td>{b.shiftsCreated}</td>
                    <td>{b.acceptances}</td>
                    <td>{b.participatingWorkers}</td>
                    <td>{b.timesheetsApproved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TotalChip({
  label,
  unit,
  value,
  prior,
  hint,
  accent,
}: {
  label: string;
  unit: string;
  value: number;
  prior: number;
  hint: string;
  accent: 'teal' | 'blue' | 'honey' | 'navy';
}) {
  const delta = value - prior;
  const accents = {
    teal: 'border-bh-teal/25 bg-bh-teal-soft/40',
    blue: 'border-bh-accent-blue/25 bg-bh-accent-blue-soft/50',
    honey: 'border-bh-honey/30 bg-bh-honey-soft/50',
    navy: 'border-bh-sidebar/15 bg-bh-subtle/80',
  } as const;

  return (
    <div className={cn('rounded-2xl border px-3.5 py-3', accents[accent])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <p className="bh-tabular mt-1 text-2xl font-bold tracking-tight text-bh-sidebar">
        {value}{' '}
        <span className="text-sm font-semibold text-bh-text-secondary">{unit}</span>
      </p>
      <p className="mt-1 text-xs font-medium text-bh-text-secondary">
        {delta === 0
          ? 'Same as prior period'
          : `${delta > 0 ? '+' : ''}${delta} vs prior period`}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-bh-text-muted">{hint}</p>
    </div>
  );
}
