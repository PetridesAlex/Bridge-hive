import {
  canEditPayoutAccount,
  countryCodeFromNormalizedIban,
  payoutAccountScreenStatusLabel,
  validatePayoutAccountForm,
} from '../payout-account-ui';

describe('payoutAccountScreenStatusLabel', () => {
  it('maps real backend statuses to worker-facing labels', () => {
    expect(payoutAccountScreenStatusLabel(null)).toBe('Not submitted');
    expect(payoutAccountScreenStatusLabel('pending')).toBe(
      'Submitted — under review',
    );
    expect(payoutAccountScreenStatusLabel('verified')).toBe(
      'Approved for platform use',
    );
    expect(payoutAccountScreenStatusLabel('rejected')).toBe(
      'Action required — correction needed',
    );
    expect(payoutAccountScreenStatusLabel('failed')).toBe(
      'Action required — correction needed',
    );
    expect(payoutAccountScreenStatusLabel('suspended')).toBe('Suspended');
  });
});

describe('countryCodeFromNormalizedIban', () => {
  it('derives country from the IBAN prefix after normalizing spaces', () => {
    expect(countryCodeFromNormalizedIban('cy 17 0020 0123 4567 8901 2345 6789')).toBe(
      'CY',
    );
    expect(countryCodeFromNormalizedIban('DE89370400440532013000')).toBe('DE');
    expect(countryCodeFromNormalizedIban('gr1601101250000000012300695')).toBe(
      'GR',
    );
  });
});

describe('validatePayoutAccountForm', () => {
  const proof = {
    proofPath: 'user-id/proof.pdf',
    proofMime: 'application/pdf',
  };

  it('requires account holder name', () => {
    const result = validatePayoutAccountForm({
      holderName: ' ',
      ibanInput: 'CY17002001234567890123456789',
      ...proof,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/account holder name/i);
  });

  it('requires proof of bank account', () => {
    const result = validatePayoutAccountForm({
      holderName: 'Alex Worker',
      ibanInput: 'CY17002001234567890123456789',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/proof of bank account/i);
  });

  it('rejects incomplete IBAN with a non-technical error', () => {
    const result = validatePayoutAccountForm({
      holderName: 'Alex Worker',
      ibanInput: 'CY17',
      ...proof,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Enter a valid IBAN.');
  });

  it('accepts Cyprus-format IBAN and derives CY country', () => {
    const result = validatePayoutAccountForm({
      holderName: 'Alex Worker',
      ibanInput: 'CY17 0020 0123 4567 8901 2345 6789',
      ...proof,
    });
    expect(result).toEqual({
      ok: true,
      holderName: 'Alex Worker',
      iban: 'CY17002001234567890123456789',
      country: 'CY',
    });
  });

  it('does not reject a valid-format non-Cyprus IBAN for country prefix alone', () => {
    const result = validatePayoutAccountForm({
      holderName: 'Alex Worker',
      ibanInput: 'DE89 3704 0044 0532 0130 00',
      ...proof,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.iban).toBe('DE89370400440532013000');
      expect(result.country).toBe('DE');
    }
  });
});

describe('canEditPayoutAccount', () => {
  it('keeps pending and verified view-only; allows rejected correction', () => {
    expect(canEditPayoutAccount(undefined)).toBe(true);
    expect(canEditPayoutAccount(null)).toBe(true);
    expect(canEditPayoutAccount('pending')).toBe(false);
    expect(canEditPayoutAccount('verified')).toBe(false);
    expect(canEditPayoutAccount('suspended')).toBe(false);
    expect(canEditPayoutAccount('rejected')).toBe(true);
    expect(canEditPayoutAccount('failed')).toBe(true);
  });

  it('documents that payout remains subject to administrative approval', () => {
    // Pending submissions are locked until admin review resolves them.
    expect(canEditPayoutAccount('pending')).toBe(false);
    expect(payoutAccountScreenStatusLabel('pending')).toContain('under review');
    expect(payoutAccountScreenStatusLabel('verified')).toContain(
      'Approved for platform use',
    );
  });
});
