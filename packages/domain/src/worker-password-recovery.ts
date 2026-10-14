/**
 * Pure helpers for worker password recovery (mobile + web).
 * Never log tokens, passwords, emails, sessions, or full reset URLs.
 */

import {
  DEFAULT_WORKER_RECOVERY_NEXT,
  WORKER_CONFIRM_RESEND_COOLDOWN_MS,
  buildAuthConfirmRedirectTo,
  isLoopbackAppOrigin,
  isWorkerRecoveryNext,
} from './organization-activation';

/** Canonical production web origin for Auth confirm redirects. */
export const WORKER_RECOVERY_PUBLIC_ORIGIN = 'https://bridgehive.app';

/** Hosts treated as the public Bridge Hive web app. */
export const WORKER_RECOVERY_PUBLIC_HOSTS = [
  'bridgehive.app',
  'www.bridgehive.app',
] as const;

/** Exact production redirectTo used by resetPasswordForEmail. */
export const WORKER_RECOVERY_PRODUCTION_REDIRECT_TO = buildAuthConfirmRedirectTo(
  WORKER_RECOVERY_PUBLIC_ORIGIN,
  DEFAULT_WORKER_RECOVERY_NEXT,
);

/**
 * Native deep-link fallback when EXPO_PUBLIC_WEB_APP_URL is unset/rejected.
 * Includes a harmless `?source=recovery` so the shared Reset Password template
 * can safely append `&token_hash=…&type=recovery` (requires an existing `?`).
 * Do not put token_hash in Supabase Redirect URL settings.
 */
export const WORKER_RECOVERY_NATIVE_FALLBACK_REDIRECT_TO =
  'bridgehive://auth/worker/reset-password?source=recovery';

/** Harmless query flag already present on the native fallback RedirectTo. */
export const WORKER_RECOVERY_NATIVE_SOURCE_PARAM = 'source';
export const WORKER_RECOVERY_NATIVE_SOURCE_VALUE = 'recovery';

/** Cookie name marking an explicit worker recovery session (no token value). */
export const WORKER_RECOVERY_SESSION_COOKIE = 'bh_worker_recovery';

/** Max age for the non-secret recovery session marker (30 minutes). */
export const WORKER_RECOVERY_SESSION_COOKIE_MAX_AGE_SEC = 60 * 30;

/** Generic anti-enumeration success copy after a reset request. */
export const WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE =
  "If an account exists for this email, we've sent password reset instructions.";

/** Safe generic failure when the provider rejects a reset for non-enumeration reasons. */
export const WORKER_RECOVERY_REQUEST_GENERIC_ERROR =
  'We could not send password reset instructions right now. Please try again in a moment.';

/** Minimum length for a new worker password after recovery. */
export const WORKER_RECOVERY_PASSWORD_MIN_LENGTH = 12;

export type WorkerRecoveryRedirectMode = 'production' | 'development';

export type WorkerRecoveryRedirectResult =
  | { ok: true; redirectTo: string; source: 'web' | 'native_fallback' }
  | { ok: false; reason: 'invalid_web_url' | 'production_loopback' | 'production_non_public' };

export type WorkerRecoveryUrlParseResult =
  | {
      ok: true;
      tokenHash: string;
      type: 'recovery';
      next: typeof DEFAULT_WORKER_RECOVERY_NEXT;
    }
  | {
      ok: false;
      reason:
        | 'malformed'
        | 'wrong_scheme'
        | 'wrong_origin'
        | 'wrong_type'
        | 'missing_token'
        | 'oauth_callback'
        | 'expired'
        | 'access_denied';
    };

export type WorkerPasswordPolicyResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * True when hostname is a public Bridge Hive web host (apex or www).
 */
export function isPublicBridgeHiveWebHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (WORKER_RECOVERY_PUBLIC_HOSTS as readonly string[]).includes(host);
}

/**
 * Normalize EXPO_PUBLIC_WEB_APP_URL / app public URL for recovery redirects.
 * Returns null when the value cannot be parsed as an absolute http(s) URL.
 */
export function parseWorkerRecoveryWebOrigin(
  raw: string | null | undefined,
): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Build the Auth `redirectTo` for worker password recovery.
 *
 * - Public Bridge Hive origin → exact production confirm URL.
 * - Production mode rejects localhost / non-public hosts (caller uses native fallback).
 * - Development may use a loopback or other http(s) origin for local confirm.
 * - Missing/invalid web URL → native fallback supplied by the app.
 */
