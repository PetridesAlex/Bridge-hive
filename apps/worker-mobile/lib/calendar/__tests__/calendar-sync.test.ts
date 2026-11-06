import {
  calendarAssignmentMarker,
  calendarShiftTitle,
  buildShiftPublishedNotification,
} from '@bridge-hive/domain';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { scheduleVersion } from '../mapping';

const root = path.join(__dirname, '../../..');

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('calendar sync policy', () => {
  it('defaults sync off and only writes after claim success paths', () => {
    const mapping = source('lib/calendar/mapping.ts');
    const sync = source('lib/calendar/sync.ts');
    const detail = source('app/(tabs)/shifts/[id].tsx');
    const prefs = source('app/(tabs)/profile/notification-preferences.tsx');

    expect(mapping).toContain("value === '1'");
    expect(sync).toContain('getCalendarSyncEnabled');
    expect(sync).toContain('requestCalendarPermissionsAsync');
    expect(sync).not.toContain('getRemindersPermissionsAsync');
    expect(sync).not.toContain('requestRemindersPermissionsAsync');
    expect(detail).toContain('writeAcceptedShiftToCalendar');
    expect(detail).toContain('await claimShift');
    expect(detail.indexOf('await claimShift')).toBeLessThan(
      detail.indexOf('writeAcceptedShiftToCalendar('),
    );
    expect(prefs).toContain('setCalendarSyncEnabled');
  });

  it('uses BridgeHive title and assignment marker without banking data', () => {
    expect(calendarShiftTitle('Nicosia Clinic', 'en')).toBe(
      'BridgeHive shift — Nicosia Clinic',
    );
    expect(calendarShiftTitle('Κλινική', 'el')).toContain('BridgeHive');
    const marker = calendarAssignmentMarker('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(marker).toBe('bridgehive:assignment:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(JSON.stringify({ marker, title: calendarShiftTitle('Org') })).not.toContain('IBAN');
  });

  it('versions schedule from starts/ends for overnight updates', () => {
    const starts = '2026-10-23T16:00:00.000Z';
    const ends = '2026-10-24T04:30:00.000Z';
    expect(scheduleVersion(starts, ends)).toBe(`${starts}|${ends}`);
    const message = buildShiftPublishedNotification({
      shiftId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      requiredRole: 'registered_nurse',
      startsAt: starts,
      endsAt: ends,
      timeZone: 'Europe/Nicosia',
      place: 'Ward A',
      openPositions: 2,
      rateMinor: 2000,
      status: 'published',
      locale: 'en',
    });
    expect(message?.body).toContain('19:00–07:30');
  });

  it('keeps claim success even when calendar write is attempted separately', () => {
    const detail = source('app/(tabs)/shifts/[id].tsx');
    expect(detail).toContain('if (result.error)');
    expect(detail).toContain('writeAcceptedShiftToCalendar');
    // Calendar work happens only after a successful claim result.
    const claimIdx = detail.indexOf('const result = await claimShift(id)');
    const writeIdx = detail.indexOf('writeAcceptedShiftToCalendar(calInput)');
    expect(claimIdx).toBeGreaterThan(-1);
    expect(writeIdx).toBeGreaterThan(claimIdx);
  });
});
