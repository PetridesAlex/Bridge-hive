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
    shell: 'border-bh-border bg-bh-surface hover:border-bh-teal/40',
    wash: 'from-bh-teal-soft/90 via-bh-teal-soft/30 to-transparent',
    icon: 'bg-bh-teal-soft text-bh-teal-strong',
    spark: '#16A6B6',
    value: 'text-bh-text',
  },
  honey: {
    shell: 'border-bh-border bg-bh-surface hover:border-bh-honey/50',
    wash: 'from-bh-honey-soft via-bh-honey-soft/40 to-transparent',
    icon: 'bg-bh-honey-soft text-bh-honey-strong',
    spark: '#E0AA18',
    value: 'text-bh-text',
  },
  info: {
    shell: 'border-bh-border bg-bh-surface hover:border-bh-accent-blue/40',
    wash: 'from-bh-accent-blue-soft via-bh-accent-blue-soft/50 to-transparent',
    icon: 'bg-bh-accent-blue-soft text-bh-accent-blue',
    spark: '#2563EB',
    value: 'text-bh-text',
  },
  warning: {
    shell: 'border-bh-border bg-bh-surface hover:border-bh-warning/40',
    wash: 'from-bh-warning-soft via-bh-warning-soft/50 to-transparent',
    icon: 'bg-bh-warning-soft text-bh-warning',
    spark: '#A56800',
    value: 'text-bh-text',
  },
  navy: {
    shell: 'border-bh-border bg-bh-surface hover:border-bh-sidebar/20',
    wash: 'from-bh-subtle via-bh-subtle/40 to-transparent',
    icon: 'bg-bh-subtle text-bh-sidebar',
    spark: '#0B2A43',
    value: 'text-bh-text',
  },
  violet: {
    shell: 'border-bh-border bg-bh-surface hover:border-violet-300/60',
    wash: 'from-bh-accent-violet-soft via-bh-accent-violet-soft/45 to-transparent',
    icon: 'bg-bh-accent-violet-soft text-violet-700',
    spark: '#7C3AED',
    value: 'text-bh-text',
  },
  success: {
    shell: 'border-bh-border bg-bh-surface hover:border-bh-success/40',
    wash: 'from-bh-success-soft via-bh-success-soft/45 to-transparent',
    icon: 'bg-bh-success-soft text-bh-success',
    spark: '#198754',
    value: 'text-bh-text',
  },
} as const;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 88;
  const h = 32;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = values.length <= 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-8 w-[88px]"
      aria-hidden
    >
      <polygon points={area} fill={color} opacity="0.18" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const sparkValues =
    series && series.length > 0
      ? series
      : [0, 0, 0, 0, 0, typeof value === 'number' ? value : 0];

  return (
    <Link
      href={href}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border p-5 shadow-[0_4px_16px_rgba(7,29,48,0.04)] transition-[border-color,box-shadow,transform]',
        'hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(7,29,48,0.08)] focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:hover:translate-y-0',
        theme.shell,
        highlight && 'ring-1 ring-bh-warning/35',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br',
          theme.wash,
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            theme.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <Sparkline values={sparkValues} color={theme.spark} />
      </div>
      <div className="relative mt-4 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-text-muted">
          {label}
        </p>
        <p
          className={cn(
            'bh-tabular text-[32px] font-bold leading-none tracking-tight',
            theme.value,
          )}
        >
          {value}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {trendPercent != null && Number.isFinite(trendPercent) ? (
            <span
              className={cn(
                'bh-tabular text-xs font-bold',
                trendPercent >= 0 ? 'text-bh-success' : 'text-bh-danger',
              )}
            >
              {trendPercent >= 0 ? '+' : ''}
              {Math.round(trendPercent)}%
            </span>
          ) : null}
          {supporting ? (
            <p className="text-sm leading-5 text-bh-text-secondary">{supporting}</p>
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