export function resolveWorkerRecoveryRedirectTo(params: {
  webAppUrl: string | null | undefined;
  nativeFallback: string;
  mode: WorkerRecoveryRedirectMode;
}): WorkerRecoveryRedirectResult {
  const origin = parseWorkerRecoveryWebOrigin(params.webAppUrl);
  if (!params.webAppUrl?.trim()) {
    return {
      ok: true,
      redirectTo: params.nativeFallback,
      source: 'native_fallback',
    };
  }
  if (!origin) {
    return { ok: false, reason: 'invalid_web_url' };
  }

  const hostname = new URL(origin).hostname.toLowerCase();
  if (isPublicBridgeHiveWebHost(hostname)) {
    return {
      ok: true,
      redirectTo: WORKER_RECOVERY_PRODUCTION_REDIRECT_TO,
      source: 'web',
    };
  }

  if (params.mode === 'production') {
    if (isLoopbackAppOrigin(origin)) {
      return { ok: false, reason: 'production_loopback' };
    }
    return { ok: false, reason: 'production_non_public' };
  }

  // Development: allow loopback / preview origins for local confirm testing.
  return {
    ok: true,
    redirectTo: buildAuthConfirmRedirectTo(origin, DEFAULT_WORKER_RECOVERY_NEXT),
    source: 'web',
  };
}

/**
 * When production reject reasons occur, prefer the native deep-link fallback
 * rather than throwing — keeps recovery usable offline of the web portal.
 */
export function workerRecoveryRedirectToOrFallback(params: {
  webAppUrl: string | null | undefined;
  nativeFallback: string;
  mode: WorkerRecoveryRedirectMode;
}): string {
  const result = resolveWorkerRecoveryRedirectTo(params);
  if (result.ok) return result.redirectTo;
  return params.nativeFallback;
}

/**
 * Canonical native fallback RedirectTo for worker recovery emails.
 * Always includes `?source=recovery` so template `&token_hash=…` is valid.
 */
export function workerRecoveryNativeFallbackRedirectTo(): string {
  return WORKER_RECOVERY_NATIVE_FALLBACK_REDIRECT_TO;
}

/**
 * Simulate the hosted Reset Password template append:
 * `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`
 * Never logs the resulting URL.
 */
