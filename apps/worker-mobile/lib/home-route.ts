import type { Tables } from '@bridge-hive/supabase-types';

export type WorkerProfileRow = Pick<
  Tables<'worker_profiles'>,
  'verification_status' | 'worker_role' | 'is_app_review_demo'
>;

const RESTRICTED_STATUSES = new Set([
  'suspended',
  'rejected',
  'expired',
]);

const PENDING_REVIEW_STATUSES = new Set(['submitted', 'under_review']);

/**
 * Pure post-auth home route for the worker app.
 * Signed-out cold-start (Welcome vs Login) is decided in `app/index.tsx`
 * using the onboarding preference flag.
 */
export function homeRouteForWorker(params: {
  hasSession: boolean;
  workerProfile: WorkerProfileRow | null;
  accountRejectionReason: string | null;
}): string {
  if (!params.hasSession) return '/auth/worker/login';
  if (params.accountRejectionReason) return '/auth/worker/rejected';
  if (!params.workerProfile) return '/auth/worker/choose-role';

  // Server-authorized App Review demo: isolated dashboard shell only.
  if (params.workerProfile.is_app_review_demo) {
    return '/(tabs)';
  }

  const status = params.workerProfile.verification_status;
  if (status === 'verified') return '/(tabs)';
  if (RESTRICTED_STATUSES.has(status)) return '/auth/worker/restricted';
  // Incomplete, submitted, or under-review workers stay on Account Setup —
  // Credentials is a step inside that hub, not the post-auth home.
  if (PENDING_REVIEW_STATUSES.has(status) || params.workerProfile.worker_role) {
    return '/auth/worker/pending';
  }
  return '/auth/worker/choose-role';
}

export function isRestrictedVerificationStatus(status: string | null | undefined): boolean {
  return Boolean(status && RESTRICTED_STATUSES.has(status));
}

export function isPendingReviewVerificationStatus(
  status: string | null | undefined,
): boolean {
  return Boolean(status && PENDING_REVIEW_STATUSES.has(status));
}
