'use client';

import { CircleCheck, CircleDot, CircleSlash, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { cn } from '@/lib/utils';
import type { WeekBucket } from '@bridge-hive/domain';

const WIDTH = 360;
const HEIGHT = 176;
const PAD_LEFT = 28;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const INNER_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const INNER_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const BASELINE = PAD_TOP + INNER_H;
const TICK_COUNT = 4;

type Point = { x: number; y: number };

function niceAxis(max: number): { top: number; step: number } {
  const step = Math.max(1, Math.ceil(max / TICK_COUNT));
  return { top: step * TICK_COUNT, step };
}

/** Monotone cubic interpolation: smooth, but never overshoots the data (no dips below zero). */
function monotonePath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0]!.x},${points[0]!.y}`;
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1]!.x - points[i]!.x);
    slope.push((points[i + 1]!.y - points[i]!.y) / dx[i]!);
  }
  const tangent: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i += 1) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tangent.push(a * b <= 0 ? 0 : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b));
  }
  tangent.push(slope[n - 2]!);

  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${p0.x + h},${p0.y + tangent[i]! * h} ${p1.x - h},${p1.y - tangent[i + 1]! * h} ${p1.x},${p1.y}`;
  }
  return d;
}

export function CoverageTrendChart({
  buckets,
  emptyHref,
}: {
  buckets: WeekBucket[];
  emptyHref: string;
}) {
  const uid = useId();
  const [active, setActive] = useState<number | null>(null);

  const totals = buckets.reduce(
    (acc, b) => {
      acc.published += b.published;
      acc.filled += b.filled;
      acc.cancelled += b.cancelled;
      return acc;
    },
    { published: 0, filled: 0, cancelled: 0 },
  );
  const hasData = buckets.some((b) => b.published + b.filled + b.cancelled > 0);

  if (!hasData) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#16384f]/12 bg-[linear-gradient(165deg,#f7fbfd_0%,#eef6f8_100%)] px-4 py-8 text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-6 -top-8 h-20 w-20 rounded-full bg-bh-teal/20 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-[#e4b334]/18 blur-2xl"
        />
        <span className="relative mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#071d30] text-[#f3d27a] shadow-[0_10px_18px_rgba(7,29,48,0.28)]">
          <TrendingUp className="h-4 w-4" aria-hidden />
        </span>
        <p className="relative mt-3 text-sm font-semibold text-[#071d30]">
          No shift activity yet
        </p>
        <p className="relative mt-1 text-sm text-bh-text-secondary">
          Trends appear after you publish openings.
        </p>
        <Link
          href={emptyHref}
          className="relative mt-3.5 inline-flex items-center rounded-full bg-[#071d30] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_16px_rgba(7,29,48,0.22)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#0c2a42] motion-reduce:hover:translate-y-0"
        >
          Create shift →
        </Link>
      </div>
    );
  }

  const scheduledTotal = totals.published + totals.filled;
  const fillRate = scheduledTotal > 0 ? Math.round((totals.filled / scheduledTotal) * 100) : 0;
  const dataMax = Math.max(0, ...buckets.map((b) => Math.max(b.published + b.filled, b.cancelled)));
  const axis = niceAxis(dataMax);
  const step = buckets.length > 1 ? INNER_W / (buckets.length - 1) : 0;
  const xAt = (i: number) => (buckets.length > 1 ? PAD_LEFT + i * step : PAD_LEFT + INNER_W / 2);
  const yAt = (v: number) => BASELINE - (v / axis.top) * INNER_H;

  const scheduledPts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.published + b.filled) }));
  const filledPts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.filled) }));
  const scheduledLine = monotonePath(scheduledPts);
  const filledLine = monotonePath(filledPts);
  const scheduledArea = `${scheduledLine} L${xAt(buckets.length - 1)},${BASELINE} L${xAt(0)},${BASELINE} Z`;
  const filledArea = `${filledLine} L${xAt(buckets.length - 1)},${BASELINE} L${xAt(0)},${BASELINE} Z`;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => i * axis.step);
  const columnW = buckets.length > 1 ? step : INNER_W;
  const activeBucket = active != null ? buckets[active] : null;

  const ids = {
    scheduledFill: `${uid}-sf`,
    filledFill: `${uid}-ff`,
    line: `${uid}-ln`,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatChip
          label="Open"
          value={totals.published}
          icon={CircleDot}
          className="bg-[linear-gradient(140deg,#e6f8fa_0%,#ccf1f5_100%)] text-[#0b6f7c] ring-[#13a3b4]/25"
        />
        <StatChip
          label="Filled"
          value={totals.filled}
          icon={CircleCheck}
          className="bg-[linear-gradient(140deg,#e9faf2_0%,#cdf3e1_100%)] text-[#047857] ring-emerald-500/25"
        />
        <StatChip
          label="Cancelled"
          value={totals.cancelled}
          icon={CircleSlash}
          className="bg-[linear-gradient(140deg,#fff1f2_0%,#ffe1e4_100%)] text-[#be123c] ring-rose-500/20"
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-bh-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f6fafc_100%)] px-2 pb-1 pt-3">
        <div className="mb-1 flex items-center justify-between gap-2 px-1.5">
          <div className="flex items-center gap-3 text-[10.5px] font-semibold text-bh-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded-full bg-[#13a3b4]" aria-hidden />
              Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded-full bg-emerald-500" aria-hidden />
              Filled
            </span>
            {totals.cancelled > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
                Cancelled
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#071d30] px-2 py-0.5 text-[10px] font-bold text-white">
            <TrendingUp className="h-3 w-3 text-[#f3d27a]" aria-hidden />
            <span className="bh-tabular">{fillRate}%</span> filled
          </span>
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label="Weekly scheduled and filled shift counts for the next six weeks"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={ids.scheduledFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#13a3b4" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#13a3b4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={ids.filledFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={ids.line} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0b6f7c" />
              <stop offset="100%" stopColor="#2cc7d6" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke={t === 0 ? '#cbd8e1' : '#e6edf2'}
                strokeWidth="1"
                strokeDasharray={t === 0 ? undefined : '3 4'}
              />
              <text
                x={PAD_LEFT - 8}
                y={yAt(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="bh-tabular fill-bh-text-muted text-[10px] font-medium"
              >
                {t}
              </text>
            </g>
          ))}

          {active != null ? (
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PAD_TOP}
              y2={BASELINE}
              stroke="#071d30"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
          ) : null}

          <path d={scheduledArea} fill={`url(#${ids.scheduledFill})`} className="bh-chart-fade" />
          <path d={filledArea} fill={`url(#${ids.filledFill})`} className="bh-chart-fade" />
          <path
            d={scheduledLine}
            fill="none"
            stroke={`url(#${ids.line})`}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="bh-chart-draw"
          />
          <path
            d={filledLine}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="bh-chart-draw"
            style={{ animationDelay: '150ms' }}
          />

          {buckets.map((b, i) => {
            const isActive = active === i;
            const delay = `${500 + i * 70}ms`;
            return (
              <g key={b.weekStartIso}>
                <circle
                  cx={xAt(i)}
                  cy={yAt(b.published + b.filled)}
                  r={isActive ? 5.5 : 4}
                  fill="#fff"
                  stroke="#13a3b4"
                  strokeWidth="2.25"
                  className="bh-chart-dot transition-[r] duration-150"
                  style={{ animationDelay: delay }}
                />
                <circle
                  cx={xAt(i)}
                  cy={yAt(b.filled)}
                  r={isActive ? 4.5 : 3}
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth="1.5"
                  className="bh-chart-dot transition-[r] duration-150"
                  style={{ animationDelay: delay }}
                />
                {b.cancelled > 0 ? (
                  <circle
                    cx={xAt(i)}
                    cy={yAt(b.cancelled)}
                    r="3.5"
                    fill="#f43f5e"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className="bh-chart-dot"
                    style={{ animationDelay: delay }}
                  />
                ) : null}
                <text
                  x={xAt(i)}
                  y={HEIGHT - 8}
                  textAnchor={i === 0 ? 'start' : i === buckets.length - 1 ? 'end' : 'middle'}
                  className={cn(
                    'text-[10px] font-semibold',
                    isActive ? 'fill-bh-text' : 'fill-bh-text-muted',
                  )}
                >
                  {b.label}
                </text>
                <rect
                  x={xAt(i) - columnW / 2}
                  y={PAD_TOP}
                  width={columnW}
                  height={INNER_H}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                />
              </g>
            );
          })}
        </svg>

        {activeBucket && active != null ? (
          <div
            className="pointer-events-none absolute top-9 z-10 w-[132px] rounded-xl bg-[#071d30] px-3 py-2 text-white shadow-[0_12px_28px_rgba(7,29,48,0.3)]"
            style={{
              left: `clamp(8px, calc(${(xAt(active) / WIDTH) * 100}% - 66px), calc(100% - 140px))`,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Week of {activeBucket.label}
            </p>
            <dl className="mt-1.5 space-y-0.5 text-[11.5px]">
              <TooltipRow color="bg-[#2cc7d6]" label="Open" value={activeBucket.published} />
              <TooltipRow color="bg-emerald-400" label="Filled" value={activeBucket.filled} />
              <TooltipRow color="bg-rose-400" label="Cancelled" value={activeBucket.cancelled} />
            </dl>
          </div>
        ) : null}
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

function StatChip({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: typeof CircleDot;
  className: string;
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl px-2.5 py-2 ring-1 ring-inset transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <Icon
        className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-9 w-9 opacity-[0.12] transition-transform duration-300 group-hover:scale-110"
        aria-hidden
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</p>
      <p className="bh-tabular mt-0.5 text-xl font-bold leading-none text-bh-sidebar">{value}</p>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="inline-flex items-center gap-1.5 text-white/75">
        <span className={cn('h-1.5 w-1.5 rounded-full', color)} aria-hidden />
        {label}
      </dt>
      <dd className="bh-tabular font-bold">{value}</dd>
    </div>
  );
}
