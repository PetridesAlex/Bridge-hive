import {
  WORKER_CONFIRM_RESEND_COOLDOWN_MS,
  WORKER_RECOVERY_NATIVE_FALLBACK_REDIRECT_TO,
  WORKER_RECOVERY_PASSWORD_MIN_LENGTH,
  WORKER_RECOVERY_PRODUCTION_REDIRECT_TO,
  WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE,
  applyWorkerRecoveryEmailTemplateAppend,
  isValidWorkerRecoveryEmail,
  mapWorkerRecoveryRequestResult,
  isWorkerRecoveryDeepLinkCandidate,
  parseWorkerRecoveryUrl,
  resolveWorkerRecoveryRedirectTo,
  shouldMarkWorkerRecoverySession,
  validateWorkerRecoveryPassword,
  workerRecoveryNativeFallbackRedirectTo,
  workerRecoveryRedirectToHasQuerySeparator,
  workerRecoveryRedirectToOrFallback,
  workerRecoveryResendCooldownMs,
  workerRecoveryResendCooldownSeconds,
  workerRecoveryUrlErrorMessage,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();
const mobileRoot = path.resolve(webRoot, '../worker-mobile');
const domainRoot = path.resolve(webRoot, '../../packages/domain/src');

async function read(...parts: string[]) {
  return fs.readFile(path.join(...parts), 'utf8');
}

describe('worker password recovery — redirect construction', () => {
  const nativeFallback = WORKER_RECOVERY_NATIVE_FALLBACK_REDIRECT_TO;

  it('builds the exact production confirm redirect for public Bridge Hive origins', () => {
    for (const web of [
      'https://bridgehive.app',
      'https://www.bridgehive.app',
      'https://bridgehive.app/',
    ]) {
      const result = resolveWorkerRecoveryRedirectTo({
        webAppUrl: web,
        nativeFallback,
        mode: 'production',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.redirectTo).toBe(WORKER_RECOVERY_PRODUCTION_REDIRECT_TO);
        expect(result.redirectTo).toBe(
          'https://bridgehive.app/(app)/auth/confirm?next=%2Fauth%2Fworker%2Freset-password',
        );
        expect(result.source).toBe('web');
      }
    }
  });

  it('rejects localhost redirect URLs in production and falls back to native', () => {
    for (const web of [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://[::1]:3000',
    ]) {
      const result = resolveWorkerRecoveryRedirectTo({
        webAppUrl: web,
        nativeFallback,
        mode: 'production',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('production_loopback');
      }
      expect(
        workerRecoveryRedirectToOrFallback({
          webAppUrl: web,
          nativeFallback,
          mode: 'production',
        }),
      ).toBe(nativeFallback);
    }
  });

  it('rejects non-public hosts in production', () => {
    const result = resolveWorkerRecoveryRedirectTo({
      webAppUrl: 'https://evil.example',
      nativeFallback,
      mode: 'production',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('production_non_public');
    }
  });

  it('allows loopback confirm URLs in development mode', () => {
    const result = resolveWorkerRecoveryRedirectTo({
      webAppUrl: 'http://localhost:3000',
      nativeFallback,
      mode: 'development',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectTo).toContain('/auth/confirm?next=');
      expect(result.redirectTo).toContain('localhost');
    }
  });

  it('uses native fallback when web URL is unset', () => {
    const result = resolveWorkerRecoveryRedirectTo({
      webAppUrl: null,
      nativeFallback,
      mode: 'production',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectTo).toBe(nativeFallback);
      expect(result.source).toBe('native_fallback');
    }
  });
});

describe('worker password recovery — native fallback email-template safety', () => {
  it('resolves native fallback to bridgehive URL with ?source=recovery', () => {
    expect(workerRecoveryNativeFallbackRedirectTo()).toBe(
      'bridgehive://auth/worker/reset-password?source=recovery',
    );
    expect(WORKER_RECOVERY_NATIVE_FALLBACK_REDIRECT_TO).toBe(
      'bridgehive://auth/worker/reset-password?source=recovery',
    );
    expect(
      workerRecoveryRedirectToHasQuerySeparator(
        WORKER_RECOVERY_NATIVE_FALLBACK_REDIRECT_TO,
      ),
    ).toBe(true);
  });

  it('parses successfully after template appends &token_hash=&type=recovery', () => {
    const redirectTo = workerRecoveryNativeFallbackRedirectTo();
    const finalUrl = applyWorkerRecoveryEmailTemplateAppend(
      redirectTo,
      'native-token-hash-value',
    );
    expect(finalUrl).toBe(
      'bridgehive://auth/worker/reset-password?source=recovery&token_hash=native-token-hash-value&type=recovery',
    );
    const parsed = parseWorkerRecoveryUrl(finalUrl);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.tokenHash).toBe('native-token-hash-value');
      expect(parsed.type).toBe('recovery');
    }
  });

  it('does not use a query-less native fallback for the email flow', () => {
    const unsafe = 'bridgehive://auth/worker/reset-password';
    expect(workerRecoveryRedirectToHasQuerySeparator(unsafe)).toBe(false);
    expect(workerRecoveryNativeFallbackRedirectTo()).not.toBe(unsafe);
    expect(workerRecoveryNativeFallbackRedirectTo()).toContain('?source=recovery');
    // Template append on a query-less RedirectTo would produce an invalid URL
    // (…reset-password&token_hash=…) that must not be the app's fallback.
    const broken = applyWorkerRecoveryEmailTemplateAppend(unsafe, 'x');
    expect(broken).toBe(
      'bridgehive://auth/worker/reset-password&token_hash=x&type=recovery',
    );
    expect(parseWorkerRecoveryUrl(broken).ok).toBe(false);
  });

  it('mobile AuthProvider uses the query-bearing native fallback constant', async () => {
    const auth = await read(mobileRoot, 'providers/AuthProvider.tsx');
    expect(auth).toMatch(/workerRecoveryNativeFallbackRedirectTo/);
    expect(auth).toMatch(/workerRecoveryRedirectToOrFallback/);
    // Must not rebuild a bare path-only bridgehive recovery RedirectTo.
    expect(auth).not.toMatch(
      /workerAppRedirectTo\(\s*DEFAULT_WORKER_RECOVERY_NEXT\s*\)/,
    );
  });
});

describe('worker password recovery — anti-enumeration and email', () => {
  it('returns the generic success message when the provider succeeds', () => {
    const mapped = mapWorkerRecoveryRequestResult({});
    expect(mapped.success).toBe(true);
    if (mapped.success) {
      expect(mapped.message).toBe(WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE);
    }
  });

  it('maps account-not-found provider errors to the same success message', () => {
    for (const msg of [
      'User not found',
      'Email not found',
      'Unable to find user with the given identity',
    ]) {
      const mapped = mapWorkerRecoveryRequestResult({ providerErrorMessage: msg });
      expect(mapped.success).toBe(true);
      if (mapped.success) {
        expect(mapped.message).toBe(WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE);
      }
    }
  });

  it('does not reveal account existence on other provider failures', () => {
    const mapped = mapWorkerRecoveryRequestResult({
      providerErrorMessage: 'smtp misconfigured',
    });
    expect(mapped.success).toBe(false);
    if (!mapped.success) {
      expect(mapped.error.toLowerCase()).not.toMatch(/exist|not found|registered/);
    }
  });

  it('validates email shape without leaking accounts', () => {
    expect(isValidWorkerRecoveryEmail('nurse@bridgehive.app')).toBe(true);
    expect(isValidWorkerRecoveryEmail('not-an-email')).toBe(false);
    expect(isValidWorkerRecoveryEmail('')).toBe(false);
    expect(isValidWorkerRecoveryEmail('a@b')).toBe(false);
  });
});

describe('worker password recovery — resend cooldown', () => {
  it('uses the shared 60-second cooldown constant', () => {
    expect(workerRecoveryResendCooldownMs()).toBe(WORKER_CONFIRM_RESEND_COOLDOWN_MS);
    expect(WORKER_CONFIRM_RESEND_COOLDOWN_MS).toBe(60_000);
  });

  it('reports remaining cooldown seconds', () => {
    const until = 1_000_000;
    expect(workerRecoveryResendCooldownSeconds(until, until - 30_500)).toBe(31);
    expect(workerRecoveryResendCooldownSeconds(until, until)).toBe(0);
    expect(workerRecoveryResendCooldownSeconds(until, until + 1)).toBe(0);
  });
});

describe('worker password recovery — password policy', () => {
  it('requires minimum 6 characters and matching confirmation only', () => {
    expect(WORKER_RECOVERY_PASSWORD_MIN_LENGTH).toBe(6);

    expect(
      validateWorkerRecoveryPassword({ password: 'short', confirm: 'short' }).ok,
    ).toBe(false);
    expect(
      validateWorkerRecoveryPassword({ password: 'Bridg', confirm: 'Bridg' }).ok,
    ).toBe(false);

    // Letters-only six-character passwords are allowed (e.g. Bridge).
    expect(
      validateWorkerRecoveryPassword({ password: 'Bridge', confirm: 'Bridge' }),
    ).toEqual({ ok: true });

    // Digits are optional — matching 6+ without a number must pass.
    expect(
      validateWorkerRecoveryPassword({
        password: 'abcdef',
        confirm: 'abcdef',
      }),
    ).toEqual({ ok: true });

    expect(
      validateWorkerRecoveryPassword({
        password: 'Bridge',
        confirm: 'Bridges',
      }).ok,
    ).toBe(false);
  });

  it('domain helper does not require letters or numbers', async () => {
    const src = await read(domainRoot, 'worker-password-recovery.ts');
    expect(src).toMatch(/WORKER_RECOVERY_PASSWORD_MIN_LENGTH = 6/);
    expect(src).not.toMatch(/at least one letter/);
    expect(src).not.toMatch(/at least one number/);
    expect(src).not.toMatch(/\[A-Za-z\]/);
    expect(src).not.toMatch(/\[0-9\]/);
  });
});

describe('worker password recovery — URL parsing and explicit confirm', () => {
  it('accepts public confirm URLs with token_hash and type=recovery', () => {
    const parsed = parseWorkerRecoveryUrl(
      'https://bridgehive.app/(app)/auth/confirm?next=%2Fauth%2Fworker%2Freset-password&token_hash=abc123&type=recovery',
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.tokenHash).toBe('abc123');
      expect(parsed.type).toBe('recovery');
    }
  });

  it('accepts native bridgehive recovery deep links and ignores source=recovery', () => {
    const parsed = parseWorkerRecoveryUrl(
      'bridgehive://auth/worker/reset-password?source=recovery&token_hash=nativehash&type=recovery',
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.tokenHash).toBe('nativehash');
      expect(parsed.type).toBe('recovery');
    }
  });

  it('rejects malformed, wrong-scheme, wrong-origin, wrong-type, and missing token URLs', () => {
    expect(parseWorkerRecoveryUrl('not a url').ok).toBe(false);
    expect(parseWorkerRecoveryUrl('javascript:alert(1)').ok).toBe(false);
    expect(
      parseWorkerRecoveryUrl(
        'https://evil.example/auth/confirm?token_hash=x&type=recovery',
      ).ok,
    ).toBe(false);
    expect(
      parseWorkerRecoveryUrl(
        'https://bridgehive.app/(app)/auth/confirm?token_hash=x&type=invite',
      ).ok,
    ).toBe(false);
    expect(
      parseWorkerRecoveryUrl(
        'https://bridgehive.app/(app)/auth/confirm?type=recovery',
      ).ok,
    ).toBe(false);
    const oauth = parseWorkerRecoveryUrl(
      'https://bridgehive.app/(app)/auth/callback?code=xyz',
    );
    expect(oauth.ok).toBe(false);
    if (!oauth.ok) expect(oauth.reason).toBe('oauth_callback');
  });

  it('rejects expired / access_denied recovery links', () => {
    const expired = parseWorkerRecoveryUrl(
      'https://bridgehive.app/(app)/auth/confirm?error_code=otp_expired&type=recovery',
    );
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toBe('expired');
    const denied = parseWorkerRecoveryUrl(
      'https://bridgehive.app/(app)/auth/confirm?error=access_denied&type=recovery',
    );
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe('access_denied');
    expect(workerRecoveryUrlErrorMessage('expired')).not.toMatch(/token|eyJ/);
  });

  it('ignores Metro / unrelated opens as recovery deep-link candidates', () => {
    expect(isWorkerRecoveryDeepLinkCandidate('exp://192.168.1.1:8081')).toBe(false);
    expect(isWorkerRecoveryDeepLinkCandidate('exp://127.0.0.1:8081/--/')).toBe(false);
    expect(isWorkerRecoveryDeepLinkCandidate('bridgehive://welcome')).toBe(false);
    expect(isWorkerRecoveryDeepLinkCandidate('https://bridgehive.app/')).toBe(false);
    expect(isWorkerRecoveryDeepLinkCandidate(null)).toBe(false);
    expect(
      isWorkerRecoveryDeepLinkCandidate(
        'bridgehive://auth/worker/reset-password?source=recovery&token_hash=abc&type=recovery',
      ),
    ).toBe(true);
    expect(
      isWorkerRecoveryDeepLinkCandidate(
        'https://bridgehive.app/(app)/auth/confirm?token_hash=abc&type=recovery&next=%2Fauth%2Fworker%2Freset-password',
      ),
    ).toBe(true);
    expect(
      isWorkerRecoveryDeepLinkCandidate(
        'https://bridgehive.app/(app)/auth/confirm?error_code=otp_expired&type=recovery',
      ),
    ).toBe(true);
  });

  it('marks recovery sessions only for recovery + worker reset next', () => {
    expect(
      shouldMarkWorkerRecoverySession('recovery', '/auth/worker/reset-password'),
    ).toBe(true);
    expect(
      shouldMarkWorkerRecoverySession('invite', '/activate-organization-account'),
    ).toBe(false);
    expect(
      shouldMarkWorkerRecoverySession('signup', '/auth/worker/login'),
    ).toBe(false);
  });
});

