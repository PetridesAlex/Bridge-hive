import {
  resolveCalendarPeriod,
  shiftCalendarAnchor,
  todayYmdInTimezone,
} from '@/lib/org-calendar-time';

describe('org calendar time helpers', () => {
  const tz = 'Europe/Nicosia';
  // 2026-09-16 Wednesday 12:00 UTC ≈ afternoon Nicosia
  const now = new Date('2026-09-16T12:00:00.000Z');

  it('resolves default week view with Monday start in org timezone', () => {
    const period = resolveCalendarPeriod({
      timeZone: tz,
      viewRaw: undefined,
      dateRaw: undefined,
      now,
    });
    expect(period.view).toBe('week');
    expect(period.dayKeys).toHaveLength(7);
    expect(period.dayKeys[0]).toBe('2026-09-14'); // Monday
    expect(period.dayKeys[6]).toBe('2026-09-20'); // Sunday
    expect(period.dateYmd).toBe('2026-09-14');
  });

  it('falls back invalid params to week and today', () => {
    const period = resolveCalendarPeriod({
      timeZone: tz,
      viewRaw: 'garbage',
      dateRaw: 'not-a-date',
      now,
    });
    expect(period.view).toBe('week');
    expect(period.dateYmd).toBe('2026-09-14');
    expect(todayYmdInTimezone(tz, now)).toBe('2026-09-16');
  });

  it('navigates previous/next/today by view period', () => {
    expect(
      shiftCalendarAnchor({
        timeZone: tz,
        view: 'week',
        dateYmd: '2026-09-14',
        direction: 'next',
      }),
    ).toBe('2026-09-21');
    expect(
      shiftCalendarAnchor({
        timeZone: tz,
        view: 'week',
        dateYmd: '2026-09-14',
        direction: 'prev',
      }),
    ).toBe('2026-09-07');
    expect(
      shiftCalendarAnchor({
        timeZone: tz,
        view: 'day',
        dateYmd: '2026-09-16',
        direction: 'next',
      }),
    ).toBe('2026-09-17');
    expect(
      shiftCalendarAnchor({
        timeZone: tz,
        view: 'month',
        dateYmd: '2026-09-01',
        direction: 'next',
      }),
    ).toBe('2026-10-01');
    expect(
      shiftCalendarAnchor({
        timeZone: tz,
        view: 'week',
        dateYmd: '2026-09-14',
        direction: 'today',
        now,
      }),
    ).toBe('2026-09-16');
  });

  it('builds day and month period bounds in organization timezone', () => {
    const day = resolveCalendarPeriod({
      timeZone: tz,
      viewRaw: 'day',
      dateRaw: '2026-09-18',
      now,
    });
    expect(day.dayKeys).toEqual(['2026-09-18']);
    expect(day.rangeStartIso < day.rangeEndIso).toBe(true);

    const month = resolveCalendarPeriod({
      timeZone: tz,
      viewRaw: 'month',
      dateRaw: '2026-09-18',
      now,
    });
    expect(month.dateYmd).toBe('2026-09-01');
    expect(month.dayKeys[0]).toBe('2026-09-01');
    expect(month.dayKeys[month.dayKeys.length - 1]).toBe('2026-09-30');
  });
});
