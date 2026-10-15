import {
  STANDARD_WARD_LIBRARY,
  normalizeWardName,
  prepareWardNames,
  wardNameExistsAmong,
  wardNamesEqual,
} from '../ward-library';
import { createWardSchema, createWardsBatchSchema } from '../schemas';

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
  it('trims whitespace', () => {
    expect(normalizeWardName('  ICU  ')).toBe('ICU');
  });

  it('compares names case-insensitively', () => {
    expect(wardNamesEqual('ICU', 'icu')).toBe(true);
    expect(wardNamesEqual(' Care Unit ', 'care unit')).toBe(true);
    expect(wardNamesEqual('ICU', 'Surgical ward')).toBe(false);
  });

  it('prepareWardNames drops blanks and dedupes case-insensitively', () => {
    expect(prepareWardNames(['  ICU  ', '', 'icu', 'Surgical ward', '  '])).toEqual([
      'ICU',
      'Surgical ward',
    ]);
  });

  it('wardNameExistsAmong detects duplicates', () => {
    expect(wardNameExistsAmong('icu', ['ICU', 'Care Unit'])).toBe(true);
    expect(wardNameExistsAmong('Oncology ward', ['ICU'])).toBe(false);
    expect(wardNameExistsAmong('   ', ['ICU'])).toBe(false);
  });
});

describe('createWardSchema', () => {
  const locationId = '11111111-1111-4111-8111-111111111111';

  it('trims and accepts a valid name', () => {
    const parsed = createWardSchema.safeParse({
      locationId,
      name: '  ICU  ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe('ICU');
  });

  it('rejects blank names after trim', () => {
    const parsed = createWardSchema.safeParse({
      locationId,
      name: '   ',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('createWardsBatchSchema', () => {
  const locationId = '11111111-1111-4111-8111-111111111111';

  it('requires at least one name', () => {
    expect(
      createWardsBatchSchema.safeParse({ locationId, names: [] }).success,
    ).toBe(false);
  });

  it('accepts a non-empty names list', () => {
    const parsed = createWardsBatchSchema.safeParse({
      locationId,
      names: ['ICU', 'Care Unit'],
    });
    expect(parsed.success).toBe(true);
  });
});
