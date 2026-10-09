import {
  claimErrorMessage,
  createShiftDraftSchema,
  CREDENTIAL_TYPES,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
} from '@bridge-hive/domain';

describe('Shift required worker role', () => {
  it('exposes Registered Nurse, Ward Assistant, and Physiotherapist labels', () => {
    expect(WORKER_ROLE_LABELS.registered_nurse).toBe('Registered Nurse');
    expect(WORKER_ROLE_LABELS.ward_assistant).toBe('Ward Assistant');
    expect(WORKER_ROLE_LABELS.physiotherapist).toBe('Physiotherapist');
    expect(WORKER_ROLES).toEqual([
      'registered_nurse',
      'ward_assistant',
      'physiotherapist',
    ]);
  });

  it('rejects missing required role with readable message', () => {
    const result = createShiftDraftSchema.safeParse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      locationId: '123e4567-e89b-12d3-a456-426614174001',
      requiredRole: '',
      startsAt: '2030-01-02T08:00:00.000Z',
      endsAt: '2030-01-02T16:00:00.000Z',
      breakMinutes: 0,
      rateMinor: 2500,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.flatten().fieldErrors.requiredRole?.[0];
      expect(message).toBe('Select the worker role required for this shift.');
    }
  });

  it('rejects invalid role values', () => {
    const result = createShiftDraftSchema.safeParse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      locationId: '123e4567-e89b-12d3-a456-426614174001',
      requiredRole: 'doctor',
      startsAt: '2030-01-02T08:00:00.000Z',
      endsAt: '2030-01-02T16:00:00.000Z',
      breakMinutes: 0,
      rateMinor: 2500,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
  });

  it('includes required role in a valid payload', () => {
    const result = createShiftDraftSchema.safeParse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      locationId: '123e4567-e89b-12d3-a456-426614174001',
      requiredRole: 'ward_assistant',
      startsAt: '2030-01-02T08:00:00.000Z',
      endsAt: '2030-01-02T16:00:00.000Z',
      breakMinutes: 30,
      rateMinor: 1800,
      currency: 'EUR',
      requirements: [{ requirementType: 'employment_certificate', required: true }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredRole).toBe('ward_assistant');
      expect(result.data.requirements?.[0]?.requirementType).toBe(
        'employment_certificate',
      );
    }
  });

  it('rejects free-text shift requirements outside CREDENTIAL_TYPES', () => {
    const result = createShiftDraftSchema.safeParse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      locationId: '123e4567-e89b-12d3-a456-426614174001',
      requiredRole: 'registered_nurse',
      startsAt: '2030-01-02T08:00:00.000Z',
      endsAt: '2030-01-02T16:00:00.000Z',
      breakMinutes: 0,
      rateMinor: 2500,
      currency: 'EUR',
      requirements: [{ requirementType: 'register', required: true }],
    });
    expect(result.success).toBe(false);
    expect(CREDENTIAL_TYPES).not.toContain('register');
  });
});

describe('claimErrorMessage', () => {
  it('maps role mismatch before generic NOT_ELIGIBLE', () => {
    expect(
      claimErrorMessage('NOT_ELIGIBLE:role_mismatch', {
        requiredRole: 'registered_nurse',
      }),
    ).toBe('This shift requires a Registered Nurse.');
    expect(
      claimErrorMessage('NOT_ELIGIBLE:role_mismatch', {
        requiredRole: 'ward_assistant',
      }),
    ).toBe('This shift requires a Ward Assistant.');
    expect(
      claimErrorMessage('NOT_ELIGIBLE:role_mismatch', {
        requiredRole: 'physiotherapist',
      }),
    ).toBe('This shift requires a Physiotherapist.');
  });

  it('accepts physiotherapist as a valid required role', () => {
    const result = createShiftDraftSchema.safeParse({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      locationId: '123e4567-e89b-12d3-a456-426614174001',
      requiredRole: 'physiotherapist',
      startsAt: '2030-01-02T08:00:00.000Z',
      endsAt: '2030-01-02T16:00:00.000Z',
      breakMinutes: 0,
      rateMinor: 2800,
      currency: 'EUR',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredRole).toBe('physiotherapist');
    }
  });

  it('maps missing credentials specifically', () => {
    expect(claimErrorMessage('NOT_ELIGIBLE:missing_credential:register')).toBe(
      'A required credential is missing or expired.',
    );
  });

  it('never returns raw ORG_PROFILE or SQL codes for known claim failures', () => {
    const message = claimErrorMessage('ORG_NOT_ACTIVE');
    expect(message).toBe('This organization is not active.');
    expect(message).not.toContain('ORG_NOT_ACTIVE');
  });

  it('maps payout and verification failures', () => {
    expect(claimErrorMessage('NOT_ELIGIBLE:payout_account_required')).toBe(
      'Your payout account must be approved.',
    );
    expect(claimErrorMessage('NOT_ELIGIBLE:billing_restricted')).toBe(
      'New shift access is paused because a commission invoice is overdue.',
    );
    expect(claimErrorMessage('NOT_ELIGIBLE:not_verified')).toBe(
      'Your worker verification is incomplete.',
    );
    expect(claimErrorMessage('NOT_ELIGIBLE:account_not_active')).toBe(
      'Your worker account is inactive.',
    );
  });
});

describe('Published role lock copy', () => {
  it('uses the required published-role message', () => {
    expect(
      'The required worker role cannot be changed after a shift is published.',
    ).toMatch(/cannot be changed after a shift is published/i);
  });
});
