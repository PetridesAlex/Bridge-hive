import {
  accountStatusLabel,
  auditActionLabel,
  credentialStatusLabel,
  platformRoleLabel,
  safeAuditMetadata,
} from '@/lib/admin/labels';

describe('admin labels', () => {
  it('maps platform roles and statuses to friendly labels', () => {
    expect(platformRoleLabel('platform_verifier')).toBe('Verifier');
    expect(accountStatusLabel('suspended')).toBe('Suspended');
    expect(credentialStatusLabel('under_review')).toBe('Under review');
    expect(auditActionLabel('suspend_account')).toBe('Suspended account');
  });

  it('redacts sensitive audit metadata keys', () => {
    expect(
      safeAuditMetadata({
        reason: 'policy',
        storage_path: 'secret/path.pdf',
        token: 'abc',
        account_status: 'suspended',
      }),
    ).toEqual({
      reason: 'policy',
      account_status: 'suspended',
    });
  });
});
