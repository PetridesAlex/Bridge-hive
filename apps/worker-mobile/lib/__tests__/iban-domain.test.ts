/**
 * Domain IBAN helpers are exercised here so worker-mobile CI covers them
 * without a separate domain jest package config.
 */
import {
  isLikelyValidIbanFormat,
  normalizeIbanInput,
} from '@bridge-hive/domain';

describe('domain IBAN helpers (via worker-mobile)', () => {
  it('accepts Cyprus-format IBAN', () => {
    expect(isLikelyValidIbanFormat('CY17002001234567890123456789')).toBe(true);
  });

  it('does not reject valid-format non-Cyprus IBANs for prefix alone', () => {
    expect(isLikelyValidIbanFormat('GR1601101250000000012300695')).toBe(true);
    expect(isLikelyValidIbanFormat('DE89370400440532013000')).toBe(true);
    expect(isLikelyValidIbanFormat('LT121000011101001000')).toBe(true);
  });

  it('normalizes spaces', () => {
    expect(normalizeIbanInput('de89 3704 0044 0532 0130 00')).toBe(
      'DE89370400440532013000',
    );
    expect(isLikelyValidIbanFormat('DE89 3704 0044 0532 0130 00')).toBe(true);
  });

  it('rejects incomplete or invalid IBAN formats', () => {
    expect(isLikelyValidIbanFormat('CY17')).toBe(false);
    expect(isLikelyValidIbanFormat('')).toBe(false);
    expect(isLikelyValidIbanFormat('123456789012345')).toBe(false);
  });
});
