'use client';

import {
  Activity,
  CalendarPlus,
  CalendarRange,
  Globe2,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { OrganizationActivityChart } from '@/components/org/charts';
import { CountUp } from '@/components/org/count-up';
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
      <section className="overflow-hidden rounded-2xl border border-bh-danger/25 bg-white p-5 shadow-[0_16px_36px_rgba(7,29,48,0.08)] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-danger">
          Organization activity
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-bh-text">
          Couldn’t load activity
        </h2>
        <p className="mt-3 text-sm text-bh-text-secondary">
          Historical activity could not be loaded. This is not a zero-activity
          result — refresh the page to retry.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#16384f]/18 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)]">
      <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-5 py-5 sm:px-6 sm:py-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-bh-teal/30 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-16 right-8 h-40 w-40 rounded-full bg-[#e4b334]/22 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 max-w-2xl items-start gap-3">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_18px_rgba(228,179,52,0.35)]">
            <Activity className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
              Historical pulse
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e4b334]/15 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[#f3d27a] ring-1 ring-[#e4b334]/35">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e4b334] motion-reduce:animate-none"
                />
                Live
              </span>
            </p>
            <h2 className="mt-1 text-[18px] font-bold leading-tight tracking-tight text-white sm:text-[20px]">
              Organization activity
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-white/75">
              Shifts created, acceptances, participating workers, and timesheet
              approvals in your organization timezone — not page views.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                <CalendarRange className="h-3.5 w-3.5 text-[#f3d27a]" aria-hidden />
                {series.periodLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                <Globe2 className="h-3.5 w-3.5 text-[#f3d27a]" aria-hidden />
                {series.timeZone}
              </span>
              <span className="bh-tabular inline-flex items-center rounded-full bg-[#e4b334] px-2.5 py-1 text-[11px] font-bold text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.32)]">
                {series.totals.shiftsCreated} created
              </span>
              <span className="bh-tabular inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                {series.totals.acceptances} accepted
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70 ring-1 ring-white/10">
                Prior {series.priorPeriodLabel}
              </span>
            </div>
          </div>
        </div>

        <div
          className="relative grid h-12 shrink-0 grid-cols-3 self-start rounded-xl bg-white/10 p-1 ring-1 ring-white/15"
          role="group"
          aria-label="Activity period"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-[#e4b334] shadow-[0_8px_16px_rgba(228,179,52,0.38)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${RANGES.indexOf(rangeDays) * 100}%)` }}
          />
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
                  'relative z-[1] min-w-[3.5rem] rounded-lg px-3.5 py-2 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b334] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071d30]',
                  selected
                    ? 'text-[#071d30]'
                    : 'text-white/70 hover:text-white',
                )}
              >
                {days} d
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <div className="space-y-5 bg-[linear-gradient(180deg,#d7eef2_0%,#eef6fa_48%,#f4f9fb_100%)] px-5 py-5 sm:px-6 sm:py-6">
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

        <p className="text-xs font-medium text-[#071d30]/65">
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
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 motion-reduce:transition-none',
                  selected
                    ? 'bg-[#e4b334] text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.32)]'
                    : 'bg-white/80 text-[#071d30]/70 ring-1 ring-[#16384f]/10 hover:bg-white hover:text-[#071d30]',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_28px_rgba(7,29,48,0.06)] sm:p-4">
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
            className="inline-flex items-center rounded-xl border border-[#16384f]/15 bg-[#071d30] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(7,29,48,0.18)] transition-colors hover:bg-[#0c2844]"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen((v) => !v)}
          >
            {tableOpen ? 'Hide data table' : 'Show data table'}
          </button>
          {tableOpen ? (
            <div className="mt-3 overflow-x-auto rounded-xl bg-white ring-1 ring-bh-border/60">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">
                  Organization activity by {series.granularity} for{' '}
                  {series.periodLabel}
                </caption>
                <thead className="border-b border-bh-border bg-bh-subtle/70 text-[11px] uppercase tracking-[0.12em] text-bh-text-muted">
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
      bar: 'bg-bh-teal',
      icon: 'bg-[linear-gradient(140deg,#0b6f7c_0%,#2cc7d6_100%)] text-white shadow-[0_8px_16px_rgba(19,163,180,0.28)]',
      stroke: '#087f8c',
      fill: 'rgba(22,166,182,0.16)',
      progress: 'bg-bh-teal',
      delta: 'bg-bh-teal-soft text-bh-teal-strong',
    },
    blue: {
      bar: 'bg-[#16384f]',
      icon: 'bg-[linear-gradient(140deg,#071d30_0%,#1d4d68_100%)] text-[#f3d27a] shadow-[0_8px_16px_rgba(7,29,48,0.28)]',
      stroke: '#16384f',
      fill: 'rgba(7,29,48,0.1)',
      progress: 'bg-[#16384f]',
      delta: 'bg-[#071d30]/[0.06] text-[#16384f]',
    },
    honey: {
      bar: 'bg-[#e4b334]',
      icon: 'bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.32)]',
      stroke: '#c9920f',
      fill: 'rgba(228,179,52,0.18)',
      progress: 'bg-[#e4b334]',
      delta: 'bg-[#fff4d6] text-[#c9920f]',
    },
    navy: {
      bar: 'bg-[#071d30]',
      icon: 'bg-[#071d30] text-white shadow-[0_8px_16px_rgba(7,29,48,0.28)]',
      stroke: '#071d30',
      fill: 'rgba(7,29,48,0.12)',
      progress: 'bg-[#071d30]',
      delta: 'bg-[#071d30]/[0.06] text-[#071d30]',
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
        'group relative overflow-hidden rounded-2xl border border-white/70 bg-white/90 px-3.5 py-3.5 pl-4 text-left shadow-[0_10px_24px_rgba(7,29,48,0.06)] transition-[transform,background-color,box-shadow] duration-200',
        'hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_32px_rgba(7,29,48,0.12)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b334] focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected &&
          'bg-white ring-2 ring-inset ring-[#e4b334]/70 shadow-[0_16px_32px_rgba(228,179,52,0.18)]',
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-3 left-0 w-[3px] rounded-full', theme.bar)}
      />

      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            'grid h-9 w-9 place-items-center rounded-xl',
            theme.icon,
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
            theme.delta,
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

      <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071d30]/55">
        {label}
      </p>
      <p className="relative bh-tabular mt-1 text-2xl font-bold tracking-tight text-[#071d30]">
        <CountUp value={value} />{' '}
        <span className="text-sm font-semibold text-bh-text-secondary">{unit}</span>
      </p>

      <div className="relative mt-2">
        <MiniSparkline
          values={sparkline}
          stroke={theme.stroke}
          fill={theme.fill}
        />
      </div>

      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-bh-subtle">
        <div
          className={cn('bh-cal-bar h-full rounded-full', theme.progress)}
          style={{ width: `${flat ? 12 : barWidth}%` }}
        />
      </div>

      <p className="relative mt-2 text-xs font-semibold text-bh-text">
        {flat
          ? 'Same as prior period'
          : `${delta > 0 ? '+' : ''}${delta} vs prior period`}
      </p>
      <p className="relative mt-1 text-[11px] leading-4 text-bh-text-secondary">
        {hint}
      </p>
    </button>
  );
}
