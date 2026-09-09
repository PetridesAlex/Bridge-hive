import { formatMoneyMinor } from '@bridge-hive/domain';

import { APP_CONFIG } from '@/constants/config';

const TZ = APP_CONFIG.timezone;
const LOCALE = APP_CONFIG.locale;

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

/** Format integer minor units (cents) using shared domain helper. */
export function formatMoney(amountMinor: number, currency: string = APP_CONFIG.currency): string {
  return formatMoneyMinor(amountMinor, currency);
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

export function formatTime(value: string | Date): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(toDate(value));
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

export function formatDurationMinutes(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
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

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

export function isNightShift(startsAt: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: 'numeric',
      hour12: false,
    }).format(toDate(startsAt)),
  );
  return hour >= 18 || hour < 6;
}

export function isoDateFromTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(toDate(value));
}

/** Worker-facing payout status labels. Never treat reported_paid as Paid. */
export function payoutDisplayStatus(
  status: string,
): 'processing' | 'paid' | 'issue' {
  if (status === 'reconciled') return 'paid';
  if (
    status === 'overdue' ||
    status === 'disputed' ||
    status === 'failed' ||
    status === 'cancelled'
  ) {
    return 'issue';
  }
  return 'processing';
}

/** Mask an IBAN for display/storage. Never log or render full IBAN. */
export function maskIban(iban: string): string {
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length < 8) return '••••';
  const country = cleaned.slice(0, 2);
  const last4 = cleaned.slice(-4);
  return `${country}••••${last4}`;
}