describe('worker password recovery — source contracts', () => {
  it('web confirm GET never verifies OTP or mutates auth state', async () => {
    const src = await read(webRoot, 'app/(app)/auth/confirm/page.tsx');
    expect(src).toMatch(/GET must never consume Auth OTPs/);
    expect(src).not.toMatch(/verifyOtp/);
    expect(src).not.toMatch(/updateUser/);
    expect(src).not.toMatch(/resetPasswordForEmail/);
  });

  it('web confirm POST verifies OTP only after explicit form submit', async () => {
    const actions = await read(webRoot, 'app/(app)/auth/confirm/actions.ts');
    expect(actions).toMatch(/Explicit user POST only/);
    expect(actions).toMatch(/verifyOtp/);
    expect(actions).toMatch(/shouldMarkWorkerRecoverySession/);
    expect(actions).toMatch(/WORKER_RECOVERY_SESSION_COOKIE/);
    expect(actions).toMatch(/path:\s*['"]\/auth\/worker\/reset-password['"]/);
  });

  it('web reset GET page does not call verifyOtp or updateUser inline', async () => {
    const page = await read(webRoot, 'app/(app)/auth/worker/reset-password/page.tsx');
    const client = await read(
      webRoot,
      'app/(app)/auth/worker/reset-password/worker-reset-password-client.tsx',
    );
    expect(page).toMatch(/GET never verifies OTP/);
    expect(page).not.toMatch(/verifyOtp/);
    expect(page).not.toMatch(/\.updateUser\(/);
    expect(page).toMatch(/WorkerResetPasswordClient/);
    expect(client).toMatch(/updateWorkerRecoveryPasswordAction/);
    expect(client).toMatch(/Password updated/);
    expect(client).toMatch(/Continue to sign in/);
    expect(client).toMatch(/Back to sign in/);
    expect(client).not.toMatch(/Back to home/);
    expect(client).toMatch(/AuthPasswordField/);
    expect(client).toMatch(/At least \$\{WORKER_RECOVERY_PASSWORD_MIN_LENGTH\} characters/);
    expect(client).toMatch(/Passwords match/);
    expect(client).toMatch(/AuthShell/);
    expect(client).toMatch(/SECURE ACCOUNT RECOVERY/);
    const passwordField = await read(webRoot, 'components/auth/AuthPasswordField.tsx');
    expect(passwordField).toMatch(/Show password/);
    expect(passwordField).toMatch(/Hide password/);
  });

  it('web reset action requires recovery cookie and signs out after success', async () => {
    const actions = await read(webRoot, 'app/(app)/auth/worker/reset-password/actions.ts');
    expect(actions).toMatch(/WORKER_RECOVERY_SESSION_COOKIE/);
    expect(actions).toMatch(/validateWorkerRecoveryPassword/);
    expect(actions).toMatch(/updateUser/);
    expect(actions).toMatch(/signOut/);
    expect(actions).not.toMatch(/console\.(log|debug|info|warn)/);
  });

  it('mobile login navigates to forgot-password instead of inline reset', async () => {
    const login = await read(mobileRoot, 'app/(app)/auth/worker/login.tsx');
    expect(login).toMatch(/forgot-password/);
    expect(login).not.toMatch(/resetPassword\(/);
    expect(login).not.toMatch(/Alert\.alert/);
  });

  it('mobile forgot-password screen has cooldown, generic success, and a11y', async () => {
    const src = await read(mobileRoot, 'app/(app)/auth/worker/forgot-password.tsx');
    expect(src).toMatch(/WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE/);
    expect(src).toMatch(/workerRecoveryResendCooldown/);
    expect(src).toMatch(/accessibilityLabel/);
    expect(src).toMatch(/accessibilityLiveRegion/);
    expect(src).toMatch(/Back to sign in/);
    expect(src).not.toMatch(/console\.(log|debug|info)/);
  });

  it('mobile reset requires explicit confirm before verifyOtp', async () => {
    const screen = await read(mobileRoot, 'app/(app)/auth/worker/reset-password.tsx');
    const auth = await read(mobileRoot, 'providers/AuthProvider.tsx');
    expect(screen).toMatch(/Continue password reset/);
    expect(screen).toMatch(/confirmRecoveryOtp/);
    expect(screen).toMatch(/Use at least \$\{WORKER_RECOVERY_PASSWORD_MIN_LENGTH\} characters/);
    expect(screen).toMatch(/Passwords match/);
    expect(screen).toMatch(/Back to sign in/);
    expect(screen).toMatch(/Request a new reset link/);
    expect(screen).toMatch(/Continue to sign in/);
    expect(auth).toMatch(/verifyOtp/);
    expect(auth).toMatch(/type:\s*['"]recovery['"]/);
    expect(auth).toMatch(/parseWorkerRecoveryUrl/);
    expect(auth).toMatch(/isWorkerRecoveryDeepLinkCandidate/);
    expect(auth).toMatch(/workerRecoveryRedirectToOrFallback/);
    // Auto-verify on link open is forbidden — ingest only stores the token.
    const ingestBlock = auth.match(
      /function ingestRecoveryDeepLink\([\s\S]*?\n\}/,
    )?.[0];
    expect(ingestBlock).toBeTruthy();
    expect(ingestBlock).not.toMatch(/verifyOtp/);
    expect(ingestBlock).toMatch(/setPendingRecoveryTokenHash/);
    expect(ingestBlock).toMatch(/isWorkerRecoveryDeepLinkCandidate/);
  });

  it('web and mobile recovery UIs share the 6-character policy without letter/number rules', async () => {
    const client = await read(
      webRoot,
      'app/(app)/auth/worker/reset-password/worker-reset-password-client.tsx',
    );
    const mobile = await read(mobileRoot, 'app/(app)/auth/worker/reset-password.tsx');
    const passwordField = await read(webRoot, 'components/auth/AuthPasswordField.tsx');
    for (const src of [client, mobile]) {
      expect(src).toMatch(/WORKER_RECOVERY_PASSWORD_MIN_LENGTH/);
      expect(src).toMatch(/validateWorkerRecoveryPassword|At least \$\{WORKER_RECOVERY_PASSWORD_MIN_LENGTH\}/);
      expect(src).not.toMatch(/letter and a number|at least one letter|at least one number/i);
    }
    expect(passwordField).toMatch(/Show password/);
    expect(passwordField).toMatch(/Hide password/);
    expect(client).toMatch(/AuthPasswordField/);
    expect(mobile).toMatch(/secureTextEntry/);
  });

  it('does not log passwords, tokens, emails, or sessions in recovery modules', async () => {
    const files = [
      await read(domainRoot, 'worker-password-recovery.ts'),
      await read(mobileRoot, 'lib/pending-recovery.ts'),
      await read(mobileRoot, 'app/(app)/auth/worker/forgot-password.tsx'),
      await read(mobileRoot, 'app/(app)/auth/worker/reset-password.tsx'),
      await read(webRoot, 'app/(app)/auth/worker/reset-password/actions.ts'),
      await read(webRoot, 'app/(app)/auth/worker/reset-password/page.tsx'),
      await read(
        webRoot,
        'app/(app)/auth/worker/reset-password/worker-reset-password-client.tsx',
      ),
    ];
    for (const src of files) {
      expect(src).not.toMatch(/console\.(log|debug|info|warn|error)\([^)]*(password|token|session|email)/i);
      expect(src).not.toMatch(/console\.(log|debug|info)\(\s*url/i);
    }
  });

  it('hosted docs document production env and exact redirect', async () => {
    const doc = await read(webRoot, '../../docs/worker-password-recovery-hosted.md');
    expect(doc).toMatch(/EXPO_PUBLIC_WEB_APP_URL=https:\/\/bridgehive\.app/);
    expect(doc).toMatch(
      /https:\/\/bridgehive\.app\/auth\/confirm\?next=%2Fauth%2Fworker%2Freset-password/,
    );
    expect(doc).toMatch(
      /bridgehive:\/\/auth\/worker\/reset-password\?source=recovery/,
    );
    expect(doc).toMatch(
      /\{\{ \.RedirectTo \}\}&token_hash=\{\{ \.TokenHash \}\}&type=recovery/,
    );
    expect(doc).toMatch(/Do not put.*token_hash/i);
  });
});
