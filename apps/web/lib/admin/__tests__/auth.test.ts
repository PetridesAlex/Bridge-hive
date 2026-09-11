import type { PlatformAdminRole } from '@bridge-hive/domain';

import {
  capabilitiesForPlatformRole,
  rpcErrorMessage,
} from '@/lib/admin/capabilities';

describe('capabilitiesForPlatformRole', () => {
  const roles: PlatformAdminRole[] = [
    'platform_support',
    'platform_verifier',
    'platform_finance',
    'platform_super_admin',
  ];

  it('grants support read-only oversight without verification powers', () => {
    const caps = capabilitiesForPlatformRole('platform_support');
    expect(caps.canViewWorkers).toBe(true);
    expect(caps.canViewCredentialMetadata).toBe(true);
    expect(caps.canViewCredentialDocuments).toBe(false);
    expect(caps.canReviewCredentials).toBe(false);
    expect(caps.canVerifyWorkers).toBe(false);
    expect(caps.canSuspendAccounts).toBe(false);
    expect(caps.canViewAudit).toBe(true);
  });

  it('grants verifier credential and worker verification powers', () => {
    const caps = capabilitiesForPlatformRole('platform_verifier');
    expect(caps.canViewCredentialDocuments).toBe(true);
    expect(caps.canReviewCredentials).toBe(true);
    expect(caps.canVerifyWorkers).toBe(true);
    expect(caps.canApprovePayoutAccounts).toBe(false);
    expect(caps.canViewPayoutProof).toBe(false);
    expect(caps.canSuspendAccounts).toBe(false);
  });

  it('grants finance placeholder access without verification powers', () => {
    const caps = capabilitiesForPlatformRole('platform_finance');
    expect(caps.canViewFinancePlaceholder).toBe(true);
    expect(caps.canReviewCredentials).toBe(false);
    expect(caps.canVerifyWorkers).toBe(false);
    expect(caps.canApprovePayoutAccounts).toBe(false);
    expect(caps.canViewPayoutProof).toBe(false);
    expect(caps.canSuspendAccounts).toBe(false);
  });

  it('grants super admin all Phase 4 capabilities', () => {
    const caps = capabilitiesForPlatformRole('platform_super_admin');
    expect(caps.canViewWorkers).toBe(true);
    expect(caps.canViewCredentialDocuments).toBe(true);
    expect(caps.canReviewCredentials).toBe(true);
    expect(caps.canVerifyWorkers).toBe(true);
    expect(caps.canApprovePayoutAccounts).toBe(true);
    expect(caps.canViewPayoutProof).toBe(true);
    expect(caps.canSuspendAccounts).toBe(true);
    expect(caps.canViewAudit).toBe(true);
    expect(caps.canViewFinancePlaceholder).toBe(true);
  });

  it('covers every platform role', () => {
    for (const role of roles) {
      expect(capabilitiesForPlatformRole(role).role).toBe(role);
    }
  });
});

describe('rpcErrorMessage', () => {
  it('maps known codes to safe messages', () => {
    expect(rpcErrorMessage({ message: 'NOT_AUTHORIZED' })).toMatch(/permission/i);
    expect(rpcErrorMessage({ message: 'REASON_REQUIRED' })).toMatch(/reason/i);
    expect(rpcErrorMessage({ message: 'CANNOT_SELF_VERIFY' })).toMatch(/own/i);
  });

  it('formats missing credential messages', () => {
    expect(
      rpcErrorMessage({ message: 'MISSING_REQUIRED_CREDENTIAL:identity_document' }),
    ).toMatch(/identity document/i);
  });
});
