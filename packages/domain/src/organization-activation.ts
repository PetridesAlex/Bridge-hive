/**
 * Organization account activation helpers (pure).
 */

export const INVITATION_DELIVERY_STATUSES = [
  'pending',
  'sent',
  'failed',
  'accepted',
  'revoked',
  'expired',
] as const;

export type InvitationDeliveryStatus =
  (typeof INVITATION_DELIVERY_STATUSES)[number];

export const DELIVERY_ERROR_CATEGORIES = [
  'auth_error',
  'rate_limited',
  'unknown',
] as const;

export type DeliveryErrorCategory =
  (typeof DELIVERY_ERROR_CATEGORIES)[number];

export const ORG_INVITATION_COOKIE = 'bh_org_invitation_id';
export const ORG_INVITATION_COOKIE_MAX_AGE_SEC = 60 * 30; // 30 minutes

/** Auth email OTP types allowed for organization activation confirm. */
export const ACTIVATION_EMAIL_OTP_TYPES = ['invite', 'recovery'] as const;
export type ActivationEmailOtpType = (typeof ACTIVATION_EMAIL_OTP_TYPES)[number];

/** Safe post-confirm destinations (relative paths only). */
export const ACTIVATION_NEXT_PATHS = [
  '/activate-organization-account',
] as const;

/** Worker password-recovery destinations allowed through `/auth/confirm`. */
export const WORKER_RECOVERY_NEXT_PATHS = [
  '/auth/worker/reset-password',
] as const;

/**
 * Worker email-confirmation (signup OTP) destinations.
 * After confirm, workers sign in and continue Account Setup.
 */
export const WORKER_SIGNUP_CONFIRM_NEXT_PATHS = [
  '/auth/worker/login',
] as const;

export const AUTH_CONFIRM_NEXT_PATHS = [
  ...ACTIVATION_NEXT_PATHS,
  ...WORKER_RECOVERY_NEXT_PATHS,
  ...WORKER_SIGNUP_CONFIRM_NEXT_PATHS,
] as const;

export const DEFAULT_ACTIVATION_NEXT = '/activate-organization-account';
export const DEFAULT_WORKER_RECOVERY_NEXT = '/auth/worker/reset-password';
export const DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT = '/auth/worker/login';

/** Cooldown between worker confirmation resend taps (client UX). */
export const WORKER_CONFIRM_RESEND_COOLDOWN_MS = 60_000;

export function isActivationEmailOtpType(
  value: string | null | undefined,
): value is ActivationEmailOtpType {
  return (
    typeof value === 'string' &&
    (ACTIVATION_EMAIL_OTP_TYPES as readonly string[]).includes(value)
  );
}

/**
 * OTP types accepted by `/auth/confirm`.
 * `signup` is only valid when `next` is a worker signup-confirm path.
 */
export function isAuthConfirmEmailOtpType(
  type: string | null | undefined,
  next: string | null | undefined,
): boolean {
  if (type === 'signup') {
    return isWorkerSignupConfirmNext(next);
  }
  return isActivationEmailOtpType(type);
}

export function isWorkerRecoveryNext(
  path: string | null | undefined,
): boolean {
  return (
    typeof path === 'string' &&
    (WORKER_RECOVERY_NEXT_PATHS as readonly string[]).includes(path)
  );
}

export function isWorkerSignupConfirmNext(
  path: string | null | undefined,
): boolean {
  return (
    typeof path === 'string' &&
    (WORKER_SIGNUP_CONFIRM_NEXT_PATHS as readonly string[]).includes(path)
  );
}

/**
 * Allowlisted post-confirm `next` for org activation, worker recovery, and
 * worker signup confirmation. Unknown/unsafe values fall back to organization activation.
 */
export function allowlistedActivationNext(
  raw: string | null | undefined,
): string {
  const path = safeAppPath(raw, DEFAULT_ACTIVATION_NEXT);
  if ((AUTH_CONFIRM_NEXT_PATHS as readonly string[]).includes(path)) {
    return path;
  }
  return DEFAULT_ACTIVATION_NEXT;
}

/** Prefer worker recovery fallback when building worker-oriented confirm links. */
export function allowlistedWorkerRecoveryNext(
  raw: string | null | undefined,
): string {
  const path = safeAppPath(raw, DEFAULT_WORKER_RECOVERY_NEXT);
  if ((WORKER_RECOVERY_NEXT_PATHS as readonly string[]).includes(path)) {
    return path;
  }
  return DEFAULT_WORKER_RECOVERY_NEXT;
}