export function applyWorkerRecoveryEmailTemplateAppend(
  redirectTo: string,
  tokenHash: string,
): string {
  return `${redirectTo}&token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
}

/** True when RedirectTo already has a query separator (safe for `&token_hash=`). */
export function workerRecoveryRedirectToHasQuerySeparator(
  redirectTo: string,
): boolean {
  try {
    return new URL(redirectTo).search.length > 0 || redirectTo.includes('?');
  } catch {
    return redirectTo.includes('?');
  }
}

/** Basic email shape check for the forgot-password form. */
export function isValidWorkerRecoveryEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254) return false;
  // Practical RFC-ish check without revealing account existence.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function normalizeWorkerRecoveryEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Seconds remaining in a resend cooldown window (0 when idle). */
export function workerRecoveryResendCooldownSeconds(
  cooldownUntilMs: number,
  nowMs: number = Date.now(),
): number {
  return Math.max(0, Math.ceil((cooldownUntilMs - nowMs) / 1000));
}

export function workerRecoveryResendCooldownMs(): number {
  return WORKER_CONFIRM_RESEND_COOLDOWN_MS;
}

/**
 * Map Supabase resetPasswordForEmail outcomes to anti-enumeration UX.
 * Account-not-found style errors are treated as success.
 */
export function mapWorkerRecoveryRequestResult(params: {
  providerErrorMessage?: string | null;
}): { success: true; message: string } | { success: false; error: string } {
  const msg = (params.providerErrorMessage ?? '').trim();
  if (!msg) {
    return { success: true, message: WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE };
  }
  const lower = msg.toLowerCase();
  if (
    lower.includes('user not found') ||
    lower.includes('email not found') ||
    lower.includes('unable to find user') ||
    lower.includes('no user found') ||
    lower.includes('user does not exist') ||
    lower.includes('signup_disabled')
  ) {
    return { success: true, message: WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE };
  }
  if (
    lower.includes('rate') ||
    lower.includes('too many') ||
    lower.includes('security purposes')
  ) {
    return {
      success: false,
      error: 'Please wait a moment before requesting another email.',
    };
  }
  return { success: false, error: WORKER_RECOVERY_REQUEST_GENERIC_ERROR };
}

/**
 * New-password policy for recovery (mobile + web).
 * Min 12, at least one letter, at least one number, matching confirmation.
 */
export function validateWorkerRecoveryPassword(params: {
  password: string;
  confirm: string;
}): WorkerPasswordPolicyResult {
  const { password, confirm } = params;
  if (password.length < WORKER_RECOVERY_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${WORKER_RECOVERY_PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { ok: false, error: 'Password must include at least one letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: 'Password must include at least one number.' };
  }
  if (password !== confirm) {
    return { ok: false, error: 'Passwords do not match.' };
  }
  return { ok: true };
}

/** Friendly updateUser failures without leaking provider internals. */
export function friendlyWorkerPasswordUpdateError(
  message: string | null | undefined,
): string {
  const lower = (message ?? '').toLowerCase();
  if (
    lower.includes('session') ||
    lower.includes('not authenticated') ||
    lower.includes('jwt')
  ) {
    return 'This reset link is no longer valid. Request a new password reset email.';
  }
  if (lower.includes('same password') || lower.includes('different from the old')) {
    return 'Choose a password you have not used recently.';
  }
  if (lower.includes('weak') || lower.includes('password')) {
    return 'Choose a stronger password (at least 12 characters with a letter and a number).';
  }
  return 'We could not update your password. Please try again or request a new reset link.';
}

/**
 * True only for an explicit worker recovery confirm (not org activation).
 */
export function shouldMarkWorkerRecoverySession(
  type: string | null | undefined,
  next: string | null | undefined,
): boolean {
  return type === 'recovery' && isWorkerRecoveryNext(next);
}

function firstQueryParam(
  params: URLSearchParams,
  key: string,
): string | null {
  const value = params.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Securely parse a worker recovery deep link or confirm URL.
 * Never returns the raw URL. Failures use opaque reason codes only.
 */
export function parseWorkerRecoveryUrl(
  rawUrl: string | null | undefined,
  options?: { allowDevLoopback?: boolean },
): WorkerRecoveryUrlParseResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'malformed' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes('\\')) {
    return { ok: false, reason: 'malformed' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  if (scheme === 'javascript' || scheme === 'data' || scheme === 'exp') {
    return { ok: false, reason: 'wrong_scheme' };
  }

  // OAuth callback URLs must never be treated as recovery.
  const pathAndHost = `${url.host}${url.pathname}`.toLowerCase();
  if (pathAndHost.includes('auth/callback')) {
    return { ok: false, reason: 'oauth_callback' };
  }

  const params = url.searchParams;
  const errorCode = firstQueryParam(params, 'error_code') ?? firstQueryParam(params, 'error');
  if (errorCode) {
    const code = errorCode.toLowerCase();
    if (code.includes('otp_expired') || code.includes('expired')) {
      return { ok: false, reason: 'expired' };
    }
    if (code.includes('access_denied') || code.includes('denied')) {
      return { ok: false, reason: 'access_denied' };
    }
  }

  const type = firstQueryParam(params, 'type');
  const tokenHash = firstQueryParam(params, 'token_hash');

  if (scheme === 'bridgehive') {
    // Accept only bridgehive://auth/worker/reset-password (optional harmless
    // source=recovery and required token_hash / type=recovery from the email).
    const combined = `${url.host}${url.pathname}`.replace(/\/+$/, '').toLowerCase();
    const isResetPath =
      combined === 'auth/worker/reset-password' ||
      (url.host === 'auth' &&
        url.pathname.replace(/\/+$/, '') === '/worker/reset-password');
    if (!isResetPath) {
      return { ok: false, reason: 'wrong_origin' };
    }
    // Ignore harmless source=recovery; require type=recovery when supplied.
    if (type && type !== 'recovery') {
      return { ok: false, reason: 'wrong_type' };
    }
    if (!tokenHash) {
      return { ok: false, reason: 'missing_token' };
    }
    return {
      ok: true,
      tokenHash,
      type: 'recovery',
      next: DEFAULT_WORKER_RECOVERY_NEXT,
    };
  }

  if (scheme !== 'https' && scheme !== 'http') {
    return { ok: false, reason: 'wrong_scheme' };
  }

  const hostname = url.hostname.toLowerCase();
  const isPublic = isPublicBridgeHiveWebHost(hostname);
  const isLoopback = isLoopbackAppOrigin(url.origin);
  const allowLoopback = Boolean(options?.allowDevLoopback) && isLoopback;

  if (!isPublic && !allowLoopback) {
    return { ok: false, reason: 'wrong_origin' };
  }
  if (scheme === 'http' && !allowLoopback) {
    return { ok: false, reason: 'wrong_scheme' };
  }

  const pathOk =
    url.pathname === '/auth/confirm' ||
    url.pathname === '/auth/worker/reset-password' ||
    url.pathname.endsWith('/auth/confirm') ||
    url.pathname.endsWith('/auth/worker/reset-password');
  if (!pathOk) {
    return { ok: false, reason: 'wrong_origin' };
  }

  if (type !== 'recovery') {
    return { ok: false, reason: type ? 'wrong_type' : 'wrong_type' };
  }
  if (!tokenHash) {
    return { ok: false, reason: 'missing_token' };
  }

  const nextRaw = firstQueryParam(params, 'next');
  if (nextRaw && !isWorkerRecoveryNext(nextRaw)) {
    // Confirm links without next or with wrong next are still recovery OTPs
    // when type=recovery; we force the allowlisted destination.
  }

  return {
    ok: true,
    tokenHash,
    type: 'recovery',
    next: DEFAULT_WORKER_RECOVERY_NEXT,
  };
}

/** User-facing copy for native recovery URL parse failures (no secrets). */
export function workerRecoveryUrlErrorMessage(
  reason: Exclude<WorkerRecoveryUrlParseResult, { ok: true }>['reason'],
): string {
  switch (reason) {
    case 'expired':
      return 'This reset link has expired. Request a new password reset email.';
    case 'access_denied':
      return 'This reset link is no longer valid. Request a new password reset email.';
    case 'missing_token':
    case 'wrong_type':
    case 'malformed':
    case 'wrong_scheme':
    case 'wrong_origin':
    case 'oauth_callback':
    default:
      return 'This reset link is invalid. Open the link from your Bridge Hive email, or request a new one.';
  }
}
