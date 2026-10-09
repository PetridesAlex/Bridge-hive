import {
  ORG_DISPLAY_NAME_MAX_LENGTH,
  ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE,
  ORG_PAYS_WORKER_GROSS_COPY,
  addOrgActivityCalendarDays,
  buildAttentionQueue,
  buildOrgActivitySeries,
  buildRoleCoverage,
  buildShiftCoverageTrend,
  countFilledUpcoming,
  countOpenShifts,
  estimatedUpcomingGrossMinor,
  isOwnedOrganizationLogoPath,
  isOrgActivityRangeDays,
  locationWorkload,
  mondayOfOrgActivityYmd,
  normalizeOrganizationDisplayName,
  orgActivityFetchStartYmd,
  orgActivityYmdInTimeZone,
  orgLifecycleBannerTone,
  orgNavItemsForCapabilities,
  orgProfileCompleteness,
  orgRoleExplanation,
  organizationInitials,
  shiftCoverageRate,
  timesheetReviewTurnaroundHours,
  truncateWorkerId,
} from '@bridge-hive/domain';

describe('org dashboard helpers', () => {
  const now = new Date('2026-09-15T10:00:00.000Z');

  const shifts = [
    {
      status: 'published',
      starts_at: '2026-09-16T08:00:00.000Z',
      required_role: 'registered_nurse',
      acceptance_deadline: '2026-09-15T18:00:00.000Z',
    },
    {
      status: 'filled',
      starts_at: '2026-09-20T08:00:00.000Z',
      required_role: 'ward_assistant',
    },
    {
      status: 'draft',
      starts_at: '2026-09-22T08:00:00.000Z',
      required_role: 'registered_nurse',
    },
    {
      status: 'published',
      starts_at: '2026-08-01T08:00:00.000Z',
      required_role: 'registered_nurse',
    },
  ];

  it('counts open and filled upcoming shifts', () => {
    expect(countOpenShifts(shifts, now)).toBe(1);
    expect(countFilledUpcoming(shifts, now, 30)).toBe(1);
  });

  it('builds coverage trend and role coverage without inventing data', () => {
    const trend = buildShiftCoverageTrend(shifts, now, 6);
    expect(trend).toHaveLength(6);
    expect(trend.some((b) => b.published > 0 || b.filled > 0)).toBe(true);
    const roles = buildRoleCoverage(shifts, now, 6);
    expect(roles.map((r) => r.role)).toEqual([
      'registered_nurse',
      'ward_assistant',
      'physiotherapist',
    ]);
    expect(roles.reduce((s, r) => s + r.count, 0)).toBe(roles[0]!.total);
  });

  it('builds attention queue from real signals only', () => {
    const items = buildAttentionQueue({
      slug: 'demo-hospital',
      orgStatus: 'active',
      locationCount: 0,
      draftShifts: [{ id: 'd1', title: 'Night draft', starts_at: '2026-09-22T08:00:00.000Z' }],
      openNearDeadline: [
        {
          id: 's1',
          title: 'Open RN',
          acceptance_deadline: '2026-09-15T18:00:00.000Z',
        },
      ],
      submittedTimesheetCount: 2,
      now,
    });
    expect(items[0]?.id).toBe('no-locations');
    expect(items.some((i) => i.id === 'timesheets')).toBe(true);
    expect(items.some((i) => i.href.includes('/timesheets'))).toBe(true);
  });

  it('exposes role-aware nav without dead member links', () => {
    const admin = orgNavItemsForCapabilities('acme', {
      canOperate: true,
      canManageShifts: true,
      canManageLocations: true,
      canReviewTimesheets: true,
      canAccessBilling: true,
      canEditOrgSettings: true,
    });
    expect(admin.map((i) => i.id)).toEqual([
      'dashboard',
      'shifts',
      'timesheets',
      'locations',
      'payments',
      'settings',
    ]);

    const billing = orgNavItemsForCapabilities('acme', {
      canOperate: true,
      canManageShifts: false,
      canManageLocations: false,
      canReviewTimesheets: false,
      canAccessBilling: true,
      canEditOrgSettings: false,
    });
    expect(billing.map((i) => i.id)).toEqual([
      'dashboard',
      'payments',
      'settings',
    ]);
    expect(JSON.stringify(admin)).not.toMatch(/members/i);

    const scheduler = orgNavItemsForCapabilities('acme', {
      canOperate: true,
      canManageShifts: true,
      canManageLocations: true,
      canReviewTimesheets: true,
      canAccessBilling: false,
      canEditOrgSettings: false,
    });
    expect(scheduler.map((i) => i.id)).not.toContain('payments');
  });

  it('keeps financial wording honest', () => {
    expect(ORG_PAYS_WORKER_GROSS_COPY).toMatch(/approved gross/i);
    expect(ORG_PAYS_WORKER_GROSS_COPY.toLowerCase()).not.toContain('bridge hive revenue');
    expect(ORG_PAYMENT_INSTRUCTIONS_UNAVAILABLE.toLowerCase()).toContain('not available');
    expect(truncateWorkerId('abcdefgh-ijkl-mnop')).toBe('abcdefgh…');
    expect(orgLifecycleBannerTone('rejected')).toBe('warning');
    expect(orgRoleExplanation('org_billing')).toMatch(/Billing/);
  });
});

