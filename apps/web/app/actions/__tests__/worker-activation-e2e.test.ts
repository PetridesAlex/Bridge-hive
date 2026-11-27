import fs from 'node:fs/promises';
import path from 'node:path';

const mobileRoot = path.resolve(process.cwd(), '../worker-mobile');

async function readMobile(...parts: string[]) {
  return fs.readFile(path.join(mobileRoot, ...parts), 'utf8');
}

describe('worker mobile auth recovery and package submit contracts', () => {
  it('resetPassword passes a worker-safe redirectTo', async () => {
    const src = await readMobile('providers/AuthProvider.tsx');
    expect(src).toMatch(/resetPasswordForEmail/);
    expect(src).toMatch(/redirectTo/);
    expect(src).toMatch(
      /workerRecoveryNativeFallbackRedirectTo|DEFAULT_WORKER_RECOVERY_NEXT|auth\/worker\/reset-password/,
    );
    expect(src).not.toMatch(/activate-organization-account/);
  });

  it('signUp and resend use worker emailRedirectTo and classify duplicates', async () => {
    const src = await readMobile('providers/AuthProvider.tsx');
    expect(src).toMatch(/emailRedirectTo/);
    expect(src).toMatch(/DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT/);
    expect(src).toMatch(/classifyWorkerSignUpResponse/);
    expect(src).toMatch(/auth\.resend/);
    expect(src).toMatch(/type:\s*['"]signup['"]/);
    expect(src).not.toMatch(/activate-organization-account/);
  });

  it('submitForReview uses package submit RPC rather than client verification_status', async () => {
    const src = await readMobile('providers/AuthProvider.tsx');
    expect(src).toMatch(/submit_worker_verification_package/);
    expect(src).toMatch(/ensure_my_worker_profile/);
    expect(src).not.toMatch(/verification_status:\s*['"]submitted['"]/);
  });

  it('register routes email-confirm users to check-email without URL email param', async () => {
    const src = await readMobile('app/auth/worker/register.tsx');
    expect(src).toMatch(/check-email/);
    expect(src).toMatch(/needsEmailConfirm/);
    expect(src).toMatch(/setPendingConfirmEmail/);
    expect(src).toMatch(/submitLock/);
    expect(src).not.toMatch(/params:\s*\{\s*email:/);
  });

  it('check-email uses request-accepted copy and resend with cooldown', async () => {
    const src = await readMobile('app/auth/worker/check-email.tsx');
    const en = await readMobile('i18n/translations/en.ts');
    expect(src).toMatch(/resendSignupConfirmation/);
    expect(src).toMatch(/WORKER_CONFIRM_RESEND_COOLDOWN_MS/);
    expect(src).toMatch(/auth\.wrongEmailEdit/);
    expect(src).toMatch(/auth\.invitationDeliveryNote/);
    expect(src).not.toMatch(/We sent a confirmation link/);
    expect(en).toMatch(/Delivery is not confirmed on this screen/);
    expect(en).toMatch(/Edit email/);
  });

  it('pending screen exposes Submit for review from server eligibility', async () => {
    const src = await readMobile('app/auth/worker/pending.tsx');
    const journey = await readMobile('lib/worker-journey.ts');
    const en = await readMobile('i18n/translations/en.ts');
    expect(journey).toMatch(/canSubmitWorkerVerificationPackage/);
    expect(src).toMatch(/canSubmitPackage/);
    expect(src).toMatch(/auth\.submitForReview/);
    expect(src).toMatch(/auth\.finalReview/);
    expect(en).toMatch(/submitForReview: 'Submit for review'/);
    expect(en).toMatch(/finalReview: 'Final review'/);
  });
});
