import {
  reviewCredentialSchema,
  reviewPayoutAccountSchema,
  suspendWorkerAccountSchema,
} from '@bridge-hive/domain';

describe('admin action schemas', () => {
  it('requires reason for suspension', () => {
    const missing = suspendWorkerAccountSchema.safeParse({
      workerId: 'a1000001-0000-4000-8000-000000000005',
      reason: '',
    });
    expect(missing.success).toBe(false);

    const ok = suspendWorkerAccountSchema.safeParse({
      workerId: 'a1000001-0000-4000-8000-000000000005',
      reason: 'Policy violation',
    });
    expect(ok.success).toBe(true);
  });

  it('accepts approve and reject credential decisions', () => {
    expect(
      reviewCredentialSchema.safeParse({
        credentialId: 'a1000001-cccc-4000-8000-0000000000d1',
        decision: 'approve',
      }).success,
    ).toBe(true);

    expect(
      reviewCredentialSchema.safeParse({
        credentialId: 'a1000001-cccc-4000-8000-0000000000d1',
        decision: 'reject',
        rejectionReason: 'Illegible',
      }).success,
    ).toBe(true);
  });

  it('requires reason for payout account decisions', () => {
    expect(
      reviewPayoutAccountSchema.safeParse({
        payoutAccountId: 'a1000001-cccc-4000-8000-0000000000d9',
        decision: 'approve',
        reason: '',
      }).success,
    ).toBe(false);

    expect(
      reviewPayoutAccountSchema.safeParse({
        payoutAccountId: 'a1000001-cccc-4000-8000-0000000000d9',
        decision: 'approve',
        reason: 'Approve for platform use',
      }).success,
    ).toBe(true);
  });
});
