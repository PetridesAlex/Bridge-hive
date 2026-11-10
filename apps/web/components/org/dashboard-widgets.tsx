import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileEdit,
  LucideIcon,
  MapPin,
  Sparkles,
} from 'lucide-react';

import { AllClearStatus } from '@/components/org/all-clear-status';
import { CountUp } from '@/components/org/count-up';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
import { cn } from '@/lib/utils';
import type { AttentionItem } from '@bridge-hive/domain';

const TINTS = {
  teal: {
    icon: 'bg-bh-teal text-white shadow-[0_8px_16px_rgba(22,166,182,0.28)]',
    spark: '#087f8c',
    sparkSoft: 'rgba(22,166,182,0.18)',
    accent: 'bg-bh-teal',
    card: 'border-bh-teal/30 bg-[linear-gradient(165deg,rgba(22,166,182,0.26)_0%,rgba(255,255,255,0.82)_42%)]',
    label: 'text-bh-teal-strong',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
  },
  honey: {
    icon: 'bg-[#e4b334] text-[#071d30] shadow-[0_8px_16px_rgba(228,179,52,0.32)]',
    spark: '#c9920f',
    sparkSoft: 'rgba(224,170,24,0.2)',
    accent: 'bg-bh-honey',
    card: 'border-[#e4b334]/40 bg-[linear-gradient(165deg,rgba(228,179,52,0.28)_0%,rgba(255,255,255,0.84)_44%)]',
    label: 'text-[#a56800]',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
  },
  info: {
    icon: 'bg-[#2563eb] text-white shadow-[0_8px_16px_rgba(37,99,235,0.28)]',
    spark: '#2563eb',
    sparkSoft: 'rgba(37,99,235,0.18)',
    accent: 'bg-bh-accent-blue',
    card: 'border-bh-accent-blue/30 bg-[linear-gradient(165deg,rgba(37,99,235,0.22)_0%,rgba(255,255,255,0.84)_44%)]',
    label: 'text-[#1d4ed8]',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
  },
  warning: {
    icon: 'bg-bh-warning text-white shadow-[0_8px_16px_rgba(165,104,0,0.28)]',
    spark: '#a56800',
    sparkSoft: 'rgba(165,104,0,0.18)',
    accent: 'bg-bh-warning',
    card: 'border-bh-warning/35 bg-[linear-gradient(165deg,rgba(165,104,0,0.22)_0%,rgba(255,255,255,0.84)_44%)]',
    label: 'text-bh-warning',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
  },
  navy: {
    icon: 'bg-[#071d30] text-[#e4b334] shadow-[0_8px_16px_rgba(7,29,48,0.28)]',
    spark: '#071d30',
    sparkSoft: 'rgba(7,29,48,0.12)',
    accent: 'bg-[#071d30]',
    card: 'border-[#16384f]/25 bg-[linear-gradient(165deg,rgba(22,56,79,0.16)_0%,rgba(255,255,255,0.86)_48%)]',
    label: 'text-[#16384f]',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
  },
  violet: {
    icon: 'bg-violet-600 text-white shadow-[0_8px_16px_rgba(109,40,217,0.28)]',
    spark: '#6d28d9',
    sparkSoft: 'rgba(109,40,217,0.16)',
    accent: 'bg-violet-600',
    card: 'border-violet-300/40 bg-[linear-gradient(165deg,rgba(109,40,217,0.18)_0%,rgba(255,255,255,0.86)_46%)]',
    label: 'text-violet-700',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
  },
  success: {
    icon: 'bg-bh-success text-white shadow-[0_8px_16px_rgba(25,135,84,0.28)]',
    spark: '#198754',
    sparkSoft: 'rgba(25,135,84,0.18)',
    accent: 'bg-bh-success',
    card: 'border-bh-success/30 bg-[linear-gradient(165deg,rgba(25,135,84,0.22)_0%,rgba(255,255,255,0.84)_44%)]',
    label: 'text-bh-success',
    value: 'text-[#071d30]',
    support: 'text-[#071d30]/70',
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
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-28" aria-hidden>
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
  featured = false,
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
  featured?: boolean;
  /** Weekly sparkline points (oldest → newest). */
  series?: number[];
  /** Week-over-week percent change; omit when unknown. */
  trendPercent?: number | null;
}) {
  const theme = TINTS[tint];
  const sparkValues = series && series.length > 0 ? series : null;
  const sparkId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const up = trendPercent != null && Number.isFinite(trendPercent) && trendPercent >= 0;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        'bh-org-enter group relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border p-5 shadow-[0_12px_28px_rgba(7,29,48,0.08)]',
        'transition-[transform,box-shadow] duration-200 hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        featured
          ? 'border-white/15 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] text-white shadow-[0_18px_40px_rgba(7,29,48,0.32)] hover:shadow-[0_22px_48px_rgba(7,29,48,0.4)]'
          : cn(theme.card, 'hover:shadow-[0_18px_36px_rgba(7,29,48,0.14)]'),
        highlight && !featured && 'ring-2 ring-inset ring-bh-warning/60',
      )}
    >
      {featured ? (
        <>
          <span
            aria-hidden
            className="bh-orb-drift pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/30 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-orb-drift pointer-events-none absolute -bottom-12 -right-8 h-24 w-24 rounded-full bg-[#e4b334]/25 blur-2xl"
            style={{ animationDelay: '-6s' }}
          />
          <span
            aria-hidden
            className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
          />
        </>
      ) : (
        <span
          aria-hidden
          className={cn('absolute inset-y-4 left-0 w-1 rounded-full', theme.accent)}
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            featured
              ? 'bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.35)]'
              : theme.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.3} aria-hidden />
        </span>
        <div className="flex items-center gap-2">
          {sparkValues ? (
            <Sparkline
              values={sparkValues}
              color={featured ? '#e4b334' : theme.spark}
              soft={featured ? 'rgba(228,179,52,0.18)' : theme.sparkSoft}
              id={`${sparkId}${featured ? '-hero' : ''}`}
            />
          ) : null}
          <ArrowRight
            className={cn(
              'h-4 w-4 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none',
              featured ? 'text-[#f3d27a]' : 'text-[#071d30]',
            )}
            aria-hidden
          />
        </div>
      </div>

      <div className="relative mt-auto space-y-1.5 pt-5">
        <p
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.16em]',
            featured ? 'text-[#f3d27a]' : theme.label,
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            'bh-tabular text-[2.45rem] font-bold leading-none tracking-[-0.04em]',
            featured ? 'text-white' : theme.value,
          )}
        >
          {typeof value === 'number' ? <CountUp value={value} /> : value}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {trendPercent != null && Number.isFinite(trendPercent) ? (
            <span
              className={cn(
                'bh-tabular inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
                featured
                  ? up
                    ? 'bg-white/12 text-[#b8f0d0]'
                    : 'bg-white/12 text-[#ffb4a8]'
                  : up
                    ? 'bg-bh-success-soft text-bh-success'
                    : 'bg-bh-danger-soft text-bh-danger',
              )}
            >
              {trendPercent >= 0 ? '+' : ''}
              {Math.round(trendPercent)}%
            </span>
          ) : null}
          {supporting ? (
            <p
              className={cn(
                'text-sm font-medium leading-5',
                featured ? 'text-white/75' : theme.support,
              )}
            >
              {supporting}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export const PANEL_ACCENTS = {
  teal: { eyebrow: 'text-bh-teal-strong', icon: 'bg-bh-teal-soft text-bh-teal-strong' },
  honey: { eyebrow: 'text-bh-honey-strong', icon: 'bg-bh-honey-soft text-bh-honey-strong' },
  info: { eyebrow: 'text-bh-accent-blue', icon: 'bg-bh-accent-blue-soft text-bh-accent-blue' },
  emerald: { eyebrow: 'text-bh-success', icon: 'bg-bh-success-soft text-bh-success' },
  navy: { eyebrow: 'text-[#16384f]', icon: 'bg-[#071d30]/[0.06] text-[#071d30]' },
} as const;

export type PanelAccent = keyof typeof PANEL_ACCENTS;

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  accent = 'navy',
  eyebrow,
  icon: Icon,
  variant = 'default',
  enterDelayMs,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: PanelAccent | 'default';
  eyebrow?: string;
  icon?: LucideIcon;
  /** Premium navy/gold panel used on forward-looking coverage cards. */
  variant?: 'default' | 'premium';
  enterDelayMs?: number;
}) {
  const theme = PANEL_ACCENTS[accent === 'default' ? 'navy' : accent];
  const premium = variant === 'premium';

  return (
    <section
      className={cn(
        'bh-org-enter relative overflow-hidden',
        premium
          ? 'rounded-2xl border border-[#16384f]/16 bg-white shadow-[0_18px_40px_rgba(7,29,48,0.12)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(7,29,48,0.16)] motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          : 'bh-org-surface',
        'p-5 sm:p-6',
        className,
      )}
      style={
        enterDelayMs != null
          ? { animationDelay: `${enterDelayMs}ms` }
          : undefined
      }
    >
      {premium ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-bh-teal/20 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-orb-drift pointer-events-none absolute -bottom-14 -right-8 h-32 w-32 rounded-full bg-[#e4b334]/18 blur-2xl"
          />
          <span
            aria-hidden
            className="bh-org-topbar-line pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          />
        </>
      ) : null}

      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                premium
                  ? 'bg-[#071d30] text-white shadow-[0_10px_18px_rgba(7,29,48,0.28)]'
                  : theme.icon,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-[0.14em]',
                  premium ? 'text-[#b8891f]' : theme.eyebrow,
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              className={cn(
                'mt-0.5 leading-tight tracking-tight text-[#071d30]',
                premium
                  ? 'text-[16px] font-bold sm:text-[17px]'
                  : 'text-[16px] font-semibold',
              )}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-[13px] text-bh-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
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
      tone: 'bg-bh-honey-soft text-bh-honey-strong',
      bar: 'bg-bh-honey',
    };
  }
  if (s.includes('draft') || s.includes('setup') || s.includes('pending')) {
    return {
      icon: FileEdit,
      tone: 'bg-bh-accent-blue-soft text-bh-accent-blue',
      bar: 'bg-bh-accent-blue',
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
  timeZone,
  initialNowIso,
}: {
  items: AttentionItem[];
  slug: string;
  canManageShifts?: boolean;
  canReviewTimesheets?: boolean;
  canManageLocations?: boolean;
  timeZone?: string;
  initialNowIso?: string;
}) {
  if (items.length === 0) {
    const shortcuts = [
      canReviewTimesheets && {
        href: `/org/${slug}/timesheets`,
        label: 'Timesheets',
        icon: ClipboardList,
      },
      canManageShifts && {
        href: `/org/${slug}/shifts?status=draft`,
        label: 'Drafts',
        icon: FileEdit,
      },
      canManageLocations && {
        href: `/org/${slug}/locations`,
        label: 'Locations',
        icon: Sparkles,
      },
    ].filter(Boolean) as Array<{ href: string; label: string; icon: LucideIcon }>;

    return (
      <div>
        <AllClearStatus
          timeZone={timeZone || 'Europe/Nicosia'}
          initialNowIso={initialNowIso || new Date().toISOString()}
        />
        {shortcuts.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {shortcuts.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-bh-success-soft px-3 py-2 text-xs font-semibold text-bh-success transition-colors duration-200 hover:bg-bh-success hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-success"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
                <ArrowRight
                  className="h-3 w-3 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const meta = attentionMeta(item.status);
        const Icon = meta.icon;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group relative flex gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-200 hover:bg-bh-subtle/80"
            >
              <span
                className={cn('absolute inset-y-2 left-0 w-[3px] rounded-full', meta.bar)}
                aria-hidden
              />
              <span
                className={cn(
                  'ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
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
                  <span className="shrink-0 rounded-full bg-bh-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bh-text-secondary">
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
