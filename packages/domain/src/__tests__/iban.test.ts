import { isLikelyValidIbanFormat, normalizeIbanInput } from '../credential-requirements';

describe('normalizeIbanInput', () => {
  it('strips spaces and uppercases', () => {
    expect(normalizeIbanInput('cy 17 0020 0123 4567 8901 2345 6789')).toBe(
      'CY17002001234567890123456789',
    );
  });

  it('leaves an already-normalized IBAN unchanged', () => {
    expect(normalizeIbanInput('DE89370400440532013000')).toBe(
      'DE89370400440532013000',
    );
  });
});

describe('isLikelyValidIbanFormat', () => {
  it('accepts a Cyprus-format IBAN', () => {
    expect(isLikelyValidIbanFormat('CY17002001234567890123456789')).toBe(true);
  });

  it('does not reject a valid-format IBAN merely because it is not CY', () => {
    expect(isLikelyValidIbanFormat('GR1601101250000000012300695')).toBe(true);
    expect(isLikelyValidIbanFormat('DE89370400440532013000')).toBe(true);
    expect(isLikelyValidIbanFormat('LT121000011101001000')).toBe(true);
  });

  it('normalizes spaces before validating', () => {
    expect(isLikelyValidIbanFormat('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(isLikelyValidIbanFormat('gr16 0110 1250 0000 0001 2300 695')).toBe(
      true,
    );
  });

  it('rejects incomplete or invalid IBANs with a clear format failure', () => {
    expect(isLikelyValidIbanFormat('')).toBe(false);
    expect(isLikelyValidIbanFormat('CY17')).toBe(false);
    expect(isLikelyValidIbanFormat('123456789012345')).toBe(false);
    expect(isLikelyValidIbanFormat('CYXX002001234567890123456789')).toBe(false);
  });
});
