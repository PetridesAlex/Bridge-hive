import {
  calendarAssignmentMarker,
  calendarShiftTitle,
  normalizePushLocale,
  type PushLocale,
} from '@bridge-hive/domain';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import {
  getAssignmentCalendarMapping,
  getCalendarSyncEnabled,
  getSelectedCalendarId,
  listAssignmentCalendarMappings,
  removeAssignmentCalendarMapping,
  scheduleVersion,
  setAssignmentCalendarMapping,
  setSelectedCalendarId,
} from '@/lib/calendar/mapping';

export type CalendarPermission = 'granted' | 'denied' | 'undetermined';

export type ClaimCalendarInput = {
  workerId: string;
  assignmentId: string;
  organizationName: string;
  startsAt: string;
  endsAt: string;
  timeZone?: string | null;
  location?: string | null;
  roleLabel?: string | null;
  locale?: PushLocale | null;
  deepLink?: string | null;
};

function normalizePermission(
  status: Calendar.PermissionStatus | undefined,
): CalendarPermission {
  if (status === Calendar.PermissionStatus.GRANTED) return 'granted';
  if (status === Calendar.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function probeCalendarPermission(): Promise<CalendarPermission> {
  if (Platform.OS === 'web') return 'denied';
  const current = await Calendar.getCalendarPermissionsAsync();
  return normalizePermission(current.status);
}

/** Request calendar access only when enabling sync. Never touches Reminders APIs. */
export async function requestCalendarPermission(): Promise<CalendarPermission> {
  if (Platform.OS === 'web') return 'denied';
  const result = await Calendar.requestCalendarPermissionsAsync();
  return normalizePermission(result.status);
}

async function ensureWritableCalendarId(workerId: string): Promise<string | null> {
  const existing = await getSelectedCalendarId(workerId);
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);

  if (existing && writable.some((calendar) => calendar.id === existing)) {
    return existing;
  }

  const preferred =
    writable.find((calendar) => calendar.isPrimary) ??
    writable.find((calendar) => calendar.accessLevel === Calendar.CalendarAccessLevel.OWNER) ??
    writable[0];

  if (!preferred) return null;
  await setSelectedCalendarId(workerId, preferred.id);
  return preferred.id;
}

function notesForAssignment(input: ClaimCalendarInput, locale: PushLocale): string {
  const marker = calendarAssignmentMarker(input.assignmentId);
  const bits = [
    locale === 'el' ? 'BridgeHive αποδεκτή βάρδια' : 'BridgeHive accepted shift',
    input.roleLabel ? input.roleLabel : null,
    input.deepLink ?? null,
    marker,
  ].filter(Boolean);
  return bits.join('\n');
}

async function findExistingByMarker(
  calendarId: string,
  assignmentId: string,
  startsAt: string,
  endsAt: string,
): Promise<string | null> {
  const marker = calendarAssignmentMarker(assignmentId);
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const windowStart = new Date(start.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(end.getTime() + 12 * 60 * 60 * 1000);
  try {
    const events = await Calendar.getEventsAsync([calendarId], windowStart, windowEnd);
    const match = events.find((event) => (event.notes ?? '').includes(marker));
    return match?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * After a successful claim_shift only. Failures never throw to the claim UI.
 * Returns true when a calendar event was created or updated.
 */
export async function writeAcceptedShiftToCalendar(
  input: ClaimCalendarInput,
): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  try {
    const enabled = await getCalendarSyncEnabled(input.workerId);
    if (!enabled) return { ok: false, reason: 'disabled' };

    const permission = await probeCalendarPermission();
    if (permission !== 'granted') return { ok: false, reason: 'permission' };

    const locale = normalizePushLocale(input.locale);
    const calendarId = await ensureWritableCalendarId(input.workerId);
    if (!calendarId) return { ok: false, reason: 'no_calendar' };

    const version = scheduleVersion(input.startsAt, input.endsAt);
    const existing = await getAssignmentCalendarMapping(input.workerId, input.assignmentId);
    const details = {
      title: calendarShiftTitle(input.organizationName, locale),
      startDate: new Date(input.startsAt),
      endDate: new Date(input.endsAt),
      timeZone: input.timeZone?.trim() || 'Europe/Nicosia',
      location: input.location?.trim() || undefined,
      notes: notesForAssignment(input, locale),
      url: input.deepLink ?? undefined,
    };

    if (Number.isNaN(details.startDate.getTime()) || Number.isNaN(details.endDate.getTime())) {
      return { ok: false, reason: 'invalid_times' };
    }

    if (existing) {
      if (existing.scheduleVersion === version) {
        return { ok: true };
      }
      try {
        await Calendar.updateEventAsync(existing.eventId, details);
        await setAssignmentCalendarMapping(input.workerId, input.assignmentId, {
          ...existing,
          scheduleVersion: version,
          updatedAt: new Date().toISOString(),
        });
        return { ok: true };
      } catch {
        // Fall through to create if the mapped event disappeared.
      }
    }

    const scannedId = await findExistingByMarker(
      calendarId,
      input.assignmentId,
      input.startsAt,
      input.endsAt,
    );
    if (scannedId) {
      await Calendar.updateEventAsync(scannedId, details);
      await setAssignmentCalendarMapping(input.workerId, input.assignmentId, {
        calendarId,
        eventId: scannedId,
        scheduleVersion: version,
        updatedAt: new Date().toISOString(),
      });
      return { ok: true };
    }

    const eventId = await Calendar.createEventAsync(calendarId, details);
    await setAssignmentCalendarMapping(input.workerId, input.assignmentId, {
      calendarId,
      eventId,
      scheduleVersion: version,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'write_failed' };
  }
}

/** Manual one-shot add when sync is off or permission was denied earlier. */
export async function addShiftToCalendarManually(
  input: ClaimCalendarInput,
): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  const permission = await requestCalendarPermission();
  if (permission !== 'granted') return { ok: false, reason: 'permission' };
  // Temporarily treat as enabled for this write path without flipping preference.
  const previous = await getCalendarSyncEnabled(input.workerId);
  try {
    if (!previous) {
      // Direct write without preference change:
      const locale = normalizePushLocale(input.locale);
      const calendarId = await ensureWritableCalendarId(input.workerId);
      if (!calendarId) return { ok: false, reason: 'no_calendar' };
      const eventId = await Calendar.createEventAsync(calendarId, {
        title: calendarShiftTitle(input.organizationName, locale),
        startDate: new Date(input.startsAt),
        endDate: new Date(input.endsAt),
        timeZone: input.timeZone?.trim() || 'Europe/Nicosia',
        location: input.location?.trim() || undefined,
        notes: notesForAssignment(input, locale),
        url: input.deepLink ?? undefined,
      });
      await setAssignmentCalendarMapping(input.workerId, input.assignmentId, {
        calendarId,
        eventId,
        scheduleVersion: scheduleVersion(input.startsAt, input.endsAt),
        updatedAt: new Date().toISOString(),
      });
      return { ok: true };
    }
    return writeAcceptedShiftToCalendar(input);
  } catch {
    return { ok: false, reason: 'write_failed' };
  }
}

export type ReconcileAssignment = {
  assignmentId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  organizationName: string;
  location?: string | null;
  roleLabel?: string | null;
  timeZone?: string | null;
};

/**
 * Update/remove only mapped BridgeHive events. Turning sync OFF does not delete events.
 */
export async function reconcileCalendarAssignments(params: {
  workerId: string;
  assignments: ReconcileAssignment[];
  locale?: PushLocale | null;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  const enabled = await getCalendarSyncEnabled(params.workerId);
  if (!enabled) return;
  const permission = await probeCalendarPermission();
  if (permission !== 'granted') return;

  const byId = new Map(params.assignments.map((item) => [item.assignmentId.toLowerCase(), item]));
  const mappings = await listAssignmentCalendarMappings(params.workerId);

  for (const { assignmentId, mapping } of mappings) {
    const assignment = byId.get(assignmentId.toLowerCase());
    if (!assignment || ['cancelled', 'withdrawn'].includes(assignment.status)) {
      try {
        await Calendar.deleteEventAsync(mapping.eventId);
      } catch {
        // Event may already be gone.
      }
      await removeAssignmentCalendarMapping(params.workerId, assignmentId);
      continue;
    }

    const version = scheduleVersion(assignment.startsAt, assignment.endsAt);
    if (version === mapping.scheduleVersion) continue;

    await writeAcceptedShiftToCalendar({
      workerId: params.workerId,
      assignmentId: assignment.assignmentId,
      organizationName: assignment.organizationName,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      timeZone: assignment.timeZone,
      location: assignment.location,
      roleLabel: assignment.roleLabel,
      locale: params.locale,
      deepLink: `bridgehive://shifts`,
    });
  }
}