describe('organization branding helpers', () => {
  it('normalizes display names and rejects invalid values', () => {
    expect(normalizeOrganizationDisplayName('  Test Hospital  ')).toEqual({
      ok: true,
      value: 'Test Hospital',
    });
    expect(normalizeOrganizationDisplayName('   ').ok).toBe(false);
    expect(normalizeOrganizationDisplayName('a'.repeat(ORG_DISPLAY_NAME_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
    expect(normalizeOrganizationDisplayName('Ab\u0000C').ok).toBe(true);
    expect(
      (normalizeOrganizationDisplayName('Ab\u0000C') as { ok: true; value: string }).value,
    ).toBe('AbC');
  });

  it('builds initials and validates owned logo paths', () => {
    expect(organizationInitials('Test Hospital A')).toBe('TH');
    expect(organizationInitials('Acme')).toBe('AC');
    expect(organizationInitials('')).toBe('BH');

    const orgId = '11111111-1111-1111-1111-111111111111';
    expect(isOwnedOrganizationLogoPath(orgId, `${orgId}/v1.jpg`)).toBe(true);
    expect(
      isOwnedOrganizationLogoPath(orgId, `22222222-2222-2222-2222-222222222222/v1.jpg`),
    ).toBe(false);

    const complete = orgProfileCompleteness({
      legalName: 'Legal',
      displayName: 'Display',
      primaryContactName: 'Pat',
      primaryContactEmail: 'pat@example.com',
    });
    expect(complete).toMatchObject({ complete: 4, total: 4, nextMissingLabel: null });
    expect(
      orgProfileCompleteness({
        legalName: 'Legal',
        displayName: ' ',
        primaryContactName: null,
        primaryContactEmail: 'a@b.c',
      }).nextMissingLabel,
    ).toBe('Display name');
  });

  it('computes coverage, turnaround, and gross metrics with honest empty states', () => {
    const now = new Date('2026-09-15T10:00:00.000Z');
    expect(shiftCoverageRate([], now, 30)).toMatchObject({
      kind: 'empty',
      message: 'No published shifts',
    });
    expect(
      shiftCoverageRate(
        [
          { status: 'filled', starts_at: '2026-09-20T08:00:00.000Z' },
          { status: 'published', starts_at: '2026-09-21T08:00:00.000Z' },
        ],
        now,
        30,
      ),
    ).toMatchObject({ kind: 'rate', filled: 1, published: 2, percent: 50 });

    expect(timesheetReviewTurnaroundHours([], now, 30)).toMatchObject({
      kind: 'insufficient',
      message: 'Not enough data',
    });
    expect(
      timesheetReviewTurnaroundHours(
        [
          { submitted_at: '2026-09-01T08:00:00.000Z', reviewed_at: '2026-09-01T12:00:00.000Z' },
          { submitted_at: '2026-09-02T08:00:00.000Z', reviewed_at: '2026-09-02T20:00:00.000Z' },
        ],
        now,
        30,
      ).kind,
    ).toBe('median');

    const gross = estimatedUpcomingGrossMinor(
      [
        {
          status: 'filled',
          starts_at: '2026-09-20T08:00:00.000Z',
          ends_at: '2026-09-20T16:00:00.000Z',
          rate_minor: 1000,
          break_minutes: 0,
        },
        {
          status: 'published',
          starts_at: '2026-09-21T08:00:00.000Z',
          ends_at: '2026-09-21T16:00:00.000Z',
          rate_minor: null,
        },
      ],
      now,
      30,
    );
    expect(gross.counted).toBe(1);
    expect(gross.skipped).toBe(1);
    expect(gross.amountMinor).toBe(8000);
    expect(JSON.stringify(gross).toLowerCase()).not.toContain('revenue');

    expect(
      locationWorkload([
        { location_id: 'l1', location_name: 'Ward A' },
        { location_id: 'l1', location_name: 'Ward A' },
        { location_id: 'l2', location_name: 'Ward B' },
      ])[0],
    ).toMatchObject({ locationId: 'l1', count: 2 });
  });
});

describe('organization activity series', () => {
  // Midday Europe/Nicosia on 3 Oct 2026 (EEST, UTC+3)
  const now = new Date('2026-10-03T12:00:00.000+03:00');
  const timeZone = 'Europe/Nicosia';

  it('validates range days and computes fetch lookback in org timezone', () => {
    expect(isOrgActivityRangeDays(7)).toBe(true);
    expect(isOrgActivityRangeDays(14)).toBe(false);
    expect(orgActivityYmdInTimeZone(now, timeZone)).toBe('2026-10-03');
    expect(orgActivityFetchStartYmd(timeZone, now)).toBe('2026-04-07');
    expect(mondayOfOrgActivityYmd('2026-10-03')).toBe('2026-09-28');
    expect(addOrgActivityCalendarDays('2026-10-03', -6)).toBe('2026-09-27');
  });

  it('buckets shifts created, acceptances including withdrawn, distinct workers, and approved timesheets', () => {
    const series = buildOrgActivitySeries({
      timeZone,
      rangeDays: 7,
      now,
      shifts: [
        { id: 's1', created_at: '2026-10-01T10:00:00.000+03:00', status: 'draft' },
        { id: 's2', created_at: '2026-10-01T15:00:00.000+03:00', status: 'published' },
        { id: 's3', created_at: '2026-09-20T10:00:00.000+03:00', status: 'filled' }, // outside 7d
        { id: 's4', created_at: '2026-10-03T08:00:00.000+03:00', status: 'filled' },
      ],
      assignments: [
        {
          id: 'a1',
          worker_id: 'w1',
          accepted_at: '2026-10-02T09:00:00.000+03:00',
          status: 'accepted',
        },
        {
          id: 'a2',
          worker_id: 'w1',
          accepted_at: '2026-10-02T11:00:00.000+03:00',
          status: 'withdrawn', // still counts as acceptance history
        },
        {
          id: 'a3',
          worker_id: 'w2',
          accepted_at: '2026-10-03T09:00:00.000+03:00',
          status: 'cancelled',
        },
        {
          id: 'a4',
          worker_id: 'w3',
          accepted_at: '2026-09-01T09:00:00.000+03:00',
          status: 'accepted', // outside window
        },
      ],
      timesheets: [
        {
          id: 't1',
          reviewed_at: '2026-10-03T10:00:00.000+03:00',
          status: 'approved',
        },
        {
          id: 't2',
          reviewed_at: '2026-10-03T11:00:00.000+03:00',
          status: 'rejected', // must not count
        },
        {
          id: 't3',
          reviewed_at: null,
          status: 'submitted',
        },
      ],
    });

    expect(series.granularity).toBe('day');
    expect(series.buckets).toHaveLength(7);
    expect(series.periodStartYmd).toBe('2026-09-27');
    expect(series.periodEndYmd).toBe('2026-10-03');
    expect(series.totals.shiftsCreated).toBe(3);
    expect(series.totals.statusBreakdown).toEqual({
      draft: 1,
      published: 1,
      filled: 1,
    });
    expect(series.totals.acceptances).toBe(3);
    expect(series.totals.participatingWorkers).toBe(2);
    expect(series.totals.timesheetsApproved).toBe(1);

    const oct2 = series.buckets.find((b) => b.key === '2026-10-02');
    expect(oct2?.acceptances).toBe(2);
    expect(oct2?.participatingWorkers).toBe(1);

    // Series props must not expose worker identifiers
    expect(JSON.stringify(series)).not.toMatch(/"w1"|"w2"|"w3"/);
    expect(JSON.stringify(series)).not.toMatch(/email|iban|phone/i);
  });

  it('computes prior-period totals and uses weekly buckets for 90 days', () => {
    const series = buildOrgActivitySeries({
      timeZone,
      rangeDays: 90,
      now,
      shifts: [
        // Current 90d window starts 2026-07-06
        { id: 's1', created_at: '2026-08-01T10:00:00.000+03:00', status: 'published' },
        // Prior window ends 2026-07-05
        { id: 's2', created_at: '2026-07-01T10:00:00.000+03:00', status: 'draft' },
      ],
      assignments: [
        {
          id: 'a1',
          worker_id: 'w1',
          accepted_at: '2026-08-15T10:00:00.000+03:00',
          status: 'accepted',
        },
        {
          id: 'a2',
          worker_id: 'w9',
          accepted_at: '2026-06-20T10:00:00.000+03:00',
          status: 'accepted',
        },
      ],
      timesheets: [
        {
          id: 't1',
          reviewed_at: '2026-06-25T10:00:00.000+03:00',
          status: 'approved',
        },
      ],
    });

    expect(series.granularity).toBe('week');
    expect(series.periodStartYmd).toBe('2026-07-06');
    expect(series.priorPeriodEndYmd).toBe('2026-07-05');
    expect(series.priorPeriodStartYmd).toBe(
      addOrgActivityCalendarDays('2026-07-05', -89),
    );
    expect(series.totals.shiftsCreated).toBe(1);
    expect(series.totals.acceptances).toBe(1);
    expect(series.priorTotals.shiftsCreated).toBe(1);
    expect(series.priorTotals.acceptances).toBe(1);
    expect(series.priorTotals.timesheetsApproved).toBe(1);
    expect(series.buckets.length).toBeGreaterThan(10);
    expect(series.buckets.every((b) => b.key === mondayOfOrgActivityYmd(b.key))).toBe(
      true,
    );
  });

  it('returns honest zeros for empty activity and respects 30-day boundaries', () => {
    const empty = buildOrgActivitySeries({
      timeZone,
      rangeDays: 30,
      now,
      shifts: [],
      assignments: [],
      timesheets: [],
    });
    expect(empty.buckets).toHaveLength(30);
    expect(empty.totals).toMatchObject({
      shiftsCreated: 0,
      acceptances: 0,
      participatingWorkers: 0,
      timesheetsApproved: 0,
    });
    expect(empty.periodStartYmd).toBe('2026-09-04');

    // Event just before local midnight boundary (still previous local day)
    const boundary = buildOrgActivitySeries({
      timeZone,
      rangeDays: 30,
      now,
      shifts: [
        {
          id: 'edge',
          created_at: '2026-09-03T23:30:00.000+03:00',
          status: 'published',
        },
        {
          id: 'in',
          created_at: '2026-09-04T00:15:00.000+03:00',
          status: 'published',
        },
      ],
      assignments: [],
      timesheets: [],
    });
    expect(boundary.totals.shiftsCreated).toBe(1);
    expect(boundary.priorTotals.shiftsCreated).toBe(1);
  });

  it('handles Europe/Nicosia DST spring-forward day without dropping buckets', () => {
    // 2026-03-29 is DST start in Cyprus; window ending that day still has 7 keys
    const dstNow = new Date('2026-03-29T15:00:00.000+03:00');
    const series = buildOrgActivitySeries({
      timeZone: 'Europe/Nicosia',
      rangeDays: 7,
      now: dstNow,
      shifts: [
        {
          id: 'dst',
          created_at: '2026-03-29T04:30:00.000+03:00',
          status: 'published',
        },
      ],
      assignments: [],
      timesheets: [],
    });
    expect(series.buckets).toHaveLength(7);
    expect(series.periodEndYmd).toBe('2026-03-29');
    expect(series.totals.shiftsCreated).toBe(1);
  });
});
