'use client';

import {
  Activity,
  CalendarPlus,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

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

  const sparkCreated = series.buckets.map((b) => b.shiftsCreated);
  const sparkAcceptances = series.buckets.map((b) => b.acceptances);
  const sparkWorkers = series.buckets.map((b) => b.participatingWorkers);
  const sparkApproved = series.buckets.map((b) => b.timesheetsApproved);

  if (loadError) {
    return (
      <section className="overflow-hidden rounded-2xl border border-bh-danger/30 bg-bh-surface shadow-[0_12px_36px_rgba(7,29,48,0.08)]">
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
    <section className="overflow-hidden rounded-2xl border border-bh-border/80 bg-bh-surface shadow-[0_12px_36px_rgba(7,29,48,0.08)] ring-1 ring-[rgba(22,56,79,0.04)]">
      <div className="relative border-b border-bh-border/70 bg-[linear-gradient(180deg,#f7fafc_0%,#ffffff_100%)] px-5 py-5 sm:px-6 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-bh-teal/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-bh-honey/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-bh-teal-strong">
              <span
                aria-hidden
                className="h-px w-7 rounded-full bg-[linear-gradient(90deg,#e4b334,#16a6b6)]"
              />
              Historical pulse
            </p>
            <div className="mt-2 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] ring-1 ring-white/10">
                <Activity className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-bh-text sm:text-2xl">
                  Organization activity
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-bh-text-secondary">
                  Shifts created, acceptances, participating workers, and
                  timesheet approvals in your organization timezone — not page
                  views.
                </p>
                <p className="mt-1.5 text-xs font-semibold text-bh-text-muted">
                  {series.periodLabel} · {series.timeZone}
                </p>
              </div>
            </div>
          </div>

          <div
            className="inline-flex shrink-0 rounded-2xl border border-bh-border/80 bg-white/90 p-1 shadow-sm backdrop-blur-sm"
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
                    'rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200',
                    selected
                      ? 'bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.2)]'
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
                ? `Status mix: ${statusBits.join(', ')}`
                : 'Includes drafts; status is current'
            }
            accent="teal"
            icon={<CalendarPlus className="h-4 w-4" aria-hidden />}
            sparkline={sparkCreated}
            selected={focus === 'created'}
            onSelect={() =>
              setFocus((prev) => (prev === 'created' ? 'all' : 'created'))
            }
          />
          <TotalChip
            label="Shift acceptances"
            unit="acceptances"
            value={series.totals.acceptances}
            prior={series.priorTotals.acceptances}
            hint="By accepted_at · includes later withdrawn"
            accent="blue"
            icon={<UserCheck className="h-4 w-4" aria-hidden />}
            sparkline={sparkAcceptances}
            selected={focus === 'acceptances'}
            onSelect={() =>
              setFocus((prev) =>
                prev === 'acceptances' ? 'all' : 'acceptances',
              )
            }
          />
          <TotalChip
            label="Participating workers"
            unit="workers"
            value={series.totals.participatingWorkers}
            prior={series.priorTotals.participatingWorkers}
            hint="Distinct workers who accepted"
            accent="honey"
            icon={<Users className="h-4 w-4" aria-hidden />}
            sparkline={sparkWorkers}
            selected={focus === 'workers'}
            onSelect={() =>
              setFocus((prev) => (prev === 'workers' ? 'all' : 'workers'))
            }
          />
          <TotalChip
            label="Timesheets approved"
            unit="approvals"
            value={series.totals.timesheetsApproved}
            prior={series.priorTotals.timesheetsApproved}
            hint="Approved via reviewed_at"
            accent="navy"
            icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
            sparkline={sparkApproved}
            selected={focus === 'approved'}
            onSelect={() =>
              setFocus((prev) => (prev === 'approved' ? 'all' : 'approved'))
            }
          />
        </div>

        <p className="text-xs text-bh-text-muted">
          Tap a card to focus the chart. Prior window: {series.priorPeriodLabel}.
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
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                  selected
                    ? 'border-transparent bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] text-white shadow-[0_6px_14px_rgba(7,29,48,0.18)]'
                    : 'border-bh-border bg-white text-bh-text-secondary shadow-sm hover:border-bh-border-strong hover:text-bh-text',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-bh-border/80 bg-[linear-gradient(180deg,#fbfcfd_0%,#ffffff_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-4">
          <OrganizationActivityChart
            series={series}
            focus={focus}
            emptyHref={createShiftHref}
            hasActivity={hasActivity}
          />
        </div>

        <div>
          <button
            type="button"
            className="inline-flex items-center rounded-xl border border-bh-border bg-white px-3.5 py-2 text-sm font-semibold text-bh-teal-strong shadow-sm transition-colors hover:bg-bh-subtle"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen((v) => !v)}
          >
            {tableOpen ? 'Hide data table' : 'Show data table'}
          </button>
          {tableOpen ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-bh-border shadow-sm">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">
                  Organization activity by {series.granularity} for{' '}
                  {series.periodLabel}
                </caption>
                <thead className="border-b border-[#16384f]/15 bg-[linear-gradient(180deg,#16384f_0%,#0d2a3d_100%)] text-[11px] uppercase tracking-[0.12em] text-white/70">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Period</th>
                    <th className="px-3 py-2.5 font-semibold">Created</th>
                    <th className="px-3 py-2.5 font-semibold">Acceptances</th>
                    <th className="px-3 py-2.5 font-semibold">Workers</th>
                    <th className="px-3 py-2.5 font-semibold">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {series.buckets.map((b, index) => (
                    <tr
                      key={b.key}
                      className={cn(
                        'border-b border-bh-border/70 last:border-0',
                        index % 2 === 1 ? 'bg-bh-subtle/35' : 'bg-white',
                      )}
                    >
                      <td className="px-3 py-2.5 font-semibold text-bh-text">
                        {b.label}
                      </td>
                      <td className="bh-tabular px-3 py-2.5 text-bh-text-secondary">
                        {b.shiftsCreated}
                      </td>
                      <td className="bh-tabular px-3 py-2.5 text-bh-text-secondary">
                        {b.acceptances}
                      </td>
                      <td className="bh-tabular px-3 py-2.5 text-bh-text-secondary">
                        {b.participatingWorkers}
                      </td>
                      <td className="bh-tabular px-3 py-2.5 text-bh-text-secondary">
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
                  Organization activity by {series.granularity} for{' '}
                  {series.periodLabel}
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

function MiniSparkline({
  values,
  stroke,
  fill,
}: {
  values: number[];
  stroke: string;
  fill: string;
}) {
  const width = 120;
  const height = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const line = points.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <polyline points={area} fill={fill} opacity={0.35} stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TotalChip({
  label,
  unit,
  value,
  prior,
  hint,
  accent,
  icon,
  sparkline,
  selected,
  onSelect,
}: {
  label: string;
  unit: string;
  value: number;
  prior: number;
  hint: string;
  accent: 'teal' | 'blue' | 'honey' | 'navy';
  icon: ReactNode;
  sparkline: number[];
  selected: boolean;
  onSelect: () => void;
}) {
  const delta = value - prior;
  const pct =
    prior > 0 ? Math.round((delta / prior) * 100) : value > 0 ? 100 : 0;
  const up = delta > 0;
  const flat = delta === 0;

  const accents = {
    teal: {
      shell: 'border-bh-teal/30 bg-[linear-gradient(160deg,#e4f7f9_0%,#ffffff_72%)]',
      icon: 'bg-bh-teal-soft text-bh-teal-strong',
      stroke: '#087F8C',
      fill: '#16A6B6',
      bar: 'bg-bh-teal',
    },
    blue: {
      shell:
        'border-bh-accent-blue/30 bg-[linear-gradient(160deg,#eff6ff_0%,#ffffff_72%)]',
      icon: 'bg-bh-accent-blue-soft text-bh-accent-blue',
      stroke: '#2563EB',
      fill: '#3B82F6',
      bar: 'bg-bh-accent-blue',
    },
    honey: {
      shell:
        'border-bh-honey/35 bg-[linear-gradient(160deg,#fff8e8_0%,#ffffff_72%)]',
      icon: 'bg-bh-honey-soft text-bh-honey-strong',
      stroke: '#C49212',
      fill: '#E0AA18',
      bar: 'bg-bh-honey',
    },
    navy: {
      shell:
        'border-bh-sidebar/20 bg-[linear-gradient(160deg,#edf3f5_0%,#ffffff_72%)]',
      icon: 'bg-bh-sidebar text-white',
      stroke: '#0B2A43',
      fill: '#1B3F5C',
      bar: 'bg-bh-sidebar',
    },
  } as const;

  const theme = accents[accent];
  const barWidth = Math.min(100, Math.max(8, Math.abs(pct)));

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-2xl border px-3.5 py-3.5 text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(7,29,48,0.1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        theme.shell,
        selected && 'ring-2 ring-bh-sidebar/25 shadow-[0_14px_28px_rgba(7,29,48,0.12)]',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/50 blur-2xl transition-opacity group-hover:opacity-90"
      />

      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            'grid h-9 w-9 place-items-center rounded-xl shadow-sm ring-1 ring-black/5',
            theme.icon,
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
            flat
              ? 'bg-white/80 text-bh-text-muted'
              : up
                ? 'bg-bh-success-soft text-bh-success'
                : 'bg-bh-danger-soft text-bh-danger',
          )}
        >
          {flat ? null : up ? (
            <TrendingUp className="h-3 w-3" aria-hidden />
          ) : (
            <TrendingDown className="h-3 w-3" aria-hidden />
          )}
          {flat ? 'Flat' : `${up ? '+' : ''}${pct}%`}
        </span>
      </div>

      <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
        {label}
      </p>
      <p className="relative bh-tabular mt-1 text-2xl font-bold tracking-tight text-bh-text">
        {value}{' '}
        <span className="text-sm font-semibold text-bh-text-secondary">{unit}</span>
      </p>

      <div className="relative mt-2">
        <MiniSparkline
          values={sparkline}
          stroke={theme.stroke}
          fill={theme.fill}
        />
      </div>

      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            theme.bar,
            !up && !flat && 'bg-bh-danger',
          )}
          style={{ width: `${flat ? 12 : barWidth}%` }}
        />
      </div>

      <p className="relative mt-2 text-xs font-semibold text-bh-text-secondary">
        {flat
          ? 'Same as prior period'
          : `${delta > 0 ? '+' : ''}${delta} vs prior period`}
      </p>
      <p className="relative mt-1 text-[11px] leading-4 text-bh-text-muted">
        {hint}
      </p>
    </button>
  );
}
