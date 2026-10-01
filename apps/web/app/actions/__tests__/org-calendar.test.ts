import {
  buildDashboardQuickActions,
  calendarEventTone,
  coverageLabelForStatus,
  filterCalendarShifts,
  layoutOverlappingEvents,
  mapShiftToCalendarEvent,
  parseCalendarDateParam,
  parseCalendarView,
  relativeDateKind,
  splitCrossMidnightSegments,
} from '@bridge-hive/domain';

describe('org calendar helpers', () => {
  it('defaults invalid view/date params safely', () => {
    expect(parseCalendarView(undefined)).toBe('week');
    expect(parseCalendarView('nope')).toBe('week');
    expect(parseCalendarView('day')).toBe('day');
    expect(parseCalendarDateParam('2026-09-18')).toBe('2026-09-18');
    expect(parseCalendarDateParam('18/09/2026')).toBeNull();
    expect(parseCalendarDateParam('2026-13-40')).toBeNull();
  });

  it('maps shift events without worker-private fields', () => {
    const event = mapShiftToCalendarEvent(
      {
        id: 's1',
        title: 'Night RN',
        status: 'published',
        starts_at: '2026-09-18T18:00:00.000Z',
        ends_at: '2026-09-19T02:00:00.000Z',
        required_role: 'registered_nurse',
        location_name: 'Main',
        ward_name: 'A',
        rate_minor: 2500,
        currency: 'EUR',
      },
      'demo',
    );
    expect(event.href).toBe('/org/demo/shifts/s1');
    expect(event.coverageLabel).toBe('Open');
    expect(event.tone).toBe('open');
    expect(event).not.toHaveProperty('worker_id');
    expect(event).not.toHaveProperty('iban');
    expect(JSON.stringify(event)).not.toMatch(/credential|iban|storage/i);
  });

  it('applies semantic tones by role and status', () => {
    expect(calendarEventTone('draft', 'registered_nurse')).toBe('draft');
    expect(calendarEventTone('published', 'registered_nurse')).toBe('open');
    expect(calendarEventTone('filled', 'ward_assistant')).toBe('filled');
    expect(calendarEventTone('awaiting_approval', 'registered_nurse')).toBe(
      'amber',
    );
    expect(calendarEventTone('cancelled', 'ward_assistant')).toBe('danger');
    expect(coverageLabelForStatus('filled')).toBe('Filled');
  });

  it('layouts overlapping events side by side', () => {
    const layout = layoutOverlappingEvents([
      { id: 'a', startMs: 0, endMs: 100 },
      { id: 'b', startMs: 50, endMs: 150 },
      { id: 'c', startMs: 200, endMs: 250 },
    ]);
    const byId = Object.fromEntries(layout.map((l) => [l.eventId, l]));
    expect(byId.a!.column).not.toBe(byId.b!.column);
    expect(byId.a!.columnCount).toBeGreaterThanOrEqual(2);
    expect(byId.c!.columnCount).toBe(1);
  });

  it('splits cross-midnight segments across day keys', () => {
    const dayStart = Date.parse('2026-09-18T00:00:00.000Z');
    const nextStart = dayStart + 24 * 60 * 60 * 1000;
    const segs = splitCrossMidnightSegments({
      eventId: 's1',
      startMs: dayStart + 20 * 60 * 60 * 1000,
      endMs: nextStart + 4 * 60 * 60 * 1000,
      dayKeys: ['2026-09-18', '2026-09-19'],
      dayStartMs: {
        '2026-09-18': dayStart,
        '2026-09-19': nextStart,
      },
    });
    expect(segs).toHaveLength(2);
    expect(segs[0]!.dayKey).toBe('2026-09-18');
    expect(segs[1]!.dayKey).toBe('2026-09-19');
    expect(segs[0]!.eventId).toBe('s1');
  });

  it('filters by location and role without dropping tenant scope responsibility', () => {
    const rows = [
      {
        id: '1',
        title: 'A',
        status: 'published',
        starts_at: '2026-09-18T08:00:00.000Z',
        ends_at: '2026-09-18T16:00:00.000Z',
        required_role: 'registered_nurse',
        location_id: 'loc-1',
      },
      {
        id: '2',
        title: 'B',
        status: 'published',
        starts_at: '2026-09-18T08:00:00.000Z',
        ends_at: '2026-09-18T16:00:00.000Z',
        required_role: 'ward_assistant',
        location_id: 'loc-2',
      },
    ];
    expect(filterCalendarShifts(rows, { locationId: 'loc-1' })).toHaveLength(1);
    expect(filterCalendarShifts(rows, { role: 'ward_assistant' })[0]!.id).toBe(
      '2',
    );
  });

  it('labels relative dates with exact YMD available', () => {
    expect(
      relativeDateKind(
        '2026-09-18T10:00:00.000Z',
        '2026-09-18',
        '2026-09-19',
        '2026-09-18',
      ),
    ).toBe('today');
    expect(
      relativeDateKind(
        '2026-09-19T10:00:00.000Z',
        '2026-09-18',
        '2026-09-19',
        '2026-09-19',
      ),
    ).toBe('tomorrow');
    expect(
      relativeDateKind(
        '2026-09-20T10:00:00.000Z',
        '2026-09-18',
        '2026-09-19',
        '2026-09-20',
      ),
    ).toBe('later');
  });

  it('builds role-aware quick actions and omits invite', () => {
    const admin = buildDashboardQuickActions({
      slug: 'demo',
      canOperate: true,
      canManageShifts: true,
      canReviewTimesheets: true,
      canManageLocations: true,
      canAccessBilling: true,
    });
    expect(admin.map((a) => a.id)).toEqual([
      'create-shift',
      'create-multiple-shifts',
      'review-timesheets',
      'manage-locations',
      'payments',
    ]);
    expect(admin.every((a) => !a.id.includes('invite'))).toBe(true);

    const billing = buildDashboardQuickActions({
      slug: 'demo',
      canOperate: true,
      canManageShifts: false,
      canReviewTimesheets: false,
      canManageLocations: false,
      canAccessBilling: true,
    });
    expect(billing.map((a) => a.id)).toEqual(['payments']);

    const locked = buildDashboardQuickActions({
      slug: 'demo',
      canOperate: false,
      canManageShifts: true,
      canReviewTimesheets: true,
      canManageLocations: true,
      canAccessBilling: true,
    });
    expect(locked).toEqual([]);
  });
});
