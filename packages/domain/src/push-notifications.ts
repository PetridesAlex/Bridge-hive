import { openPositionsLabel } from './shift-positions';
import {
  WORKER_ROLE_LABELS,
  WORKER_ROLE_LABELS_EL,
  isWorkerRole,
  type WorkerRole,
} from './types';

/** Internal route opened when a worker taps a shift-published notification. */
export const SHIFT_PUBLISHED_PUSH_TYPE = 'shift_published' as const;
export const SHIFT_PUBLISHED_BATCH_PUSH_TYPE = 'shift_published_batch' as const;
export const SHIFT_CANCELLED_PUSH_TYPE = 'shift_cancelled' as const;
export const ASSIGNMENT_CANCELLED_PUSH_TYPE = 'assignment_cancelled' as const;
export const ORG_WORKER_MESSAGE_PUSH_TYPE = 'org_worker_message' as const;

export type PushLocale = 'en' | 'el';

export const SHIFT_UNAVAILABLE_TITLE = 'This shift is no longer available.';
export const SHIFT_UNAVAILABLE_TITLE_EL = 'Αυτή η βάρδια δεν είναι πλέον διαθέσιμη.';

const SHIFT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BATCH_SHIFTS_URL = 'bridgehive://shifts?filter=new';
const BATCH_SHIFTS_PATH = '/shifts?filter=new';

export type ShiftPublishedPushData = {
  type: typeof SHIFT_PUBLISHED_PUSH_TYPE;
  shiftId: string;
  url: string;
};

export type ShiftPublishedBatchPushData = {
  type: typeof SHIFT_PUBLISHED_BATCH_PUSH_TYPE;
  batchId: string;
  url: string;
};

export type ShiftCancelledPushData = {
  type: typeof SHIFT_CANCELLED_PUSH_TYPE;
  shiftId: string;
  url: string;
};

export type AssignmentCancelledPushData = {
  type: typeof ASSIGNMENT_CANCELLED_PUSH_TYPE;
  shiftId: string;
  assignmentId: string;
  url: string;
};

export type OrgWorkerMessagePushData = {
  type: typeof ORG_WORKER_MESSAGE_PUSH_TYPE;
  conversationId: string;
  url: string;
};

export type WorkerPushData =
  | ShiftPublishedPushData
  | ShiftPublishedBatchPushData
  | ShiftCancelledPushData
  | AssignmentCancelledPushData
  | OrgWorkerMessagePushData;

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
  locale?: PushLocale | null;
};

export type ShiftPublishedBatchMessageInput = {
  batchId: string;
  shiftCount: number;
  locale?: PushLocale | null;
};

export type ShiftCancelledMessageInput = {
  shiftId: string;
  organizationName?: string | null;
  locale?: PushLocale | null;
};

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_EL = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

export function normalizePushLocale(value: unknown): PushLocale {
  return value === 'el' ? 'el' : 'en';
}

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

export function batchShiftsNotificationUrl(): string {
  return BATCH_SHIFTS_URL;
}

export function batchShiftsNotificationPath(): string {
  return BATCH_SHIFTS_PATH;
}

export function messageNotificationUrl(conversationId: string): string | null {
  if (!isShiftUuid(conversationId)) return null;
  return `bridgehive://messages/${conversationId.toLowerCase()}`;
}

export function messageNotificationPath(conversationId: string): string | null {
  if (!isShiftUuid(conversationId)) return null;
  return `/messages/${conversationId.toLowerCase()}`;
}

/**
 * Accept only internal BridgeHive routes. Query strings only for the batch list
 * filter. Other schemes and arbitrary URLs are rejected.
 */
