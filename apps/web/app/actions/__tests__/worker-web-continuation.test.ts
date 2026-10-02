import {
  DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT,
  WORKER_APP_LOGIN_DEEP_LINK,
  allowlistedActivationNext,
  isAuthConfirmEmailOtpType,
  isWorkerSignupConfirmNext,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();

async function readWeb(...parts: string[]) {
  return fs.readFile(path.join(webRoot, ...parts), 'utf8');
}

describe('worker web email continuation', () => {
  it('allowlists signup → /auth/worker/login through auth confirm', () => {
    expect(allowlistedActivationNext('/auth/worker/login')).toBe(
      DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT,
    );
    expect(isWorkerSignupConfirmNext('/auth/worker/login')).toBe(true);
    expect(isAuthConfirmEmailOtpType('signup', '/auth/worker/login')).toBe(true);
    expect(isAuthConfirmEmailOtpType('signup', '/activate-organization-account')).toBe(
      false,
    );
  });

  it('exposes a token-free worker app deep link', () => {
    expect(WORKER_APP_LOGIN_DEEP_LINK).toBe('bridgehive://auth/worker/login');
    expect(WORKER_APP_LOGIN_DEEP_LINK).not.toMatch(/token|hash|code=/i);
  });

  it('worker login page is server-rendered and never verifies OTP on GET', async () => {
    const src = await readWeb('app/auth/worker/login/page.tsx');
    expect(src).toMatch(/WorkerAppContinuePanel/);
    expect(src).toMatch(/getUser\(\)/);
    expect(src).toMatch(/email_confirmed_at/);
    expect(src).toMatch(/signup-confirmed|neutral/);
    expect(src).not.toMatch(/verifyOtp/);
    expect(src).not.toMatch(/token_hash/);
    expect(src).not.toMatch(/\/sign-in/);
  });

  it('worker login page uses neutral wording when email is not proven', async () => {
    const src = await readWeb('app/auth/worker/login/page.tsx');
    expect(src).toMatch(/Continue in the worker app/);
    expect(src).toMatch(/variant = emailConfirmed \? 'signup-confirmed' : 'neutral'/);
  });

  it('worker app continue panel avoids org dashboard and token URLs', async () => {
    const src = await readWeb('components/auth/worker-app-continue.tsx');
    expect(src).toMatch(/WORKER_APP_LOGIN_DEEP_LINK/);
    expect(src).toMatch(/Open Bridge Hive worker app/);
    expect(src).toMatch(/not organization administrators/);
    expect(src).not.toMatch(/\/sign-in/);
    expect(src).not.toMatch(/activate-organization-account/);
    expect(src).not.toMatch(/token_hash|access_token|refresh_token/i);
  });

  it('worker reset-password success routes to worker app not org sign-in', async () => {
    const src = await readWeb('app/auth/worker/reset-password/page.tsx');
    expect(src).toMatch(/WorkerAppContinuePanel/);
    expect(src).toMatch(/variant="password-updated"/);
    expect(src).not.toMatch(/href="\/sign-in"/);
    expect(src).not.toMatch(/push\('\/sign-in'\)/);
  });

  it('auth confirm POST still redirects signup to allowlisted worker login', async () => {
    const src = await readWeb('app/auth/confirm/actions.ts');
    expect(src).toMatch(/redirect\(next\)/);
    expect(src).toMatch(/isWorkerSignupConfirmNext/);
    expect(src).toMatch(/verifyOtp/);
  });

  it('next.config protects worker auth paths from caching and indexing', async () => {
    const src = await readWeb('next.config.ts');
    expect(src).toMatch(/\/auth\/worker\/:path\*/);
    expect(src).toMatch(/no-store/);
    expect(src).toMatch(/noindex/);
  });

  it('hosted confirm signup template contract matches worker login next', async () => {
    const doc = await fs.readFile(
      path.resolve(webRoot, '../../docs/worker-email-confirmation-hosted.md'),
      'utf8',
    );
    expect(doc).toMatch(/type=signup/);
    expect(doc).toMatch(/next=\/auth\/worker\/login/);
    expect(doc).not.toMatch(/next=\/activate-organization-account/);
  });

  it('mobile signup emailRedirectTo targets worker login path', async () => {
    const src = await fs.readFile(
      path.resolve(webRoot, '../worker-mobile/providers/AuthProvider.tsx'),
      'utf8',
    );
    expect(src).toMatch(/DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT/);
    expect(src).toMatch(/workerSignupConfirmRedirectTo/);
    expect(src).toMatch(/EXPO_PUBLIC_WEB_APP_URL/);
    expect(src).toMatch(/bridgehive:\/\//);
  });
});
