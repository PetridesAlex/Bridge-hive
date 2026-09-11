import {
  eligiblePackageApproveCredentialIds,
  requiredCredentialTypesForRole,
  verificationApplicationStatusLabel,
  workerVerificationApplicationStatus,
  VERIFICATION_APPLICATION_STATUS_CODES,
} from '@bridge-hive/domain';

import { serializeApplicationQueueCard as serializeCard } from '../../../lib/admin/labels';

describe('verification application status helpers', () => {
  const nurseRequired = requiredCredentialTypesForRole('registered_nurse');

  it('derives ready_for_review for submitted nurse package', () => {
    expect(
      workerVerificationApplicationStatus({
        verificationStatus: 'submitted',
        onboardingStatus: 'completed',
        role: 'registered_nurse',
        credentials: nurseRequired.map((credentialType) => ({
          credentialType,
          status: 'pending' as const,
          hasFile: true,
        })),
        payoutStatus: null,
      }),
    ).toBe('ready_for_review');
  });

  it('does not treat under-review as not submitted', () => {
    expect(
      workerVerificationApplicationStatus({
        verificationStatus: 'draft',
        onboardingStatus: 'completed',
        role: 'ward_assistant',
        credentials: requiredCredentialTypesForRole('ward_assistant').map(
          (credentialType) => ({
            credentialType,
            status: 'under_review' as const,
            hasFile: true,
          }),
        ),
      }),
    ).toBe('under_review');
  });

  it('optional CV does not block nurse package completion path', () => {
    expect(
      workerVerificationApplicationStatus({
        verificationStatus: 'draft',
        onboardingStatus: 'completed',
        role: 'registered_nurse',
        credentials: nurseRequired.map((credentialType) => ({
          credentialType,
          status: 'verified' as const,
          hasFile: true,
        })),
        payoutStatus: 'verified',
      }),
    ).toBe('ready_for_final_approval');
  });

  it('exposes human labels for all status codes', () => {
    for (const code of VERIFICATION_APPLICATION_STATUS_CODES) {
      expect(verificationApplicationStatusLabel(code).length).toBeGreaterThan(3);
    }
  });
});

describe('package approve selection', () => {
  it('selects only eligible pending/under_review docs with files', () => {
    expect(
      eligiblePackageApproveCredentialIds([
        { id: 'a', status: 'pending', hasFile: true },
        { id: 'b', status: 'under_review', hasFile: true },
        { id: 'c', status: 'verified', hasFile: true },
        { id: 'd', status: 'pending', hasFile: false },
        { id: 'e', status: 'rejected', hasFile: true },
      ]),
    ).toEqual(['a', 'b']);
  });
});

describe('application queue card serializer', () => {
  it('never includes IBAN or storage paths', () => {
    const card = serializeCard({
      worker_id: 'b2000001-0000-4000-8000-000000000010',
      application_ref: 'b2000001',
      full_name: 'Maria Georgiou',
      email: 'va-nurse@test.local',
      phone: '+35799000010',
      worker_role: 'registered_nurse',
      application_status: 'ready_for_review',
      required_total: 6,
      awaiting_review_count: 4,
      approved_count: 2,
      rejected_count: 0,
      submitted_file_count: 6,
      payout_status: 'pending',
      submitted_at: '2026-09-10T10:00:00+00:00',
      last_activity_at: '2026-09-10T12:00:00+00:00',
    });
    const blob = JSON.stringify(card);
    expect(blob).not.toMatch(/iban/i);
    expect(blob).not.toMatch(/storage/i);
    expect(blob).not.toMatch(/CY\d{2}/i);
    expect(card.applicationStatusLabel).toBe('Ready for review');
  });
});
