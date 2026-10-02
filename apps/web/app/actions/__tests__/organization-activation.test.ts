import {
  allowlistedActivationNext,
  buildActivationRedirectTo,
  classifyWorkerSignUpResponse,
  friendlyAuthLinkError,
  isActivationEmailOtpType,
  isAuthConfirmEmailOtpType,
  isWorkerSignupConfirmNext,
  administratorAccessLabel,
  buildActivationCallbackUrl,
  friendlyInvitationError,
  isAllowlistedRedirectOrigin,
  maskEmail,
  mapAuthInviteErrorCategory,
  organizationLifecycleLabel,
  organizationProfileLabel,
  safeAppPath,
  slugifyOrganizationName,
  workerConfirmRequestAcceptedCopy,
  workerExistingAccountMessage,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, '../..');

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

describe('organization activation helpers', () => {
  it('masks emails', () => {
    expect(maskEmail('admin@hospital.cy')).toBe('ad•••@hospital.cy');
  });

  it('slugifies display names', () => {
    expect(slugifyOrganizationName('Nicosia General Hospital')).toBe(
      'nicosia-general-hospital',
    );
  });

  it('restricts unsafe next paths', () => {
    expect(safeAppPath('//evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeAppPath('/activate-organization-account', '/x')).toBe(
      '/activate-organization-account',
    );
  });

  it('allowlists redirect origins (case 19)', () => {
    expect(
      isAllowlistedRedirectOrigin('https://app.bridgehive.app', 'https://app.bridgehive.app'),
    ).toBe(true);
    expect(
      isAllowlistedRedirectOrigin('https://evil.example', 'https://app.bridgehive.app'),
    ).toBe(false);
  });

  it('builds activation redirectTo as confirm URL with next (no tokens)', () => {
    expect(buildActivationRedirectTo('http://localhost:3000')).toBe(
      'http://localhost:3000/auth/confirm?next=%2Factivate-organization-account',
    );
    expect(buildActivationRedirectTo('http://localhost:3000')).not.toMatch(
      /token|hash|code=/i,
    );
    expect(buildActivationRedirectTo('http://localhost:3000')).not.toMatch(
      /localhost:3000\/activate-organization-account$/,
    );
  });

  it('legacy callback helper still builds relative next only', () => {
    expect(buildActivationCallbackUrl('http://127.0.0.1:3000')).toContain(
      '/auth/callback?next=',
    );
  });

  it('allowlists activation next and rejects arbitrary external paths', () => {
    expect(allowlistedActivationNext('/activate-organization-account')).toBe(
      '/activate-organization-account',
    );
    expect(allowlistedActivationNext('https://evil.example/phish')).toBe(
      '/activate-organization-account',
    );
    expect(allowlistedActivationNext('//evil.com')).toBe(
      '/activate-organization-account',
    );
    expect(allowlistedActivationNext('/dashboard')).toBe(
      '/activate-organization-account',
    );
  });

  it('allowlists worker password recovery next without org activation default', () => {
    expect(allowlistedActivationNext('/auth/worker/reset-password')).toBe(
      '/auth/worker/reset-password',
    );
    expect(allowlistedActivationNext('/auth/worker/reset-password')).not.toBe(
      '/activate-organization-account',
    );
  });

  it('allowlists worker signup confirm next and signup OTP only with that next', () => {
    expect(allowlistedActivationNext('/auth/worker/login')).toBe(
      '/auth/worker/login',
    );
    expect(isWorkerSignupConfirmNext('/auth/worker/login')).toBe(true);
    expect(isAuthConfirmEmailOtpType('signup', '/auth/worker/login')).toBe(true);
    expect(
      isAuthConfirmEmailOtpType('signup', '/activate-organization-account'),
    ).toBe(false);
    expect(isActivationEmailOtpType('signup')).toBe(false);
  });

  it('classifies signup responses without treating duplicates as delivery', () => {
    expect(
      classifyWorkerSignUpResponse({
        hasUser: true,
        hasSession: false,
        identitiesCount: 1,
      }).kind,
    ).toBe('needs_email_confirm');
    expect(
      classifyWorkerSignUpResponse({
        hasUser: true,
        hasSession: false,
        identitiesCount: 0,
      }).kind,
    ).toBe('existing_account');
    expect(
      classifyWorkerSignUpResponse({
        hasUser: true,
        hasSession: true,
      }).kind,
    ).toBe('session');
    expect(
      classifyWorkerSignUpResponse({
        errorMessage: 'boom',
        hasUser: false,
        hasSession: false,
      }).kind,
    ).toBe('error');
    expect(workerExistingAccountMessage()).toMatch(/sign in or reset/i);
    expect(workerConfirmRequestAcceptedCopy(false)).toMatch(/accepted your confirmation request/i);
    expect(workerConfirmRequestAcceptedCopy(false)).not.toMatch(/^We sent a confirmation link/);
  });

  it('allowlists invite and recovery OTP types only', () => {
    expect(isActivationEmailOtpType('invite')).toBe(true);
    expect(isActivationEmailOtpType('recovery')).toBe(true);
    expect(isActivationEmailOtpType('signup')).toBe(false);
    expect(isActivationEmailOtpType('magiclink')).toBe(false);
    expect(isActivationEmailOtpType(undefined)).toBe(false);
  });

  it('maps status labels for directory/detail', () => {
    expect(organizationLifecycleLabel('pending')).toBe('Pending setup');
    expect(administratorAccessLabel('delivery_failed')).toBe('Delivery failed');
    expect(administratorAccessLabel('sent')).toBe('Sent');
    expect(administratorAccessLabel('accepted')).toBe('Invitation accepted');
    expect(
      organizationProfileLabel({ status: 'pending', hasContact: false }),
    ).toBe('Not started');
  });

  it('maps friendly invitation and auth-link errors', () => {
    expect(friendlyInvitationError('EMAIL_MISMATCH')).toMatch(/different email/i);
    expect(friendlyInvitationError('INVITATION_EXPIRED')).toMatch(/expired/i);
    expect(friendlyAuthLinkError('otp_expired').title).toMatch(/no longer valid/i);
    expect(friendlyAuthLinkError('otp_expired').body).toMatch(/newest|newer email/i);
    expect(friendlyAuthLinkError('access_denied').body).not.toMatch(/token_hash|eyJ/);
  });

  it('categorizes auth invite errors without leaking provider payloads', () => {
    expect(mapAuthInviteErrorCategory('Rate limit exceeded')).toBe('rate_limited');
    expect(mapAuthInviteErrorCategory('User already registered')).toBe('auth_error');
    expect(mapAuthInviteErrorCategory('boom')).toBe('unknown');
  });
});

describe('auth confirm route contracts', () => {
  it('GET page never calls verifyOtp or exchangeCodeForSession', async () => {
    const src = await readWeb('app/auth/confirm/page.tsx');
    expect(src).not.toMatch(/\.verifyOtp\s*\(/);
    expect(src).not.toMatch(/exchangeCodeForSession/);
    expect(src).toMatch(/Continue activation/);
    expect(src).toMatch(/Continue password reset/);
    expect(src).toMatch(/Confirm your worker email/);
    expect(src).toMatch(/isAuthConfirmEmailOtpType|isWorkerSignupConfirmNext/);
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it('POST action calls verifyOtp exactly once with allow-listed types', async () => {
    const src = await readWeb('app/auth/confirm/actions.ts');
    const matches = src.match(/\.verifyOtp\s*\(/g) ?? [];
    expect(matches.length).toBe(1);
    expect(src).toMatch(/isAuthConfirmEmailOtpType/);
    expect(src).toMatch(/allowlistedActivationNext/);
    expect(src).toMatch(/token_hash/);
    expect(src).toMatch(/signup/);
    expect(src).toMatch(/isWorkerSignupConfirmNext/);
    expect(src).not.toMatch(/console\.(log|info|debug|error).*token/i);
  });

  it('confirm form posts token_hash and disables double submit', async () => {
    const src = await readWeb('components/auth/confirm-activation-form.tsx');
    expect(src).toMatch(/token_hash/);
    expect(src).toMatch(/disabled=\{pending\}/);
    expect(src).toMatch(/Continue activation/);
  });

  it('next.config sets no-store / no-referrer / noindex for confirm', async () => {
    const src = await readWeb('next.config.ts');
    expect(src).toMatch(/\/auth\/confirm/);
    expect(src).toMatch(/no-store/);
    expect(src).toMatch(/no-referrer/);
    expect(src).toMatch(/noindex/);
  });

  it('auth error page maps otp_expired without dumping query secrets', async () => {
    const src = await readWeb('app/auth/error/page.tsx');
    expect(src).toMatch(/friendlyAuthLinkError/);
    expect(src).toMatch(/Back to sign in/);
    expect(src).not.toMatch(/error_description/);
  });
});

describe('provisioning orchestration contracts', () => {
  it('admin send uses redirectTo activate path and updates existing-user metadata', async () => {
    const src = await readWeb('lib/supabase/admin.ts');
    expect(src).toMatch(/buildActivationRedirectTo/);
    expect(src).toMatch(/inviteUserByEmail/);
    expect(src).toMatch(/resetPasswordForEmail/);
    expect(src).toMatch(/updateUserById/);
    expect(src).toMatch(/invitation_id/);
    expect(src).toMatch(/import 'server-only'/);
    expect(src).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
    expect(src).not.toMatch(/raw_token/);
  });

  it('create path requires platform_super_admin and omits raw_token by default', async () => {
    const src = await readWeb('app/actions/admin-organizations.ts');
    expect(src).toMatch(/requirePlatformAdmin\('platform_super_admin'\)/);
    expect(src).toMatch(/resendOrganizationActivationAction/);
    expect(src).toMatch(/assert_invitation_resend_allowed/);
  });

  it('activation accepts by invitation id after password update', async () => {
    const src = await readWeb('app/actions/organization-activation.ts');
    expect(src).toMatch(/updateUser/);
    expect(src).toMatch(/accept_organization_invitation_by_id/);
    expect(src).not.toMatch(/raw_token/);
    // Cookie cleared only after successful accept (retry-safe on membership failure)
    expect(src).toMatch(/clearOrganizationInvitationCookie/);
  });

  it('resend UI warns that only the newest email is valid', async () => {
    const src = await readWeb('components/admin/activation-controls.tsx');
    expect(src).toMatch(/newest email/);
    expect(src).toMatch(/Sending…/);
    expect(src).toMatch(/disabled=\{pending\}/);
  });
});

describe('sign-up invitation gate', () => {
  it('signUpAction blocks orphan organization signup', async () => {
    const src = await readWeb('app/actions/auth.ts');
    expect(src).toMatch(/Organization invitation required/);
    expect(src).toMatch(/activate-organization-account/);
  });

  it('sign-up page shows invitation-required messaging', async () => {
    const src = await readWeb('app/sign-up/page.tsx');
    expect(src).toMatch(/invitation required|Organization invitation/i);
  });
});

describe('worker verification package migration', () => {
  it('adds migration 024 for profile bootstrap and package submit', async () => {
    const dir = await fs.readdir(path.join(repoRoot, 'supabase/migrations'));
    expect(dir).toContain('024_worker_package_submit_and_profile_bootstrap.sql');
    expect(dir).toContain('023_organization_account_activation.sql');
  });
});
