import type { WorkerRole } from './types';
import { WORKER_ROLE_LABELS } from './types';

/**
 * Map claim_shift / eligibility errors to worker-facing copy.
 * Never return raw PostgreSQL / PostgREST / RPC strings.
 */
export function claimErrorMessage(
  error?: string | null,
  options?: { requiredRole?: WorkerRole | string | null },
): string {
  if (!error) return 'We couldn’t accept this shift. Please try again.';

  const raw = error.trim();
  const upper = raw.toUpperCase();

  if (
    upper.includes('NETWORK') ||
    upper.includes('OFFLINE') ||
    upper.includes('FAILED TO FETCH') ||
    upper.includes('NETWORKREQUESTFAILED')
  ) {
    return 'You appear to be offline.';
  }

  if (
    upper.includes('NOT_AUTHENTICATED') ||
    upper.includes('JWT') ||
    upper.includes('SESSION')
  ) {
    return 'Your session expired. Sign in again.';
  }

  if (upper.includes('ORG_NOT_ACTIVE')) {
    return 'This organization is not active.';
  }

  if (upper.includes('SHIFT_ALREADY_FILLED') || upper.includes('SHIFT_IS_FULL')) {
    return 'This shift is full.';
  }

  if (upper.includes('SHIFT_DEADLINE_PASSED') || upper.includes('SHIFT_STARTED')) {
    return 'This shift has already started.';
  }

  if (upper.includes('SHIFT_NOT_AVAILABLE') || upper.includes('SHIFT_NOT_FOUND')) {
    return 'This shift is not available.';
  }

  if (upper.includes('SCHEDULE_CONFLICT')) {
    return 'This shift conflicts with another assignment.';
  }

  if (upper.includes('ALREADY_ACCEPTED') || upper.includes('DUPLICATE')) {
    return 'You have already accepted this shift.';
  }

  // Parse NOT_ELIGIBLE:<reason> before the generic NOT_ELIGIBLE branch.
  const eligibleMatch = raw.match(/NOT_ELIGIBLE:([^\s]+)/i);
  const reason = eligibleMatch?.[1]?.toLowerCase() ?? '';

  if (reason === 'role_mismatch' || upper.includes('ROLE_MISMATCH')) {
    const role = options?.requiredRole;
    if (role && role in WORKER_ROLE_LABELS) {
      return `This shift requires a ${WORKER_ROLE_LABELS[role as WorkerRole]}.`;
    }
    return 'This shift requires a different worker role.';
  }

  if (reason === 'not_verified' || upper.includes('NOT_VERIFIED')) {
    return 'Your worker verification is incomplete.';
  }

  if (reason === 'account_not_active') {
    return 'Your worker account is inactive.';
  }

  if (reason === 'payout_account_required') {
    return 'Your payout account must be approved.';
  }

  if (reason === 'billing_restricted' || upper.includes('BILLING_RESTRICTED')) {
    return 'New shift access is paused because a commission invoice is overdue.';
  }

  if (
    reason.startsWith('missing_credential') ||
    upper.includes('MISSING_CREDENTIAL') ||
    upper.includes('EXPIRED')
  ) {
    return 'A required credential is missing or expired.';
  }

  if (reason === 'worker_profile_missing' || reason === 'profile_missing') {
    return 'Your worker verification is incomplete.';
  }

  if (upper.includes('NOT_ELIGIBLE')) {
    return 'Your worker verification is incomplete.';
  }

  return 'We couldn’t accept this shift. Please try again.';
}