export function allowlistedWorkerSignupConfirmNext(
  raw: string | null | undefined,
): string {
  const path = safeAppPath(raw, DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT);
  if ((WORKER_SIGNUP_CONFIRM_NEXT_PATHS as readonly string[]).includes(path)) {
    return path;
  }
  return DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT;
}

/**
 * Classify `auth.signUp` response without treating obfuscated duplicates as “email sent”.
 * Supabase often returns a user with empty `identities` when the email already exists.
 */
export type WorkerSignUpOutcome =
  | { kind: 'error'; message: string }
  | { kind: 'session' }
  | { kind: 'needs_email_confirm' }
  | { kind: 'existing_account' };

export function classifyWorkerSignUpResponse(params: {
  errorMessage?: string | null;
  hasUser: boolean;
  hasSession: boolean;
  identitiesCount?: number | null;
}): WorkerSignUpOutcome {
  if (params.errorMessage) {
    return { kind: 'error', message: params.errorMessage };
  }
  if (params.hasSession) {
    return { kind: 'session' };
  }
  if (
    params.hasUser &&
    params.identitiesCount != null &&
    params.identitiesCount === 0
  ) {
    return { kind: 'existing_account' };
  }
  if (params.hasUser && !params.hasSession) {
    return { kind: 'needs_email_confirm' };
  }
  return {
    kind: 'error',
    message: 'Unable to create account. Please try again.',
  };
}

export function workerExistingAccountMessage(): string {
  return 'If an account already exists for this email, sign in or reset your password instead of registering again.';
}

export function workerConfirmRequestAcceptedCopy(emailMasked: boolean): string {
  if (emailMasked) {
    return 'If that address can receive mail, we accepted your confirmation request. Check your inbox (and spam) for a Bridge Hive link, then sign in.';
  }
  return 'We accepted your confirmation request. Check your inbox (and spam) for a Bridge Hive link, then sign in. This screen does not prove the email was delivered.';
}

export function readInvitationIdFromAuthMeta(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): string | null {
  const meta = {
    ...(user.app_metadata ?? {}),
    ...(user.user_metadata ?? {}),
  } as Record<string, unknown>;
  const raw = meta.invitation_id;
  if (typeof raw !== 'string') return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    )
  ) {
    return null;
  }
  return raw;
}

export function normalizeAdminEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function maskEmail(email: string): string {
  const normalized = normalizeAdminEmail(email);
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return '•••';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••@${domain}`;
}

export function slugifyOrganizationName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'organization';
}

/** Same-origin relative path only; rejects protocol-relative and absolute URLs. */
export function safeAppPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  return value;
}

export function isAllowlistedRedirectOrigin(
  candidateOrigin: string,
  appPublicUrl: string,
): boolean {
  try {
    const allowed = new URL(appPublicUrl);
    const candidate = new URL(candidateOrigin);
    return (
      allowed.protocol === candidate.protocol &&
      allowed.host === candidate.host
    );
  } catch {
    return false;
  }
}

/** True for localhost / 127.0.0.1 / [::1] origins (local Next only). */
export function isLoopbackAppOrigin(urlOrOrigin: string): boolean {
  try {
    const raw = urlOrOrigin.trim();
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * Safe, non-secret summary of the Auth redirectTo that will appear in emails
 * as {{ .RedirectTo }} when the URL is allow-listed. Never includes tokens.
 */
export function describeActivationRedirectTo(redirectTo: string): {
  redirectTo: string;
  origin: string;
  pathname: string;
  search: string;
  isLoopback: boolean;
} {
  const u = new URL(redirectTo);
  return {
    redirectTo: u.toString(),
    origin: u.origin,
    pathname: u.pathname,
    search: u.search,
    isLoopback: isLoopbackAppOrigin(u.origin),
  };
}

/**
 * Prefetch-safe Auth confirm URL used as `redirectTo` for invite/recovery.
 * Email templates append `&token_hash={{ .TokenHash }}&type=…` — do not put
 * tokens here. `next` must be a same-app relative path (activation or worker).
 */
export function buildAuthConfirmRedirectTo(
  appPublicUrl: string,
  nextPath: string,
): string {
  const raw = appPublicUrl.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const origin = new URL(withProtocol).origin;
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

/**
 * Auth `redirectTo` for organization invite / existing-user recovery emails.
 * Points at `/auth/confirm?next=/activate-organization-account` (allow-listed).
 * Templates must not use SiteURL alone for the host when SiteURL is localhost.
 */
export function buildActivationRedirectTo(appPublicUrl: string): string {
  return buildAuthConfirmRedirectTo(appPublicUrl, DEFAULT_ACTIVATION_NEXT);
}

/** @deprecated Prefer buildActivationRedirectTo — kept for any legacy callback links. */
export function buildActivationCallbackUrl(appPublicUrl: string): string {
  const raw = appPublicUrl.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const origin = new URL(withProtocol).origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(DEFAULT_ACTIVATION_NEXT)}`;
}

