import {
  homeRouteForWorker,
  isPendingReviewVerificationStatus,
  isRestrictedVerificationStatus,
} from '../home-route';

describe('homeRouteForWorker', () => {
  it('sends signed-out users to login (Welcome is decided by onboarding flag)', () => {
    expect(
      homeRouteForWorker({
        hasSession: false,
        workerProfile: null,
        accountRejectionReason: null,
      }),
    ).toBe('/auth/worker/login');
  });

  it('routes verified workers to the dashboard', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: {
          verification_status: 'verified',
          worker_role: 'registered_nurse',
          is_app_review_demo: false,
        },
        accountRejectionReason: null,
      }),
    ).toBe('/(tabs)');
  });

  it('routes App Review demo workers to the dashboard without requiring verified', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: {
          verification_status: 'draft',
          worker_role: 'registered_nurse',
          is_app_review_demo: true,
        },
        accountRejectionReason: null,
      }),
    ).toBe('/(tabs)');
  });

  it('does not treat a client-only missing flag as demo access', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: {
          verification_status: 'draft',
          worker_role: 'registered_nurse',
          is_app_review_demo: false,
        },
        accountRejectionReason: null,
      }),
    ).toBe('/auth/worker/pending');
  });

  it('routes submitted and under_review workers to pending review', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: {
          verification_status: 'submitted',
          worker_role: 'ward_assistant',
          is_app_review_demo: false,
        },
        accountRejectionReason: null,
      }),
    ).toBe('/auth/worker/pending');
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: {
          verification_status: 'under_review',
          worker_role: 'physiotherapist',
          is_app_review_demo: false,
        },
        accountRejectionReason: null,
      }),
    ).toBe('/auth/worker/pending');
    expect(isPendingReviewVerificationStatus('under_review')).toBe(true);
  });

  it('routes draft workers with a role to Account Setup (not Credentials alone)', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: {
          verification_status: 'draft',
          worker_role: 'registered_nurse',
          is_app_review_demo: false,
        },
        accountRejectionReason: null,
      }),
    ).toBe('/auth/worker/pending');
  });

  it('routes restricted verification statuses away from the marketplace', () => {
    for (const status of ['suspended', 'rejected', 'expired'] as const) {
      expect(
        homeRouteForWorker({
          hasSession: true,
          workerProfile: {
            verification_status: status,
            worker_role: 'registered_nurse',
            is_app_review_demo: false,
          },
          accountRejectionReason: null,
        }),
      ).toBe('/auth/worker/restricted');
      expect(isRestrictedVerificationStatus(status)).toBe(true);
    }
  });

  it('routes missing worker profiles to choose-role', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: null,
        accountRejectionReason: null,
      }),
    ).toBe('/auth/worker/choose-role');
  });

  it('routes org/admin rejection to the rejected screen', () => {
    expect(
      homeRouteForWorker({
        hasSession: true,
        workerProfile: null,
        accountRejectionReason: 'Use the organization portal.',
      }),
    ).toBe('/auth/worker/rejected');
  });
});
