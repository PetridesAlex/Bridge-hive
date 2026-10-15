import { openPositionsLabel } from './shift-positions';
import { WORKER_ROLE_LABELS, isWorkerRole, type WorkerRole } from './types';

/** Internal route opened when a worker taps a shift-published notification. */
export const SHIFT_PUBLISHED_PUSH_TYPE = 'shift_published' as const;

export const SHIFT_UNAVAILABLE_TITLE = 'This shift is no longer available.';

const SHIFT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PUSH_DATA_KEYS = ['type', 'shiftId', 'url'] as const;

export type ShiftPublishedPushData = {
  type: typeof SHIFT_PUBLISHED_PUSH_TYPE;
  shiftId: string;
  url: string;
};

export type ShiftPublishedMessageInput = {
  shiftId: string;
  requiredRole: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  place: string;
  openPositions: number;
  rateMinor: number;
  currency?: string | null;
  status?: string | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isShiftUuid(value: string): boolean {
  return SHIFT_ID_RE.test(value);
}

export function shiftNotificationUrl(shiftId: string): string | null {
  if (!isShiftUuid(shiftId)) return null;
  return `bridgehive://shifts/${shiftId.toLowerCase()}`;
}

export function shiftNotificationPath(shiftId: string): string | null {
  if (!isShiftUuid(shiftId)) return null;
  return `/shifts/${shiftId.toLowerCase()}`;
}

/**
 * Accept only the internal shift route. Query strings, fragments, and other
 * schemes are rejected so a payload cannot carry a recovery or auth token.
 */
export function shiftRouteFromPushData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.type !== SHIFT_PUBLISHED_PUSH_TYPE) return null;
  const shiftId = record.shiftId;
  const url = record.url;
  if (typeof shiftId !== 'string' || typeof url !== 'string') return null;
  const expectedUrl = shiftNotificationUrl(shiftId);
  const path = shiftNotificationPath(shiftId);
  if (!expectedUrl || !path || url !== expectedUrl) return null;
  return path;
}

export function shiftPublishedPushData(shiftId: string): ShiftPublishedPushData | null {
  const url = shiftNotificationUrl(shiftId);
  if (!url) return null;
  return {
    type: SHIFT_PUBLISHED_PUSH_TYPE,
    shiftId: shiftId.toLowerCase(),
    url,
  };
}

export function assertSafeShiftPushData(data: Record<string, unknown>): ShiftPublishedPushData {
  const keys = Object.keys(data).sort();
  const expected = [...PUSH_DATA_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error('PUSH_DATA_KEYS');
  }
  const route = shiftRouteFromPushData(data);
  if (!route || data.type !== SHIFT_PUBLISHED_PUSH_TYPE) {
    throw new Error('PUSH_DATA_ROUTE');
  }
  return {
    type: SHIFT_PUBLISHED_PUSH_TYPE,
    shiftId: String(data.shiftId).toLowerCase(),
    url: String(data.url),
  };
}

export function formatShiftHourlyRate(rateMinor: number, currency = 'EUR'): string {
  const minor = Math.trunc(rateMinor);
  if (!Number.isFinite(minor) || minor <= 0) return '';
  const whole = Math.trunc(minor / 100);
  const cents = Math.abs(minor % 100);
  const amount =
    cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`.replace(/0+$/, '');
  if (currency.toUpperCase() === 'EUR') return `€${amount}/hour`;
  return `${amount} ${currency.toUpperCase()}/hour`;
}

function partsInTimeZone(iso: string, timeZone: string): { day: string; time: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find((part) => part.type === 'day')?.value;
    const month = parts.find((part) => part.type === 'month')?.value?.replace(/\./g, '');
    const hour = parts.find((part) => part.type === 'hour')?.value;
    const minute = parts.find((part) => part.type === 'minute')?.value;
    if (!day || !month || !hour || !minute) return null;
    const monthIndex = MONTHS.findIndex((name) => name.toLowerCase() === month.toLowerCase());
    const monthLabel = monthIndex >= 0 ? MONTHS[monthIndex] : month;
    return { day: `${Number(day)} ${monthLabel}`, time: `${hour}:${minute}` };
  } catch {
    return null;
  }
}

export function roleLabelForShift(role: string): string | null {
  if (!isWorkerRole(role)) return null;
  return WORKER_ROLE_LABELS[role as WorkerRole];
}

/**
 * Lock-screen copy for a newly published shift.
 * Returns null when the shift should not be described as available.
 */
export function buildShiftPublishedNotification(
  input: ShiftPublishedMessageInput,
): { title: string; body: string; data: ShiftPublishedPushData } | null {
  const openPositions = Math.trunc(input.openPositions);
  if (input.status && input.status !== 'published') return null;
  if (openPositions < 1) return null;
  const roleLabel = roleLabelForShift(input.requiredRole);
  const data = shiftPublishedPushData(input.shiftId);
  if (!roleLabel || !data) return null;

  const timeZone = input.timeZone?.trim() || 'Europe/Nicosia';
  const start = partsInTimeZone(input.startsAt, timeZone) ?? partsInTimeZone(input.startsAt, 'Europe/Nicosia');
  const end = partsInTimeZone(input.endsAt, timeZone) ?? partsInTimeZone(input.endsAt, 'Europe/Nicosia');
  if (!start || !end) return null;

  const place = input.place.trim();
  const rate = formatShiftHourlyRate(input.rateMinor, input.currency ?? 'EUR');
  if (!place || !rate) return null;

  const body = [
    start.day,
    `${start.time}–${end.time}`,
    place,
    openPositionsLabel(openPositions),
    rate,
  ].join(' · ');

  return {
    title: `New ${roleLabel} shift`,
    body,
    data,
  };
}

export function pushRetryDelaySeconds(attempts: number): number {
  const n = Math.min(12, Math.max(1, Math.trunc(attempts)));
  return Math.min(3600, 2 ** n);
}

const SENSITIVE_LOG_KEYS = new Set([
  'token',
  'expo_push_token',
  'expopushtoken',
  'email',
  'phone',
  'notes',
  'authorization',
  'service_role',
  'password',
]);

/** Drop fields that must never appear in push logs. */
export function sanitizePushLogFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_LOG_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === 'string' && /Expo(nent)?PushToken\[/i.test(value)) continue;
    if (typeof value === 'string' && value.includes('@')) continue;
    safe[key] = value;
  }
  return safe;
}

export function shouldRequestNotificationPermissionOnMount(): false {
  return false;
}

export type OsNotificationPermission = 'granted' | 'denied' | 'undetermined';

export function notificationEnableAction(
  status: OsNotificationPermission,
): 'request' | 'settings' | 'none' {
  if (status === 'denied') return 'settings';
  if (status === 'granted') return 'none';
  return 'request';
}

export function shouldShowNotificationExplainer(params: {
  verified: boolean;
  permission: OsNotificationPermission;
  dismissed: boolean;
}): boolean {
  return params.verified && params.permission === 'undetermined' && !params.dismissed;
}
