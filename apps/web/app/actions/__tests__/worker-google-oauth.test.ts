import {
  isAllowedWorkerOAuthRedirectUri,
  isWorkerAccountSetupRouteAllowed,
  workerGoogleOAuthCancelMessage,
  workerGoogleOAuthErrorMessage,
  WORKER_OAUTH_CALLBACK_PATH,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

const mobileRoot = path.resolve(process.cwd(), '../worker-mobile');

async function readMobile(...parts: string[]) {
  return fs.readFile(path.join(mobileRoot, ...parts), 'utf8');
}

describe('worker Google OAuth helpers', () => {
  it('allowlists bridgehive and Expo web callback URIs and rejects open redirects', () => {
    expect(WORKER_OAUTH_CALLBACK_PATH).toBe('/auth/callback');
    expect(isAllowedWorkerOAuthRedirectUri('bridgehive://auth/callback')).toBe(true);
    expect(isAllowedWorkerOAuthRedirectUri('http://localhost:8081/auth/callback')).toBe(true);
    expect(isAllowedWorkerOAuthRedirectUri('https://evil.example/phish')).toBe(false);
    expect(isAllowedWorkerOAuthRedirectUri('//evil.com')).toBe(false);
    expect(isAllowedWorkerOAuthRedirectUri('http://localhost:3000/auth/callback')).toBe(false);
    expect(isAllowedWorkerOAuthRedirectUri('bridgehive://other')).toBe(false);
  });

  it('maps cancel and provider errors without leaking tokens', () => {
    expect(workerGoogleOAuthCancelMessage()).toMatch(/cancelled/i);
    expect(workerGoogleOAuthErrorMessage('provider_disabled')).toMatch(/not enabled/i);
    expect(workerGoogleOAuthErrorMessage('session_not_established')).not.toMatch(/eyJ|token/i);
  });

  it('allows choose-role during account setup', () => {
    expect(isWorkerAccountSetupRouteAllowed('/auth/worker/choose-role')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/auth/callback')).toBe(true);
  });
});

describe('worker Google OAuth mobile contracts', () => {
  it('uses signInWithOAuth google with skipBrowserRedirect and WebBrowser', async () => {
    const src = await readMobile('lib/oauth.ts');
    expect(src).toMatch(/signInWithOAuth/);
    expect(src).toMatch(/provider:\s*['"]google['"]/);
    expect(src).toMatch(/skipBrowserRedirect:\s*true/);
    expect(src).toMatch(/openAuthSessionAsync/);
    expect(src).toMatch(/exchangeCodeForSession|setSession/);
    expect(src).toMatch(/consumedAuthCodes|rememberConsumedCode/);
    expect(src).not.toMatch(/activate-organization-account/);
    expect(src).not.toMatch(/localhost:3000/);
  });

  it('disables detectSessionInUrl so PKCE codes are not double-exchanged', async () => {
    const src = await readMobile('lib/supabase.ts');
    expect(src).toMatch(/detectSessionInUrl:\s*false/);
  });

  it('routes new workers without profile to choose-role', async () => {
    const src = await readMobile('providers/AuthProvider.tsx');
    expect(src).toMatch(/choose-role/);
    expect(src).toMatch(/signInWithGoogle/);
    expect(src).toMatch(/completeWorkerRoleSetup/);
    expect(src).toMatch(/ensure_my_worker_profile/);
  });

  it('exposes Continue with Google on login and register', async () => {
    const login = await readMobile('app/auth/worker/login.tsx');
    const register = await readMobile('app/auth/worker/register.tsx');
    expect(login).toMatch(/GoogleSignInButton/);
    expect(register).toMatch(/GoogleSignInButton/);
  });

  it('keeps email password recovery path', async () => {
    const src = await readMobile('providers/AuthProvider.tsx');
    expect(src).toMatch(/resetPasswordForEmail/);
    expect(src).toMatch(/signInWithPassword/);
  });
});
