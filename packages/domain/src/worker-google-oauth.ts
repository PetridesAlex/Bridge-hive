/**
 * Worker Google OAuth redirect helpers (pure).
 * Browser-based Supabase Auth → app deep link; never org web Site URL as native redirect.
 */

export const WORKER_OAUTH_CALLBACK_PATH = '/auth/callback';

/** Schemes allowed for worker OAuth return URLs. */
export const WORKER_OAUTH_ALLOWED_SCHEMES = [
  'bridgehive',
  'http',
  'https',
  'exp',
] as const;

/**
 * True when a candidate redirect URI is safe for worker OAuth return.
 * Rejects protocol-relative URLs, missing schemes, and unknown schemes.
 * Does not authorize arbitrary hosts for http(s) beyond local Expo web patterns —
 * callers still pass makeRedirectUri-generated values only.
 */
export function isAllowedWorkerOAuthRedirectUri(
  candidate: string | null | undefined,
): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const value = candidate.trim();
  if (!value || value.includes('\\') || value.startsWith('//')) return false;

  try {
    const url = new URL(value);
    if (
      !(WORKER_OAUTH_ALLOWED_SCHEMES as readonly string[]).includes(url.protocol.replace(':', ''))
    ) {
      return false;
    }
    if (url.protocol === 'bridgehive:') {
      return url.pathname.includes('auth/callback') || url.host === 'auth';
    }
    if (url.protocol === 'exp:') {
      return true;
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const host = url.hostname;
      const isExpoWebLocal =
        (host === 'localhost' || host === '127.0.0.1') &&
        (url.port === '8081' || url.port === '');
      const isExpoHosted =
        host.endsWith('.exp.direct') || host.endsWith('.expo.dev');
      if (!isExpoWebLocal && !isExpoHosted) return false;
      if (url.protocol === 'http:' && !isExpoWebLocal && !isExpoHosted) return false;
      return url.pathname.includes('/auth/callback');
    }
    return false;
  } catch {
    return false;
  }
}

export function workerGoogleOAuthCancelMessage(): string {
  return 'Google sign-in was cancelled. You can try again or use email and password.';
}

export function workerGoogleOAuthErrorMessage(kind: string): string {
  switch (kind) {
    case 'provider_disabled':
      return 'Google sign-in is not enabled yet. Use email and password, or ask support.';
    case 'redirect_mismatch':
      return 'Google sign-in could not return to this app. Check redirect allow-list settings.';
    case 'timeout':
      return 'Google sign-in timed out. Please try again.';
    case 'session_not_established':
      return 'Signed in with Google, but the session was not established. Please try again.';
    case 'cancel':
      return workerGoogleOAuthCancelMessage();
    default:
      return 'Google sign-in failed. Please try again or use email and password.';
  }
}
