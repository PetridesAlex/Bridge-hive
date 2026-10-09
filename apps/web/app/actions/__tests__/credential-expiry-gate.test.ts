import {
  credentialRequiresKnownExpiry,
  credentialExpiryIsValid,
  endOfCyprusBusinessDayIso,
} from '@bridge-hive/domain';

describe('practising licence expiry gate', () => {
  it('requires known expiry only for physiotherapy practising licence', () => {
    expect(
      credentialRequiresKnownExpiry('physiotherapy_practising_licence'),
    ).toBe(true);
    expect(credentialRequiresKnownExpiry('identity_document_front')).toBe(false);
    expect(credentialRequiresKnownExpiry('physiotherapy_degree')).toBe(false);
  });

  it('accepts a future Cyprus business-day expiry', () => {
    const expiresAt = endOfCyprusBusinessDayIso('2030-06-15');
    expect(
      credentialExpiryIsValid({
        credentialType: 'physiotherapy_practising_licence',
        expiresAt,
      }),
    ).toBe(true);
  });
});
