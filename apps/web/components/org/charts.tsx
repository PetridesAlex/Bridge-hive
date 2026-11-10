import { Activity, ArrowUpRight, Building2, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type {
  OrgActivitySeries,
  RoleCoverage,
} from '@bridge-hive/domain';

export { CoverageTrendChart } from '@/components/org/coverage-trend-chart';

const ROW_TONES = {
  teal: {
    border: 'border-[#13a3b4]/25',
    chip: 'bg-[linear-gradient(140deg,#0b6f7c_0%,#2cc7d6_100%)] text-white shadow-[0_6px_12px_rgba(19,163,180,0.32)]',
    bar: 'bg-[linear-gradient(90deg,#0b6f7c_0%,#13a3b4_55%,#2cc7d6_100%)] shadow-[0_0_10px_rgba(19,163,180,0.45)]',
    text: 'text-[#0b6f7c]',
  },
  info: {
    border: 'border-[#2f6cf0]/25',
    chip: 'bg-[linear-gradient(140deg,#1e3fae_0%,#5b9bff_100%)] text-white shadow-[0_6px_12px_rgba(47,108,240,0.32)]',
    bar: 'bg-[linear-gradient(90deg,#1e3fae_0%,#2f6cf0_55%,#5b9bff_100%)] shadow-[0_0_10px_rgba(47,108,240,0.45)]',
    text: 'text-[#1e3fae]',
  },
  navy: {
    border: 'border-[#16485f]/20',
    chip: 'bg-[linear-gradient(140deg,#050f1a_0%,#16485f_100%)] text-[#f3d27a] shadow-[0_6px_12px_rgba(7,29,48,0.28)]',
    bar: 'bg-[linear-gradient(90deg,#c27c00_0%,#e0aa18_55%,#f6cd4f_100%)] shadow-[0_0_10px_rgba(224,170,24,0.45)]',
    text: 'text-[#16384f]',
  },
} as const;

function SummaryStrip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-between overflow-hidden rounded-xl px-3.5 py-2.5',
        className,
      )}
    >
      <span
        aria-hidden
        className="bh-gradient-sheen pointer-events-none absolute inset-0 opacity-60 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)]"
      />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.12em] opacity-85">{label}</p>
      <p className="bh-tabular relative text-sm font-extrabold">{value}</p>
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
      <div className="relative overflow-hidden rounded-2xl border border-[#16384f]/12 bg-[linear-gradient(165deg,#fffbf2_0%,#f7f3e8_100%)] px-4 py-8 text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-6 -top-8 h-20 w-20 rounded-full bg-[#e4b334]/25 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-[#071d30]/10 blur-2xl"
        />
        <span className="relative mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#071d30] text-[#f3d27a] shadow-[0_10px_18px_rgba(7,29,48,0.28)]">
          <Users className="h-4 w-4" aria-hidden />
        </span>
        <p className="relative mt-3 text-sm font-semibold text-[#071d30]">
          No role demand yet
        </p>
        <p className="relative mt-1 text-sm text-bh-text-secondary">
          Role mix appears once shifts are scheduled for{' '}
          {periodLabel.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryStrip
        label={periodLabel}
        value={`${total} shift${total === 1 ? '' : 's'}`}
        className="bg-[linear-gradient(120deg,#c27c00_0%,#e0aa18_60%,#f6cd4f_100%)] text-[#2a1a00] shadow-[0_8px_18px_rgba(224,170,24,0.3)]"
      />

      <div className="space-y-3">
        {coverage.map((row, index) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          const isRn = row.role === 'registered_nurse';
          const isPhysio = row.role === 'physiotherapist';
          const Icon = isRn ? Stethoscope : isPhysio ? Activity : Users;
          const tone = isRn ? ROW_TONES.teal : isPhysio ? ROW_TONES.info : ROW_TONES.navy;
          return (
            <div
              key={row.role}
              className={cn(
                'bh-rail-item group rounded-2xl bg-bh-subtle/35 px-3.5 py-3 transition-colors duration-200 hover:bg-bh-subtle/55 motion-reduce:transition-none',
                row.count === 0 && 'opacity-70 hover:opacity-100',
              )}
              style={{ animationDelay: `${120 + index * 80}ms` }}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none',
                    tone.chip,
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
                <p className={cn('bh-tabular text-lg font-extrabold', tone.text)}>{pct}%</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#071d30]/[0.06]">
                <div
                  className={cn('bh-cal-bar h-full rounded-full', tone.bar)}
                  style={{
                    width: `${Math.max(pct, row.count > 0 ? 6 : 0)}%`,
                    animationDelay: `${300 + index * 80}ms`,
                  }}
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

      <div className="overflow-x-auto rounded-xl bg-bh-subtle/35 px-2 pt-3">
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
      <div className="relative overflow-hidden rounded-2xl border border-[#16384f]/12 bg-[linear-gradient(165deg,#f5f8fc_0%,#eaf0f7_100%)] px-4 py-8 text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-6 -top-8 h-20 w-20 rounded-full bg-[#2f6cf0]/18 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-[#e4b334]/16 blur-2xl"
        />
        <span className="relative mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#071d30] text-[#f3d27a] shadow-[0_10px_18px_rgba(7,29,48,0.28)]">
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <p className="relative mt-3 text-sm font-semibold text-[#071d30]">
          No location load yet
        </p>
        <p className="relative mt-1 text-sm text-bh-text-secondary">
          Published and filled shifts in the next {periodDays} days will rank
          here.
        </p>
        <Link
          href={`/org/${slug}/locations`}
          className="relative mt-3.5 inline-flex items-center rounded-full bg-[#071d30] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_16px_rgba(7,29,48,0.22)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#0c2a42] motion-reduce:hover:translate-y-0"
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
      <SummaryStrip
        label={`Next ${periodDays} days`}
        value={`${total} shift${total === 1 ? '' : 's'}`}
        className="bg-[linear-gradient(120deg,#1e3fae_0%,#2f6cf0_60%,#5b9bff_100%)] text-white shadow-[0_8px_18px_rgba(47,108,240,0.3)]"
      />

      <ul className="space-y-2" aria-label="Upcoming shifts by location">
        {rows.map((row, index) => {
          const pct = Math.round((row.count / max) * 100);
          return (
            <li
              key={row.locationId}
              className="bh-rail-item"
              style={{ animationDelay: `${120 + index * 80}ms` }}
            >
              <Link
                href={`/org/${slug}/locations/${row.locationId}`}
                className="group block rounded-2xl bg-bh-subtle/35 px-3.5 py-3 transition-colors duration-200 hover:bg-bh-subtle/55 motion-reduce:transition-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none',
                        index === 0
                          ? 'bg-[linear-gradient(140deg,#c27c00_0%,#f6cd4f_100%)] text-[#2a1a00] shadow-[0_6px_12px_rgba(224,170,24,0.35)]'
                          : 'bg-[linear-gradient(140deg,#050f1a_0%,#16485f_100%)] text-white shadow-[0_6px_12px_rgba(7,29,48,0.25)]',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-bh-text group-hover:text-[#1e3fae]">
                      {row.name}
                    </span>
                  </div>
                  <span className="bh-tabular inline-flex shrink-0 items-center gap-1 text-sm font-extrabold text-[#1e3fae]">
                    {row.count}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#071d30]/[0.06]">
                  <div
                    className="bh-cal-bar h-full rounded-full bg-[linear-gradient(90deg,#1e3fae_0%,#2f6cf0_55%,#5b9bff_100%)] shadow-[0_0_10px_rgba(47,108,240,0.45)]"
                    style={{
                      width: `${Math.max(pct, 8)}%`,
                      animationDelay: `${300 + index * 80}ms`,
                    }}
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
