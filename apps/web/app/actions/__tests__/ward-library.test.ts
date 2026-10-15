import {
  STANDARD_WARD_LIBRARY,
  createShiftDraftSchema,
  createWardSchema,
  normalizeWardName,
  prepareWardNames,
  wardNameExistsAmong,
  wardNamesEqual,
} from '@bridge-hive/domain';

describe('STANDARD_WARD_LIBRARY', () => {
  it('has exactly these nine labels in this order', () => {
    expect([...STANDARD_WARD_LIBRARY]).toEqual([
      'Pathology ward',
      'Surgical ward',
      'Maternity Department',
      'Accident & Emergency Department',
      'Oncology ward',
      'Paediatric Oncology Ward',
      'Care Unit',
      'Chemotherapy Day Unit',
      'ICU',
    ]);
    expect(STANDARD_WARD_LIBRARY).toHaveLength(9);
  });
});

describe('ward name helpers', () => {
  it('trims whitespace and compares case-insensitively', () => {
    expect(normalizeWardName('  ICU  ')).toBe('ICU');
    expect(wardNamesEqual('ICU', 'icu')).toBe(true);
    expect(wardNameExistsAmong('care unit', ['Care Unit', 'ICU'])).toBe(true);
    expect(prepareWardNames(['  ICU  ', '', 'icu', 'Surgical ward'])).toEqual([
      'ICU',
      'Surgical ward',
    ]);
  });

  it('createWardSchema trims and rejects blanks', () => {
    const locationId = '11111111-1111-4111-8111-111111111111';
    const ok = createWardSchema.safeParse({
      locationId,
      name: '  ICU  ',
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.name).toBe('ICU');

    expect(
      createWardSchema.safeParse({ locationId, name: '   ' }).success,
    ).toBe(false);
  });
});

describe('shift drafts with organization wards', () => {
  const base = {
    organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    locationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    wardId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    startsAt: '2026-11-01T06:00:00.000Z',
    endsAt: '2026-11-01T14:00:00.000Z',
    breakMinutes: 30,
    rateMinor: 2500,
    currency: 'EUR' as const,
    acceptanceDeadline: '2026-10-31T06:00:00.000Z',
  };

  it.each([
    'registered_nurse',
    'ward_assistant',
    'physiotherapist',
  ] as const)('accepts %s shifts with a selected ward', (requiredRole) => {
    const parsed = createShiftDraftSchema.safeParse({
      ...base,
      requiredRole,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.wardId).toBe(base.wardId);
      expect(parsed.data.requiredRole).toBe(requiredRole);
    }
  });

  it('allows null ward (no ward / not specified)', () => {
    const parsed = createShiftDraftSchema.safeParse({
      ...base,
      wardId: null,
      requiredRole: 'registered_nurse',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.wardId).toBeNull();
  });
});
