import { describe, expect, test } from '@jest/globals';
import { localInputToIsoWithTimezone } from '../format';

describe('localInputToIsoWithTimezone', () => {
  describe('Europe/Nicosia conversions', () => {
    test('summer time (EEST UTC+3): 2024-07-15T10:00 → 2024-07-15T07:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-07-15T10:00', 'Europe/Nicosia');
      expect(result).toBe('2024-07-15T07:00:00.000Z');
    });

    test('winter time (EET UTC+2): 2024-12-15T10:00 → 2024-12-15T08:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-12-15T10:00', 'Europe/Nicosia');
      expect(result).toBe('2024-12-15T08:00:00.000Z');
    });

    test('acceptance deadline conversion: 2024-07-14T23:59 → 2024-07-14T20:59:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-07-14T23:59', 'Europe/Nicosia');
      expect(result).toBe('2024-07-14T20:59:00.000Z');
    });

    test('early morning shift start: 2024-07-15T06:00 → 2024-07-15T03:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-07-15T06:00', 'Europe/Nicosia');
      expect(result).toBe('2024-07-15T03:00:00.000Z');
    });

    test('late night shift end: 2024-07-15T23:00 → 2024-07-15T20:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-07-15T23:00', 'Europe/Nicosia');
      expect(result).toBe('2024-07-15T20:00:00.000Z');
    });
  });

  describe('DST transitions', () => {
    test('before spring forward (still EET): 2024-03-30T01:00 → 2024-03-29T23:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-03-30T01:00', 'Europe/Nicosia');
      expect(result).toBe('2024-03-29T23:00:00.000Z');
    });

    test('after spring forward (EEST): 2024-03-31T04:00 → 2024-03-31T01:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-03-31T04:00', 'Europe/Nicosia');
      expect(result).toBe('2024-03-31T01:00:00.000Z');
    });

    test('nonexistent time during spring forward should be rejected', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-03-31T03:30', 'Europe/Nicosia');
      }).toThrow(/does not exist or is ambiguous/);
    });

    test('after fall back (EET): 2024-10-27T05:00 → 2024-10-27T03:00:00.000Z', () => {
      const result = localInputToIsoWithTimezone('2024-10-27T05:00', 'Europe/Nicosia');
      expect(result).toBe('2024-10-27T03:00:00.000Z');
    });
  });

  describe('error handling', () => {
    test('rejects invalid IANA timezone', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-07-15T10:00', 'Invalid/Timezone');
      }).toThrow(/Invalid timezone/);
    });

    test('rejects invalid datetime format (missing T)', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-07-15 10:00', 'Europe/Nicosia');
      }).toThrow(/Invalid datetime format/);
    });

    test('rejects invalid datetime format (with seconds)', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-07-15T10:00:00', 'Europe/Nicosia');
      }).toThrow(/Invalid datetime format/);
    });

    test('rejects invalid date values (month 13)', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-13-15T10:00', 'Europe/Nicosia');
      }).toThrow(/Invalid date or time values/);
    });

    test('rejects invalid date values (day 32)', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-07-32T10:00', 'Europe/Nicosia');
      }).toThrow(/Invalid date or time values/);
    });

    test('rejects invalid time values (hour 25)', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-07-15T25:00', 'Europe/Nicosia');
      }).toThrow(/Invalid date or time values/);
    });

    test('rejects empty datetime string', () => {
      expect(() => {
        localInputToIsoWithTimezone('', 'Europe/Nicosia');
      }).toThrow(/Local datetime string is required/);
    });

    test('rejects empty timezone', () => {
      expect(() => {
        localInputToIsoWithTimezone('2024-07-15T10:00', '');
      }).toThrow(/Timezone is required/);
    });
  });

  describe('timezone independence', () => {
    test('result is identical regardless of process.env.TZ (UTC)', () => {
      const originalTZ = process.env.TZ;
      process.env.TZ = 'UTC';
      const result = localInputToIsoWithTimezone('2024-07-15T10:00', 'Europe/Nicosia');
      process.env.TZ = originalTZ;
      expect(result).toBe('2024-07-15T07:00:00.000Z');
    });

    test('result is identical regardless of process.env.TZ (America/New_York)', () => {
      const originalTZ = process.env.TZ;
      process.env.TZ = 'America/New_York';
      const result = localInputToIsoWithTimezone('2024-07-15T10:00', 'Europe/Nicosia');
      process.env.TZ = originalTZ;
      expect(result).toBe('2024-07-15T07:00:00.000Z');
    });

    test('result is identical regardless of process.env.TZ (Asia/Tokyo)', () => {
      const originalTZ = process.env.TZ;
      process.env.TZ = 'Asia/Tokyo';
      const result = localInputToIsoWithTimezone('2024-07-15T10:00', 'Europe/Nicosia');
      process.env.TZ = originalTZ;
      expect(result).toBe('2024-07-15T07:00:00.000Z');
    });
  });

  describe('other timezones', () => {
    test('America/New_York summer (EDT UTC-4)', () => {
      const result = localInputToIsoWithTimezone('2024-07-15T10:00', 'America/New_York');
      expect(result).toBe('2024-07-15T14:00:00.000Z');
    });

    test('America/New_York winter (EST UTC-5)', () => {
      const result = localInputToIsoWithTimezone('2024-12-15T10:00', 'America/New_York');
      expect(result).toBe('2024-12-15T15:00:00.000Z');
    });

    test('UTC (no offset)', () => {
      const result = localInputToIsoWithTimezone('2024-07-15T10:00', 'UTC');
      expect(result).toBe('2024-07-15T10:00:00.000Z');
    });
  });
});