export function shiftRouteFromPushData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const type = record.type;
  const url = record.url;

  if (type === SHIFT_PUBLISHED_BATCH_PUSH_TYPE) {
    if (typeof url !== 'string' || url !== BATCH_SHIFTS_URL) return null;
    const batchId = record.batchId;
    if (typeof batchId !== 'string' || !isShiftUuid(batchId)) return null;
    return BATCH_SHIFTS_PATH;
  }

  if (
    type !== SHIFT_PUBLISHED_PUSH_TYPE &&
    type !== SHIFT_CANCELLED_PUSH_TYPE &&
    type !== ASSIGNMENT_CANCELLED_PUSH_TYPE
  ) {
    return null;
  }

  const shiftId = record.shiftId;
  if (typeof shiftId !== 'string' || typeof url !== 'string') return null;
  const expectedUrl = shiftNotificationUrl(shiftId);
  const path = shiftNotificationPath(shiftId);
  if (!expectedUrl || !path || url !== expectedUrl) return null;

  if (type === ASSIGNMENT_CANCELLED_PUSH_TYPE) {
    const assignmentId = record.assignmentId;
    if (typeof assignmentId !== 'string' || !isShiftUuid(assignmentId)) return null;
  }

  return path;
}

/** Secure deep link for org→worker chat push taps. */
export function messageRouteFromPushData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.type !== ORG_WORKER_MESSAGE_PUSH_TYPE) return null;
  const conversationId = record.conversationId;
  const url = record.url;
  if (typeof conversationId !== 'string' || typeof url !== 'string') return null;
  const expectedUrl = messageNotificationUrl(conversationId);
  const path = messageNotificationPath(conversationId);
  if (!expectedUrl || !path || url !== expectedUrl) return null;
  return path;
}

/** Shift or message deep link from a notification payload. */
export function appRouteFromPushData(data: unknown): string | null {
  return messageRouteFromPushData(data) ?? shiftRouteFromPushData(data);
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

export function shiftPublishedBatchPushData(batchId: string): ShiftPublishedBatchPushData | null {
  if (!isShiftUuid(batchId)) return null;
  return {
    type: SHIFT_PUBLISHED_BATCH_PUSH_TYPE,
    batchId: batchId.toLowerCase(),
    url: BATCH_SHIFTS_URL,
  };
}

export function assertSafeShiftPushData(data: Record<string, unknown>): WorkerPushData {
  if (data.type === ORG_WORKER_MESSAGE_PUSH_TYPE) {
    const route = messageRouteFromPushData(data);
    if (!route) throw new Error('PUSH_DATA_ROUTE');
    return {
      type: ORG_WORKER_MESSAGE_PUSH_TYPE,
      conversationId: String(data.conversationId).toLowerCase(),
      url: String(data.url),
    };
  }

  const route = shiftRouteFromPushData(data);
  if (!route) throw new Error('PUSH_DATA_ROUTE');

  if (data.type === SHIFT_PUBLISHED_BATCH_PUSH_TYPE) {
    return {
      type: SHIFT_PUBLISHED_BATCH_PUSH_TYPE,
      batchId: String(data.batchId).toLowerCase(),
      url: BATCH_SHIFTS_URL,
    };
  }

  if (data.type === SHIFT_CANCELLED_PUSH_TYPE) {
    return {
      type: SHIFT_CANCELLED_PUSH_TYPE,
      shiftId: String(data.shiftId).toLowerCase(),
      url: String(data.url),
    };
  }

  if (data.type === ASSIGNMENT_CANCELLED_PUSH_TYPE) {
    return {
      type: ASSIGNMENT_CANCELLED_PUSH_TYPE,
      shiftId: String(data.shiftId).toLowerCase(),
      assignmentId: String(data.assignmentId).toLowerCase(),
      url: String(data.url),
    };
  }

  const keys = Object.keys(data).sort();
  const expected = ['shiftId', 'type', 'url'];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error('PUSH_DATA_KEYS');
  }
  return {
    type: SHIFT_PUBLISHED_PUSH_TYPE,
    shiftId: String(data.shiftId).toLowerCase(),
    url: String(data.url),
  };
}

