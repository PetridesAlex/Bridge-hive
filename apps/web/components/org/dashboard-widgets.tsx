import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  LucideIcon,
  MapPin,
  Sparkles,
} from 'lucide-react';

import { ShiftStatusBadge } from '@/components/shift-status-badge';
import { cn } from '@/lib/utils';
import type { AttentionItem } from '@bridge-hive/domain';

const TINTS = {
  teal: {
    shell:
      'border-cyan-200/70 bg-[linear-gradient(165deg,#ffffff_0%,#f0fbfc_48%,#e6f7f8_100%)] hover:border-cyan-300/90',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(22,166,182,0.45)_0%,rgba(22,166,182,0)_68%)]',
    bar: 'from-[#16a6b6] via-[#2dd4bf] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#16384f_0%,#0c3a42_55%,#16a6b6_100%)] text-white shadow-[0_8px_20px_rgba(22,166,182,0.35)] ring-1 ring-white/30',
    spark: '#16A6B6',
    sparkSoft: 'rgba(22,166,182,0.22)',
    label: 'text-bh-teal-strong',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(22,166,182,0.18)]',
  },
  honey: {
    shell:
      'border-amber-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#fffaf0_48%,#fff3d6_100%)] hover:border-bh-honey/80',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(228,179,52,0.42)_0%,rgba(228,179,52,0)_68%)]',
    bar: 'from-[#e4b334] via-[#f0c95a] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#16384f_0%,#3a2f12_50%,#e4b334_100%)] text-white shadow-[0_8px_20px_rgba(228,179,52,0.35)] ring-1 ring-white/30',
    spark: '#E0AA18',
    sparkSoft: 'rgba(224,170,24,0.22)',
    label: 'text-bh-honey-strong',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(228,179,52,0.2)]',
  },
  info: {
    shell:
      'border-sky-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#f3f8ff_48%,#e8f1ff_100%)] hover:border-sky-300/90',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.38)_0%,rgba(37,99,235,0)_68%)]',
    bar: 'from-[#2563eb] via-[#38bdf8] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#0b2a43_0%,#16384f_48%,#2563eb_100%)] text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] ring-1 ring-white/30',
    spark: '#2563EB',
    sparkSoft: 'rgba(37,99,235,0.2)',
    label: 'text-bh-accent-blue',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(37,99,235,0.16)]',
  },
  warning: {
    shell:
      'border-orange-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#fff8f0_48%,#ffefd9_100%)] hover:border-bh-warning/50',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(165,104,0,0.32)_0%,rgba(165,104,0,0)_68%)]',
    bar: 'from-[#a56800] via-[#f59e0b] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#3a2508_0%,#a56800_55%,#f59e0b_100%)] text-white shadow-[0_8px_20px_rgba(165,104,0,0.28)] ring-1 ring-white/30',
    spark: '#A56800',
    sparkSoft: 'rgba(165,104,0,0.2)',
    label: 'text-bh-warning',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(165,104,0,0.16)]',
  },
  navy: {
    shell:
      'border-slate-200/90 bg-[linear-gradient(165deg,#ffffff_0%,#f5f8fb_48%,#e8eef4_100%)] hover:border-[#16384f]/25',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(7,29,48,0.22)_0%,rgba(7,29,48,0)_68%)]',
    bar: 'from-[#071d30] via-[#16384f] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#071d30_0%,#16384f_60%,#0c3a42_100%)] text-white shadow-[0_8px_20px_rgba(7,29,48,0.28)] ring-1 ring-white/20',
    spark: '#16384F',
    sparkSoft: 'rgba(22,56,79,0.18)',
    label: 'text-[#16384f]',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(7,29,48,0.12)]',
  },
  violet: {
    shell:
      'border-cyan-200/60 bg-[linear-gradient(165deg,#ffffff_0%,#f4fafb_42%,#eef6ff_100%)] hover:border-cyan-300/70',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.28)_0%,rgba(14,165,233,0)_68%)]',
    bar: 'from-[#0ea5e9] via-[#67e8f9] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#071d30_0%,#0c4a6e_55%,#0ea5e9_100%)] text-white shadow-[0_8px_20px_rgba(14,165,233,0.28)] ring-1 ring-white/25',
    spark: '#0EA5E9',
    sparkSoft: 'rgba(14,165,233,0.2)',
    label: 'text-sky-700',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(14,165,233,0.14)]',
  },
  success: {
    shell:
      'border-emerald-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#f3fbf6_48%,#e7f7ee_100%)] hover:border-bh-success/45',
    orb: 'bg-[radial-gradient(circle_at_center,rgba(25,135,84,0.32)_0%,rgba(25,135,84,0)_68%)]',
    bar: 'from-[#198754] via-[#34d399] to-transparent',
    icon: 'bg-[linear-gradient(145deg,#0b2a1a_0%,#146c43_55%,#198754_100%)] text-white shadow-[0_8px_20px_rgba(25,135,84,0.28)] ring-1 ring-white/25',
    spark: '#198754',
    sparkSoft: 'rgba(25,135,84,0.2)',
    label: 'text-bh-success',
    value: 'text-[#071d30]',
    glow: 'group-hover:shadow-[0_18px_40px_rgba(25,135,84,0.14)]',
  },
} as const;

