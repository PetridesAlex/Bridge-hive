import { ACTIVE_MARKET } from '@/constants/market';

const TZ = ACTIVE_MARKET.timezone;
const LOCALE = ACTIVE_MARKET.locale;

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

export function formatCurrency(amount: number, currency = ACTIVE_MARKET.currency): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...options,
  }).format(toDate(value));
}

export function formatShortDate(value: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
  })
    .format(toDate(value))
    .toUpperCase();
}

export function formatTime(time: string): string {
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(toDate(time));
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

export function formatDuration(hours: number): string {
  if (hours === 1) return '1 Hour';
  return `${hours} Hours`;
}

export function formatRelativeDate(value: string | Date): string {
  const date = toDate(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return formatShortDate(date);
}

export function formatDayLabel(dateStr: string, reference = new Date()): string {
  const date = parseLocalDate(dateStr);
  const today = startOfDay(reference);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    weekday: 'long',
  }).format(date);
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function greetingForNow(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function isNightShift(startTime: string): boolean {
  const hour = Number(startTime.split(':')[0]);
  return hour >= 18 || hour < 6;
}

export function isoDateOffset(daysFromToday: number, reference = new Date()): string {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
