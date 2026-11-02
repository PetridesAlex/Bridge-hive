import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarEventMapping = {
  calendarId: string;
  eventId: string;
  scheduleVersion: string;
  updatedAt: string;
};

const PREFIX = 'bridgehive.calendar.mapping.v1';

function key(workerId: string, assignmentId: string): string {
  return `${PREFIX}:${workerId}:${assignmentId.toLowerCase()}`;
}

function preferenceKey(workerId: string): string {
  return `bridgehive.calendar.syncEnabled.v1:${workerId}`;
}

function calendarIdKey(workerId: string): string {
  return `bridgehive.calendar.selectedId.v1:${workerId}`;
}

function promptKey(workerId: string): string {
  return `bridgehive.calendar.promptSeen.v1:${workerId}`;
}

export async function getCalendarSyncEnabled(workerId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(preferenceKey(workerId));
  return value === '1';
}

export async function setCalendarSyncEnabled(workerId: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(preferenceKey(workerId), enabled ? '1' : '0');
}

export async function getSelectedCalendarId(workerId: string): Promise<string | null> {
  return AsyncStorage.getItem(calendarIdKey(workerId));
}

export async function setSelectedCalendarId(workerId: string, calendarId: string): Promise<void> {
  await AsyncStorage.setItem(calendarIdKey(workerId), calendarId);
}

export async function getCalendarPromptSeen(workerId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(promptKey(workerId))) === '1';
}

export async function setCalendarPromptSeen(workerId: string): Promise<void> {
  await AsyncStorage.setItem(promptKey(workerId), '1');
}

export async function getAssignmentCalendarMapping(
  workerId: string,
  assignmentId: string,
): Promise<CalendarEventMapping | null> {
  const raw = await AsyncStorage.getItem(key(workerId, assignmentId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CalendarEventMapping;
    if (
      typeof parsed.calendarId === 'string' &&
      typeof parsed.eventId === 'string' &&
      typeof parsed.scheduleVersion === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function setAssignmentCalendarMapping(
  workerId: string,
  assignmentId: string,
  mapping: CalendarEventMapping,
): Promise<void> {
  await AsyncStorage.setItem(key(workerId, assignmentId), JSON.stringify(mapping));
}

export async function removeAssignmentCalendarMapping(
  workerId: string,
  assignmentId: string,
): Promise<void> {
  await AsyncStorage.removeItem(key(workerId, assignmentId));
}

export async function listAssignmentCalendarMappings(
  workerId: string,
): Promise<Array<{ assignmentId: string; mapping: CalendarEventMapping }>> {
  const prefix = `${PREFIX}:${workerId}:`;
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((item) => item.startsWith(prefix));
  if (ours.length === 0) return [];
  const pairs = await AsyncStorage.multiGet(ours);
  const out: Array<{ assignmentId: string; mapping: CalendarEventMapping }> = [];
  for (const [storageKey, raw] of pairs) {
    if (!raw) continue;
    try {
      const mapping = JSON.parse(raw) as CalendarEventMapping;
      const assignmentId = storageKey.slice(prefix.length);
      if (assignmentId && mapping?.eventId && mapping?.calendarId) {
        out.push({ assignmentId, mapping });
      }
    } catch {
      // ignore corrupt rows
    }
  }
  return out;
}

export function scheduleVersion(startsAt: string, endsAt: string): string {
  return `${startsAt}|${endsAt}`;
}