function Sparkline({
  values,
  color,
  soft,
  id,
}: {
  values: number[];
  color: string;
  soft: string;
  id: string;
}) {
  const w = 96;
  const h = 36;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = values.length <= 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const gradId = `kpi-spark-${id}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-24" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="55%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={soft} />
      <polyline
        points={line}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-[stroke-width] duration-300 group-hover:[stroke-width:2.6]"
      />
      {pts.length ? (
        <circle
          cx={Number(pts[pts.length - 1]!.split(',')[0])}
          cy={Number(pts[pts.length - 1]!.split(',')[1])}
          r="2.6"
          fill={color}
          className="opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        />
      ) : null}
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  supporting,
  href,
  icon: Icon,
  tint = 'navy',
  highlight = false,
  series,
  trendPercent,
}: {
  label: string;
  value: string | number;
  supporting?: string;
  href: string;
  icon: LucideIcon;
  tint?: keyof typeof TINTS;
  highlight?: boolean;
  /** Weekly sparkline points (oldest → newest). */
  series?: number[];
  /** Week-over-week percent change; omit when unknown. */
  trendPercent?: number | null;
}) {
  const theme = TINTS[tint];
  const sparkValues = series && series.length > 0 ? series : null;
  const sparkId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <Link
      href={href}
      className={cn(
        'group relative block overflow-hidden rounded-[1.35rem] border p-5 shadow-[0_6px_20px_rgba(7,29,48,0.05)] transition-[border-color,box-shadow,transform] duration-300',
        'hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        theme.shell,
        theme.glow,
        highlight && 'ring-1 ring-bh-warning/40',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-2xl transition-opacity duration-500 opacity-70 group-hover:opacity-100',
          theme.orb,
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r',
          theme.bar,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(7,29,48,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(7,29,48,0.9)_1px,transparent_1px)] [background-size:18px_18px]"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100',
            theme.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex flex-col items-end gap-2">
          {sparkValues ? (
            <Sparkline
              values={sparkValues}
              color={theme.spark}
              soft={theme.sparkSoft}
              id={sparkId}
            />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted backdrop-blur-sm">
              Live
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bh-teal opacity-40 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bh-teal" />
              </span>
            </span>
          )}
          <ArrowRight
            className="h-4 w-4 text-bh-text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
            aria-hidden
          />
        </div>
      </div>

      <div className="relative mt-5 space-y-1.5">
        <p
          className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.14em]',
            theme.label,
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            'bh-tabular text-[2.15rem] font-extrabold leading-none tracking-[-0.04em]',
            theme.value,
          )}
        >
          {value}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {trendPercent != null && Number.isFinite(trendPercent) ? (
            <span
              className={cn(
                'bh-tabular inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset',
                trendPercent >= 0
                  ? 'bg-bh-success-soft text-bh-success ring-bh-success/20'
                  : 'bg-bh-danger-soft text-bh-danger ring-bh-danger/20',
              )}
            >
              {trendPercent >= 0 ? '+' : ''}
              {Math.round(trendPercent)}%
            </span>
          ) : null}
          {supporting ? (
            <p className="text-sm leading-5 text-bh-text-secondary">
              {supporting}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  accent = 'default',
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: 'default' | 'teal' | 'honey' | 'info' | 'navy';
  eyebrow?: string;
}) {
  const accents = {
    default: 'from-bh-surface to-bh-surface border-bh-border',
    teal: 'from-bh-surface via-bh-surface to-bh-teal-soft/30 border-bh-border',
    honey: 'from-bh-surface via-bh-surface to-bh-honey-soft/35 border-bh-border',
    info: 'from-bh-surface via-bh-surface to-bh-accent-blue-soft/40 border-bh-border',
    navy: 'from-bh-surface via-bh-surface to-bh-subtle border-bh-border',
  } as const;

  const eyebrowTone = {
    default: 'text-bh-text-muted',
    teal: 'text-bh-teal-strong',
    honey: 'text-bh-warning',
    info: 'text-bh-info',
    navy: 'text-bh-sidebar',
  } as const;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-b p-5 shadow-[0_8px_24px_rgba(7,29,48,0.06)] sm:p-6',
        accents[accent],
        className,
      )}
    >
      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p
              className={cn(
                'text-[10px] font-semibold uppercase tracking-[0.12em]',
                eyebrowTone[accent],
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-0.5 text-[17px] font-bold tracking-tight text-bh-text">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-bh-text-secondary">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

export function StatusBanner({
  title,
  body,
  tone = 'info',
  action,
}: {
  title: string;
  body?: string | null;
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'muted';
  action?: React.ReactNode;
}) {
  const tones = {
    info: 'border-bh-info/30 bg-bh-info-soft text-bh-info',
    warning: 'border-bh-warning/30 bg-bh-warning-soft text-bh-warning',
    danger: 'border-bh-danger/30 bg-bh-danger-soft text-bh-danger',
    success: 'border-bh-success/30 bg-bh-success-soft text-bh-success',
    muted: 'border-bh-border bg-bh-subtle text-bh-text-secondary',
  } as const;

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        tones[tone],
      )}
    >
      <div>
        <p className="font-semibold text-bh-text">{title}</p>
        {body ? <p className="mt-0.5 text-sm text-bh-text-secondary">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

function formatScheduleParts(iso: string, timeZone = 'Europe/Nicosia') {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone,
  }).format(d);
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    timeZone,
  }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    timeZone,
  }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(d);
  return { weekday, day, month, time };
}

export type UpcomingScheduleItem = {
  id: string;
  title: string | null;
  starts_at: string;
  status: string;
  roleLabel: string;
  locationName?: string | null;
  wardName?: string | null;
  href: string;
};

export function UpcomingScheduleList({
  items,
  emptyHref,
  canCreate,
}: {
  items: UpcomingScheduleItem[];
  emptyHref?: string;
  canCreate?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-bh-surface text-bh-teal-strong shadow-sm">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-semibold text-bh-text">Schedule is clear</p>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Upcoming published and filled shifts will appear here.
        </p>
        {canCreate && emptyHref ? (
          <Link
            href={emptyHref}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-bh-teal-strong hover:underline"
          >
            Create a shift
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((shift) => {
        const parts = formatScheduleParts(shift.starts_at);
        const place = [shift.locationName, shift.wardName].filter(Boolean).join(' · ');
        return (
          <li key={shift.id}>
            <Link
              href={shift.href}
              className="group flex gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors hover:border-bh-border hover:bg-bh-subtle/60 sm:items-center sm:gap-4"
            >
              <div
                className="flex h-[52px] w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-bh-sidebar text-bh-sidebar-text shadow-sm"
                aria-hidden
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {parts.weekday}
                </span>
                <span className="bh-tabular text-lg font-bold leading-none">{parts.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-bh-text group-hover:text-bh-teal-strong">
                    {shift.title || 'Untitled shift'}
                  </p>
                  <ShiftStatusBadge status={shift.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bh-text-secondary">
                  <span className="bh-tabular font-medium text-bh-text">{parts.time}</span>
                  <span className="text-bh-text-muted">{parts.month}</span>
                  {place ? (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-bh-teal-strong" aria-hidden />
                      <span className="truncate">{place}</span>
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs font-medium text-bh-text-muted">{shift.roleLabel}</p>
              </div>
              <ArrowRight
                className="mt-1 hidden h-4 w-4 shrink-0 text-bh-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-bh-teal-strong sm:mt-0 sm:block"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function attentionMeta(status: string): {
  icon: LucideIcon;
  tone: string;
  bar: string;
} {
  const s = status.toLowerCase();
  if (s.includes('review') || s.includes('due')) {
    return {
      icon: AlertTriangle,
      tone: 'bg-bh-honey-soft text-bh-warning',
      bar: 'bg-bh-honey',
    };
  }
  if (s.includes('draft') || s.includes('setup') || s.includes('pending')) {
    return {
      icon: FileEdit,
      tone: 'bg-bh-info-soft text-bh-info',
      bar: 'bg-bh-info',
    };
  }
  if (s.includes('action') || s.includes('rejected')) {
    return {
      icon: AlertTriangle,
      tone: 'bg-bh-danger-soft text-bh-danger',
      bar: 'bg-bh-danger',
    };
  }
  return {
    icon: ClipboardList,
    tone: 'bg-bh-teal-soft text-bh-teal-strong',
    bar: 'bg-bh-teal',
  };
}

export function AttentionQueueList({
  items,
  slug,
  canManageShifts,
  canReviewTimesheets,
  canManageLocations,
}: {
  items: AttentionItem[];
  slug: string;
  canManageShifts?: boolean;
  canReviewTimesheets?: boolean;
  canManageLocations?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-bh-success/20 bg-bh-success-soft/50 px-4 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bh-surface text-bh-success shadow-sm">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-bh-text">All clear for now</p>
            <p className="mt-1 text-sm text-bh-text-secondary">
              No drafts, deadlines, or timesheets need action from this organization.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {canReviewTimesheets ? (
            <Link
              href={`/org/${slug}/timesheets`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-xs font-medium text-bh-text hover:border-bh-teal hover:text-bh-teal-strong"
            >
              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              Timesheets
            </Link>
          ) : null}
          {canManageShifts ? (
            <Link
              href={`/org/${slug}/shifts?status=draft`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-xs font-medium text-bh-text hover:border-bh-teal hover:text-bh-teal-strong"
            >
              <FileEdit className="h-3.5 w-3.5" aria-hidden />
              Drafts
            </Link>
          ) : null}
          {canManageLocations ? (
            <Link
              href={`/org/${slug}/locations`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bh-border bg-bh-surface px-3 py-1.5 text-xs font-medium text-bh-text hover:border-bh-teal hover:text-bh-teal-strong"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Locations
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const meta = attentionMeta(item.status);
        const Icon = meta.icon;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group relative flex gap-3 overflow-hidden rounded-xl border border-bh-border bg-bh-surface px-3 py-3 transition-colors hover:border-bh-border-strong hover:bg-bh-subtle/40"
            >
              <span
                className={cn('absolute inset-y-0 left-0 w-1', meta.bar)}
                aria-hidden
              />
              <span
                className={cn(
                  'ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  meta.tone,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-bh-text group-hover:text-bh-teal-strong">
                    {item.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-bh-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bh-text-muted">
                    {item.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-bh-text-secondary">
                  {item.context}
                </p>
              </div>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-bh-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-bh-teal-strong"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