export type OrgWorkerMessagePushInput = {
  conversationId: string;
  organizationName?: string | null;
  locale?: PushLocale | null;
};

/**
 * Generic lock-screen copy for org→worker chat.
 * Title only identifies the organization; body never includes message text.
 */
export function buildOrgWorkerMessageNotification(
  input: OrgWorkerMessagePushInput,
): { title: string; body: string; data: OrgWorkerMessagePushData } | null {
  const locale = normalizePushLocale(input.locale);
  const url = messageNotificationUrl(input.conversationId);
  if (!url) return null;
  const org =
    (input.organizationName ?? '').trim() ||
    (locale === 'el' ? 'Οργανισμός' : 'Organization');
  return {
    title:
      locale === 'el' ? `Νέο μήνυμα από ${org}` : `New message from ${org}`,
    body:
      locale === 'el'
        ? 'Ανοίξτε το BridgeHive για να το διαβάσετε.'
        : 'Open BridgeHive to read it.',
    data: {
      type: ORG_WORKER_MESSAGE_PUSH_TYPE,
      conversationId: input.conversationId.toLowerCase(),
      url,
    },
  };
}

export function formatShiftHourlyRate(
  rateMinor: number,
  currency = 'EUR',
  locale: PushLocale = 'en',
): string {
  const minor = Math.trunc(rateMinor);
  if (!Number.isFinite(minor) || minor <= 0) return '';
  const whole = Math.trunc(minor / 100);
  const cents = Math.abs(minor % 100);
  const amount =
    cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`.replace(/0+$/, '');
  if (currency.toUpperCase() === 'EUR') {
    return locale === 'el' ? `€${amount}/ώρα` : `€${amount}/hour`;
  }
  return `${amount} ${currency.toUpperCase()}/${locale === 'el' ? 'ώρα' : 'hour'}`;
}

function openPositionsLabelLocalized(count: number, locale: PushLocale): string {
  if (locale === 'el') {
    return count === 1 ? '1 θέση ανοιχτή' : `${count} θέσεις ανοιχτές`;
  }
  return openPositionsLabel(count);
}

function partsInTimeZone(
  iso: string,
  timeZone: string,
  locale: PushLocale,
): { day: string; time: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-GB', {
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
    const months = locale === 'el' ? MONTHS_EL : MONTHS_EN;
    const monthIndex = MONTHS_EN.findIndex((name) => name.toLowerCase() === month.toLowerCase());
    const monthLabel =
      monthIndex >= 0
        ? months[monthIndex]
        : months.find((name) => name.toLowerCase() === month.toLowerCase()) ?? month;
    return { day: `${Number(day)} ${monthLabel}`, time: `${hour}:${minute}` };
  } catch {
    return null;
  }
}

export function roleLabelForShift(role: string, locale: PushLocale = 'en'): string | null {
  if (!isWorkerRole(role)) return null;
  return locale === 'el'
    ? WORKER_ROLE_LABELS_EL[role as WorkerRole]
    : WORKER_ROLE_LABELS[role as WorkerRole];
}

/**
 * Lock-screen copy for a newly published shift.
 * Returns null when the shift should not be described as available.
 */
export function buildShiftPublishedNotification(
  input: ShiftPublishedMessageInput,
): { title: string; body: string; data: ShiftPublishedPushData } | null {
  const locale = normalizePushLocale(input.locale);
  const openPositions = Math.trunc(input.openPositions);
  if (input.status && input.status !== 'published') return null;
  if (openPositions < 1) return null;
  const roleLabel = roleLabelForShift(input.requiredRole, locale);
  const data = shiftPublishedPushData(input.shiftId);
  if (!roleLabel || !data) return null;

  const timeZone = input.timeZone?.trim() || 'Europe/Nicosia';
  const start =
    partsInTimeZone(input.startsAt, timeZone, locale) ??
    partsInTimeZone(input.startsAt, 'Europe/Nicosia', locale);
  const end =
    partsInTimeZone(input.endsAt, timeZone, locale) ??
    partsInTimeZone(input.endsAt, 'Europe/Nicosia', locale);
  if (!start || !end) return null;

  const place = input.place.trim();
  const rate = formatShiftHourlyRate(input.rateMinor, input.currency ?? 'EUR', locale);
  if (!place || !rate) return null;

  const body = [
    start.day,
    `${start.time}–${end.time}`,
    place,
    openPositionsLabelLocalized(openPositions, locale),
    rate,
  ].join(' · ');

  return {
    title: locale === 'el' ? `Νέα βάρδια ${roleLabel}` : `New ${roleLabel} shift`,
    body,
    data,
  };
}

export function buildShiftPublishedBatchNotification(
  input: ShiftPublishedBatchMessageInput,
): { title: string; body: string; data: ShiftPublishedBatchPushData } | null {
  const locale = normalizePushLocale(input.locale);
  const count = Math.trunc(input.shiftCount);
  if (count < 2) return null;
  const data = shiftPublishedBatchPushData(input.batchId);
  if (!data) return null;
  return {
    title: locale === 'el' ? 'Νέες βάρδιες διαθέσιμες' : 'New shifts available',
    body:
      locale === 'el'
        ? `${count} νέες βάρδιες ταιριάζουν με τον ρόλο σας`
        : `${count} new shifts match your role`,
    data,
  };
}

export function buildShiftCancelledNotification(
  input: ShiftCancelledMessageInput,
): { title: string; body: string; data: ShiftCancelledPushData } | null {
  const locale = normalizePushLocale(input.locale);
  const url = shiftNotificationUrl(input.shiftId);
  if (!url) return null;
  const org = (input.organizationName ?? '').trim() || (locale === 'el' ? 'Οργανισμός' : 'Organization');
  return {
    title: locale === 'el' ? 'Η βάρδια ακυρώθηκε' : 'Shift cancelled',
    body:
      locale === 'el'
        ? `Η βάρδια στο ${org} ακυρώθηκε.`
        : `Your shift at ${org} was cancelled.`,
    data: {
      type: SHIFT_CANCELLED_PUSH_TYPE,
      shiftId: input.shiftId.toLowerCase(),
      url,
    },
  };
}

export function buildAssignmentCancelledNotification(
  input: ShiftCancelledMessageInput & { assignmentId: string },
): { title: string; body: string; data: AssignmentCancelledPushData } | null {
  const locale = normalizePushLocale(input.locale);
  const url = shiftNotificationUrl(input.shiftId);
  if (!url || !isShiftUuid(input.assignmentId)) return null;
  return {
    title: locale === 'el' ? 'Η ανάθεση ακυρώθηκε' : 'Assignment cancelled',
    body:
      locale === 'el'
        ? 'Η βάρδιά σας αφαιρέθηκε από το πρόγραμμά σας.'
        : 'Your shift was removed from your schedule.',
    data: {
      type: ASSIGNMENT_CANCELLED_PUSH_TYPE,
      shiftId: input.shiftId.toLowerCase(),
      assignmentId: input.assignmentId.toLowerCase(),
      url,
    },
  };
}

/** Calendar event title after a successful claim. */
export function calendarShiftTitle(organizationName: string, locale: PushLocale = 'en'): string {
  const org = organizationName.trim() || (locale === 'el' ? 'Οργανισμός' : 'Organization');
  return locale === 'el' ? `BridgeHive βάρδια — ${org}` : `BridgeHive shift — ${org}`;
}

export const CALENDAR_EVENT_MARKER_PREFIX = 'bridgehive:assignment:';

export function calendarAssignmentMarker(assignmentId: string): string {
  return `${CALENDAR_EVENT_MARKER_PREFIX}${assignmentId.toLowerCase()}`;
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
