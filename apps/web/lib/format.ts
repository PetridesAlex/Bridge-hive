import { formatMoneyMinor } from '@bridge-hive/domain';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { isValid } from 'date-fns';

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Admin',
  org_scheduler: 'Scheduler',
  org_billing: 'Billing',
  registered_nurse: 'Registered nurse',
  ward_assistant: 'Ward assistant',
};

const SHIFT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  filled: 'Filled',
  in_progress: 'In progress',
  awaiting_approval: 'Awaiting approval',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function shiftStatusLabel(status: string): string {
  return SHIFT_STATUS_LABELS[status] ?? status;
}

export function formatDateTime(iso: string, timeZone = 'Europe/Nicosia'): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(iso));
}

export function formatDateTimeLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

/**
 * Converts a datetime-local input string to ISO 8601 UTC string.
 * 
 * The input represents a wall-clock time in the specified IANA timezone.
 * This function converts it to the corresponding UTC instant.
 * 
 * DST Policy:
 * - Nonexistent local times (during spring-forward) are rejected with an error.
 * - Ambiguous local times (during fall-back) use the library's deterministic behavior:
 *   date-fns-tz interprets ambiguous times using the first occurrence (before DST ends).
 *   For Europe/Nicosia fall-back, 02:30 is interpreted as 02:30 EEST (UTC+3), not EET (UTC+2).
 * 
 * @param localDateTimeString - Format: YYYY-MM-DDTHH:mm (e.g., "2024-07-15T10:00")
 * @param timeZone - IANA timezone (e.g., "Europe/Nicosia")
 * @returns ISO 8601 UTC string (e.g., "2024-07-15T07:00:00.000Z")
 * @throws Error if format is invalid, timezone is invalid, or time is nonexistent/ambiguous
 */
export function localInputToIsoWithTimezone(
  localDateTimeString: string,
  timeZone: string,
): string {
  if (!localDateTimeString) {
    throw new Error('Local datetime string is required');
  }
  if (!timeZone) {
    throw new Error('Timezone is required');
  }

  const datetimeLocalRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
  const match = localDateTimeString.match(datetimeLocalRegex);
  if (!match) {
    throw new Error(
      'Invalid datetime format. Expected YYYY-MM-DDTHH:mm (datetime-local format)',
    );
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const inputYear = parseInt(yearStr, 10);
  const inputMonth = parseInt(monthStr, 10);
  const inputDay = parseInt(dayStr, 10);
  const inputHour = parseInt(hourStr, 10);
  const inputMinute = parseInt(minuteStr, 10);

  if (
    inputMonth < 1 || inputMonth > 12 ||
    inputDay < 1 || inputDay > 31 ||
    inputHour < 0 || inputHour > 23 ||
    inputMinute < 0 || inputMinute > 59
  ) {
    throw new Error('Invalid date or time values');
  }

  const parsedDate = new Date(inputYear, inputMonth - 1, inputDay, inputHour, inputMinute);
  if (!isValid(parsedDate) ||
      parsedDate.getFullYear() !== inputYear ||
      parsedDate.getMonth() !== inputMonth - 1 ||
      parsedDate.getDate() !== inputDay) {
    throw new Error('Invalid date or time values');
  }

  let utcDate: Date;
  try {
    utcDate = fromZonedTime(parsedDate, timeZone);
  } catch {
    throw new Error(`Invalid timezone "${timeZone}"`);
  }

  if (!isValid(utcDate)) {
    throw new Error(`Invalid timezone "${timeZone}"`);
  }

  const roundTripFormatted = formatInTimeZone(
    utcDate,
    timeZone,
    'yyyy-MM-dd HH:mm',
  );
  const expectedFormatted = `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}`;

  if (roundTripFormatted !== expectedFormatted) {
    throw new Error(
      'The specified local time does not exist or is ambiguous due to DST transition. ' +
        'Please choose a time that is unambiguous in the location timezone.',
    );
  }

  return utcDate.toISOString();
}

export function eurosToMinor(euros: string | number): number {
  const n = typeof euros === 'number' ? euros : Number.parseFloat(euros);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function minorToEurosInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function formatRate(rateMinor: number, currency = 'EUR'): string {
  return `${formatMoneyMinor(rateMinor, currency)}/hr`;
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
