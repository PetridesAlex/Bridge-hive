import { readFileSync } from 'node:fs';
import path from 'node:path';

import { isWorkerAccountSetupRouteAllowed } from '@bridge-hive/domain';

jest.mock('../supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    auth: { signInWithPassword: jest.fn() },
  },
}));

import {
  createDeletionClientRequestId,
  detectAuthProviderKind,
} from '../account-deletion';

const root = path.join(__dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('detectAuthProviderKind', () => {
  it('detects google-only identities without requiring a password', () => {
    expect(
      detectAuthProviderKind({
        identities: [{ provider: 'google' }],
        app_metadata: { provider: 'google' },
      }),
    ).toBe('google');
  });

  it('detects email identities for password reauth', () => {
    expect(
      detectAuthProviderKind({
        identities: [{ provider: 'email' }],
        app_metadata: { provider: 'email' },
      }),
    ).toBe('email');
  });
});

describe('createDeletionClientRequestId', () => {
  it('returns a uuid-shaped idempotency key', () => {
    const id = createDeletionClientRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('delete account UI placement and copy', () => {
  it('places Delete account under Support in Help and keeps Sign out separate', () => {
    const profile = source('app/(tabs)/profile/index.tsx');
    const supportIdx = profile.indexOf("label={t('profile.support')}");
    const deleteIdx = profile.indexOf("label={t('profile.deleteAccount')}");
    const languageIdx = profile.indexOf("label={t('profile.language')}");
    const signOutIdx = profile.indexOf('<SignOutButton');
    expect(supportIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(supportIdx);
    expect(languageIdx).toBeGreaterThan(deleteIdx);
    expect(signOutIdx).toBeGreaterThan(languageIdx);
    expect(profile).toContain('destructive');
    expect(profile).toContain("icon=\"trash-outline\"");
    expect(profile).toContain("router.push('/delete-account')");
  });

  it('includes English and Greek delete-account strings', () => {
    const en = source('i18n/translations/en.ts');
    const el = source('i18n/translations/el.ts');
    for (const src of [en, el]) {
      expect(src).toContain('deleteAccount:');
      expect(src).toContain('deleteAccountTitle:');
      expect(src).toContain('deleteAccountFinalTitle:');
      expect(src).toContain('deleteAccountKeep:');
      expect(src).toContain('deleteAccountPermanently:');
      expect(src).toContain('deleteAccountWorking:');
      expect(src).toContain('deleteAccountRequestedTitle:');
    }
  });

  it('uses two-step confirmation and does not delete before final confirm', () => {
    const screen = source('app/delete-account.tsx');
    expect(screen).toContain("setStep('explain')");
    expect(screen).toContain("setStep('reauth')");
    expect(screen).toContain("setStep('final')");
    expect(screen).toContain('requestWorkerAccountDeletion');
    expect(screen).toContain('submittingRef');
    expect(screen).toContain('signInWithPassword');
    expect(screen).toContain('signInWithGoogleOAuth');
    expect(screen).toContain('deleteAccountFinalTitle');
    expect(screen).toContain('deleteAccountKeep');
    // First Continue must not invoke the edge function.
    const continueFn = screen.slice(
      screen.indexOf('const beginContinue'),
      screen.indexOf('const completeReauth'),
    );
    expect(continueFn).not.toContain('requestWorkerAccountDeletion');
  });

  it('is reachable during Account Setup and from pending/restricted/rejected', () => {
    expect(isWorkerAccountSetupRouteAllowed('/delete-account')).toBe(true);
    const pending = source('app/auth/worker/pending.tsx');
    const restricted = source('app/auth/worker/restricted.tsx');
    const rejected = source('app/auth/worker/rejected.tsx');
    expect(pending).toContain("router.push('/delete-account')");
    expect(restricted).toContain("router.push('/delete-account')");
    expect(rejected).toContain("router.push('/delete-account')");
  });

  it('keeps service-role deletion behind the edge function and session-derived user', () => {
    const fn = readFileSync(
      path.join(root, '../../supabase/functions/delete-worker-account/index.ts'),
      'utf8',
    );
    expect(fn).toContain('auth.getUser()');
    expect(fn).toContain('admin.deleteUser(userId)');
    expect(fn).toContain('prepare_my_worker_account_deletion');
    expect(fn).toContain('finalize_worker_account_deletion');
    expect(fn).toContain('app_review_demo');
    expect(fn).toContain('jwt_note');
    expect(fn).not.toContain('Bridge-Hive-Reports');
    const owned = fn.slice(
      fn.indexOf('OWNED_WORKER_STORAGE_BUCKETS'),
      fn.indexOf('NOT_DELETED_WITH_WORKER'),
    );
    expect(owned).toContain('credentials');
    expect(owned).toContain('worker-avatars');
    expect(owned).toContain('payout-proofs');
    expect(owned).toContain('profile-avatars');
    expect(owned).not.toContain('organization-logos');
    expect(owned).not.toContain('location-images');
    expect(owned).not.toContain('recruitment-documents');
    const notDeleted = fn.slice(
      fn.indexOf('NOT_DELETED_WITH_WORKER'),
      fn.indexOf('type PrepareResult'),
    );
    expect(notDeleted).toContain('organization-logos');
    expect(notDeleted).toContain('location-images');
    expect(notDeleted).toContain('recruitment-documents');
    expect(fn.indexOf('admin.deleteUser(userId)')).toBeGreaterThan(
      fn.indexOf('removeOwnedStorage'),
    );
    expect(fn.lastIndexOf("status: 'completed'")).toBeGreaterThan(
      fn.indexOf('finalize_worker_account_deletion'),
    );
    expect(fn).toContain('financial_records_erased: false');
    expect(fn).toContain('messages_deleted: false');
    expect(fn).toContain('gateDeletionRequest');
    expect(fn.indexOf('gateDeletionRequest')).toBeLessThan(
      fn.indexOf('prepare_my_worker_account_deletion'),
    );
    const gateSrc = readFileSync(
      path.join(root, '../../supabase/functions/delete-worker-account/reauth-gate.ts'),
      'utf8',
    );
    expect(gateSrc).toContain('REAUTH_MAX_AGE_SEC = 600');
    expect(gateSrc).toContain("error: 'reauth_required'");
    expect(gateSrc).toContain("'user_id' in body");
    expect(gateSrc).toContain("'email' in body");
    // Migration remains deferred (not in active supabase/migrations/) until approved.
    const migration = readFileSync(
      path.join(
        root,
        '../../docs/_deferred/migrations/20261113170000_worker_self_service_account_deletion.sql',
      ),
      'utf8',
    );
    expect(migration).not.toContain('email_normalized');
    expect(migration).toContain("'recruitment_ownership', 'not_verified'");
    expect(migration).toContain("'restore_safeguard', 'unresolved'");
    expect(migration).toContain("'legal_retention_decision', 'unresolved'");
    expect(migration).toContain('author_user_id = v_uid');
  });
});
