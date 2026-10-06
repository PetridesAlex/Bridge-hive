import { Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type {
  OrgActivitySeries,
  RoleCoverage,
  WeekBucket,
} from '@bridge-hive/domain';

export function CoverageTrendChart({
  buckets,
  emptyHref,
}: {
  buckets: WeekBucket[];
  emptyHref: string;
}) {
  const totals = buckets.reduce(
    (acc, b) => {
      acc.published += b.published;
      acc.filled += b.filled;
      acc.cancelled += b.cancelled;
      return acc;
    },
    { published: 0, filled: 0, cancelled: 0 },
  );
  const max = Math.max(
    1,
    ...buckets.flatMap((b) => [b.published + b.filled, b.cancelled]),
  );
  const hasData = buckets.some((b) => b.published + b.filled + b.cancelled > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-bh-teal/25 bg-bh-teal-soft/30 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-bh-text">No shift activity yet</p>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Trends appear after you publish openings.
        </p>
        <Link
          href={emptyHref}
          className="mt-3 inline-flex text-sm font-semibold text-bh-teal-strong hover:underline"
        >
          Create shift →
        </Link>
      </div>
    );
  }

  const width = 360;
  const height = 148;
  const padX = 12;
  const padTop = 12;
  const padBottom = 8;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const step = innerW / Math.max(1, buckets.length - 1);

  const points = buckets.map((b, i) => {
    const x = padX + i * step;
    const y = padTop + innerH - ((b.published + b.filled) / max) * innerH;
    return { x, y, value: b.published + b.filled };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = [
    `${padX},${padTop + innerH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${padX + (buckets.length - 1) * step},${padTop + innerH}`,
  ].join(' ');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-bh-teal/20 bg-bh-teal-soft/50 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-teal-strong">
            Open
          </p>
          <p className="bh-tabular mt-0.5 text-lg font-bold text-bh-sidebar">
            {totals.published}
          </p>
        </div>
        <div className="rounded-xl border border-bh-success/20 bg-bh-success-soft/60 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-success">
            Filled
          </p>
          <p className="bh-tabular mt-0.5 text-lg font-bold text-bh-sidebar">
            {totals.filled}
          </p>
        </div>
        <div className="rounded-xl border border-bh-border bg-bh-subtle/70 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-text-muted">
            Cancelled
          </p>
          <p className="bh-tabular mt-0.5 text-lg font-bold text-bh-sidebar">
            {totals.cancelled}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-bh-border/70 bg-bh-surface/80 px-2 pt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 w-full"
          role="img"
          aria-label="Weekly published and filled shift counts for the next six weeks"
        >
          <defs>
            <linearGradient id="coverage-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A6B6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#16A6B6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={padX}
              x2={width - padX}
              y1={padTop + innerH * (1 - t)}
              y2={padTop + innerH * (1 - t)}
              stroke="#E1E7EA"
              strokeWidth="1"
            />
          ))}
          <polygon fill="url(#coverage-fill)" points={area} />
          <polyline
            fill="none"
            stroke="#087F8C"
            strokeWidth="2.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={line}
          />
          {points.map((p, i) => (
            <circle
              key={buckets[i]!.weekStartIso}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#fff"
              stroke="#16A6B6"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex justify-between px-1 pb-2 text-[10px] font-medium text-bh-text-muted">
          {buckets.map((b) => (
            <span key={b.weekStartIso} className="min-w-0 truncate text-center">
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="sr-only">
      <table>
        <caption>Shift coverage by week</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Published</th>
            <th>Filled</th>
            <th>Cancelled</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.weekStartIso}>
              <td>{b.label}</td>
              <td>{b.published}</td>
              <td>{b.filled}</td>
              <td>{b.cancelled}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function RoleCoverageBars({
  coverage,
  periodLabel,
}: {
  coverage: RoleCoverage[];
  periodLabel: string;
}) {
  const total = coverage[0]?.total ?? 0;
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-bh-honey/30 bg-bh-honey-soft/40 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-bh-text">No role demand yet</p>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Role mix appears once shifts are scheduled for {periodLabel.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-bh-honey/25 bg-bh-honey-soft/50 px-3 py-2.5">
        <p className="text-xs font-medium text-bh-text-secondary">{periodLabel}</p>
        <p className="bh-tabular text-sm font-bold text-bh-sidebar">
          {total} shift{total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-3">
        {coverage.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          const isRn = row.role === 'registered_nurse';
          const Icon = isRn ? Stethoscope : Users;
          return (
            <div
              key={row.role}
              className={cn(
                'rounded-2xl border px-3.5 py-3',
                isRn
                  ? 'border-bh-teal/25 bg-gradient-to-br from-bh-teal-soft/70 to-bh-surface'
                  : 'border-bh-honey/30 bg-gradient-to-br from-bh-honey-soft/80 to-bh-surface',
              )}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                    isRn ? 'bg-bh-teal' : 'bg-bh-sidebar',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-bh-text">{row.label}</p>
                  <p className="text-xs text-bh-text-secondary">
                    {row.count} opening{row.count === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="bh-tabular text-lg font-bold text-bh-sidebar">{pct}%</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-bh-surface/90 ring-1 ring-bh-border/60">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width]',
                    isRn ? 'bg-bh-teal' : 'bg-bh-honey',
                  )}
                  style={{ width: `${Math.max(pct, row.count > 0 ? 6 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="sr-only">
      <table>
        <caption>Coverage by role for {periodLabel}</caption>
        <thead>
          <tr>
            <th>Role</th>
            <th>Count</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {coverage.map((row) => (
            <tr key={row.role}>
              <td>{row.label}</td>
              <td>{row.count}</td>
              <td>{total > 0 ? Math.round((row.count / total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

type ActivityFocus = 'all' | 'created' | 'acceptances' | 'workers' | 'approved';

const ACTIVITY_SERIES = [
  {
    id: 'created' as const,
    label: 'Shifts created',
    color: '#087F8C',
    fill: '#16A6B6',
    value: (b: OrgActivitySeries['buckets'][number]) => b.shiftsCreated,
  },
  {
    id: 'acceptances' as const,
    label: 'Acceptances',
    color: '#2563EB',
    fill: '#3B82F6',
    value: (b: OrgActivitySeries['buckets'][number]) => b.acceptances,
  },
  {
    id: 'workers' as const,
    label: 'Participating workers',
    color: '#C49212',
    fill: '#E0AA18',
    value: (b: OrgActivitySeries['buckets'][number]) => b.participatingWorkers,
  },
  {
    id: 'approved' as const,
    label: 'Timesheets approved',
    color: '#0B2A43',
    fill: '#1B3F5C',
    value: (b: OrgActivitySeries['buckets'][number]) => b.timesheetsApproved,
  },
];

export function OrganizationActivityChart({
  series,
  focus,
  emptyHref,
  hasActivity,
}: {
  series: OrgActivitySeries;
  focus: ActivityFocus;
  emptyHref: string;
  hasActivity: boolean;
}) {
  if (!hasActivity) {
    return (
      <div className="rounded-2xl border border-dashed border-bh-teal/25 bg-bh-teal-soft/30 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-bh-text">No activity in this period</p>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Create and publish shifts to start building a historical activity record.
        </p>
        <Link
          href={emptyHref}
          className="mt-3 inline-flex text-sm font-semibold text-bh-teal-strong hover:underline"
        >
          Create shift →
        </Link>
      </div>
    );
  }

  const active =
    focus === 'all'
      ? ACTIVITY_SERIES
      : ACTIVITY_SERIES.filter((s) => s.id === focus);

  const max = Math.max(
    1,
    ...series.buckets.flatMap((b) => active.map((s) => s.value(b))),
  );

  const width = 720;
  const height = 220;
  const padX = 36;
  const padTop = 16;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const step =
    series.buckets.length <= 1
      ? 0
      : innerW / Math.max(1, series.buckets.length - 1);

  const labelEvery = Math.max(1, Math.ceil(series.buckets.length / 8));

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-bh-text-secondary">
        {active.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto rounded-2xl border border-bh-border/70 bg-bh-surface/80 px-2 pt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full min-w-[320px]"
          role="img"
          aria-label={`Organization activity counts by ${series.granularity} for ${series.periodLabel}`}
        >
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = padTop + innerH * (1 - t);
            return (
              <g key={t}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="#E1E7EA"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="10"
                >
                  {Math.round(max * t)}
                </text>
              </g>
            );
          })}

          {active.map((s) => {
            const points = series.buckets.map((b, i) => {
              const x =
                series.buckets.length <= 1
                  ? padX + innerW / 2
                  : padX + i * step;
              const y = padTop + innerH - (s.value(b) / max) * innerH;
              return { x, y, value: s.value(b) };
            });
            const line = points.map((p) => `${p.x},${p.y}`).join(' ');
            const area = [
              `${points[0]!.x},${padTop + innerH}`,
              ...points.map((p) => `${p.x},${p.y}`),
              `${points[points.length - 1]!.x},${padTop + innerH}`,
            ].join(' ');
            const gradId = `org-activity-${s.id}`;
            return (
              <g key={s.id}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.fill} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={s.fill} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {focus !== 'all' || active.length === 1 ? (
                  <polygon fill={`url(#${gradId})`} points={area} />
                ) : null}
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={line}
                />
                {points.map((p, i) => (
                  <circle
                    key={`${s.id}-${series.buckets[i]!.key}`}
                    cx={p.x}
                    cy={p.y}
                    r={focus === 'all' ? 2.5 : 3.5}
                    fill="#fff"
                    stroke={s.color}
                    strokeWidth="1.75"
                  >
                    <title>
                      {series.buckets[i]!.label}: {s.label} {p.value}
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}

          {series.buckets.map((b, i) => {
            if (i % labelEvery !== 0 && i !== series.buckets.length - 1) {
              return null;
            }
            const x =
              series.buckets.length <= 1 ? padX + innerW / 2 : padX + i * step;
            return (
              <text
                key={b.key}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {b.label}
              </text>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-bh-text-muted">
        Axis unit: counts · {series.granularity === 'week' ? 'Weekly' : 'Daily'}{' '}
        buckets in {series.timeZone}
      </p>
    </div>
  );
}

export function LocationWorkloadList({
  rows,
  slug,
  periodDays,
}: {
  rows: Array<{ locationId: string; name: string; count: number }>;
  slug: string;
  periodDays: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-bh-info/25 bg-bh-info-soft/40 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-bh-text">No location load yet</p>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Published and filled shifts in the next {periodDays} days will rank here.
        </p>
        <Link
          href={`/org/${slug}/locations`}
          className="mt-3 inline-flex text-sm font-semibold text-bh-info hover:underline"
        >
          Manage locations →
        </Link>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.count), 1);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-bh-info/20 bg-bh-info-soft/50 px-3 py-2.5">
        <p className="text-xs font-medium text-bh-text-secondary">
          Next {periodDays} days
        </p>
        <p className="bh-tabular text-sm font-bold text-bh-sidebar">
          {total} shift{total === 1 ? '' : 's'}
        </p>
      </div>

      <ul className="space-y-2" aria-label="Upcoming shifts by location">
        {rows.map((row, index) => {
          const pct = Math.round((row.count / max) * 100);
          return (
            <li key={row.locationId}>
              <Link
                href={`/org/${slug}/locations/${row.locationId}`}
                className="group block rounded-2xl border border-bh-border/80 bg-gradient-to-r from-bh-info-soft/40 to-bh-surface px-3.5 py-3 transition-[border-color,box-shadow] hover:border-bh-info/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bh-sidebar text-[11px] font-bold text-bh-sidebar-text">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-bh-text group-hover:text-bh-info">
                      {row.name}
                    </span>
                  </div>
                  <span className="bh-tabular shrink-0 text-sm font-bold text-bh-sidebar">
                    {row.count}
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-bh-surface ring-1 ring-bh-border/50">
                  <div
                    className="h-full rounded-full bg-bh-info"
                    style={{ width: `${Math.max(pct, 8)}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