export function friendlyAuthLinkError(
  errorCode: string | null | undefined,
): { title: string; body: string } {
  const code = (errorCode ?? '').toLowerCase();
  if (
    code === 'otp_expired' ||
    code === 'otp_disabled' ||
    code.includes('expired')
  ) {
    return {
      title: 'This activation link is no longer valid',
      body: 'It may have expired, already been used, or been replaced by a newer email. Ask your Bridge Hive administrator to send one new activation email.',
    };
  }
  if (code === 'access_denied') {
    return {
      title: 'This activation link is no longer valid',
      body: 'It may have expired, already been used, or been replaced by a newer email. Ask your Bridge Hive administrator to send one new activation email.',
    };
  }
  return {
    title: 'Authentication error',
    body: 'We could not complete sign-in. Please try again or ask your administrator for a new activation email.',
  };
}

export function administratorAccessLabel(
  accessStatus: string | null | undefined,
): string {
  switch (accessStatus) {
    case 'pending':
      return 'Activation email pending';
    case 'sent':
      return 'Sent';
    case 'delivery_failed':
    case 'failed':
      return 'Delivery failed';
    case 'accepted':
      return 'Invitation accepted';
    case 'expired':
      return 'Invitation expired';
    case 'revoked':
      return 'Invitation revoked';
    default:
      return 'Unknown';
  }
}

export function organizationLifecycleLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending setup';
    case 'under_review':
      return 'Under review';
    case 'active':
      return 'Active';
    case 'rejected':
      return 'Rejected';
    case 'suspended':
      return 'Suspended';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

export function organizationProfileLabel(params: {
  status: string;
  submittedAt?: string | null;
  hasContact?: boolean;
}): string {
  if (params.status === 'active') return 'Approved';
  if (params.status === 'rejected') return 'Requires correction';
  if (params.status === 'under_review') return 'Submitted';
  if (params.submittedAt) return 'Submitted';
  if (params.hasContact) return 'In progress';
  return 'Not started';
}

export function mapAuthInviteErrorCategory(message: string | undefined): DeliveryErrorCategory {
  const m = (message ?? '').toLowerCase();
  if (m.includes('rate') || m.includes('too many')) return 'rate_limited';
  if (m.includes('auth') || m.includes('user') || m.includes('email')) return 'auth_error';
  return 'unknown';
}

export function friendlyInvitationError(code: string | undefined): string {
  switch (code) {
    case 'NOT_AUTHENTICATED':
      return 'Please sign in to continue activation.';
    case 'EMAIL_MISMATCH':
      return 'This activation belongs to a different email address. Sign out and continue with the invited email.';
    case 'INVITATION_INVALID':
      return 'This activation link is invalid.';
    case 'INVITATION_REVOKED':
      return 'This invitation has been revoked. Ask Bridge Hive support or your platform contact for a new invitation.';
    case 'INVITATION_EXPIRED':
      return 'This activation link has expired. Ask your platform administrator to resend it.';
    case 'INVITATION_ALREADY_USED':
    case 'INVITATION_ALREADY_ACCEPTED':
      return 'This invitation has already been used.';
    case 'ALREADY_MEMBER':
      return 'You already have access to this organization.';
    case 'ORG_NOT_ACCEPTING':
    case 'ORG_NOT_FOUND':
      return 'This organization is not available for activation right now.';
    case 'RATE_LIMITED':
      return 'Please wait a moment before resending the activation email.';
    case 'MAX_RESEND_ATTEMPTS':
      return 'Maximum activation email attempts reached for today. Try again later.';
    default:
      return 'Unable to complete activation. Please try again or contact support.';
  }
}
