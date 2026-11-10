import {
  eligiblePackageApproveCredentialIds,
  requiredCredentialTypesForRole,
  verificationApplicationStatusLabel,
  workerFolderLabel,
  workerVerificationApplicationStatus,
  VERIFICATION_APPLICATION_STATUS_CODES,
} from '@bridge-hive/domain';

import { serializeApplicationQueueCard as serializeCard } from '../../../lib/admin/labels';
import { resolveWorkerFolderSort } from '../../../lib/admin/worker-folder-sort';

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

  it('includes text credentials without files when hasTextValue is set', () => {
    expect(
      eligiblePackageApproveCredentialIds([
        { id: 'tax', status: 'under_review', hasFile: false, hasTextValue: true },
        { id: 'si', status: 'pending', hasFile: false, hasTextValue: true },
        { id: 'missing', status: 'pending', hasFile: false, hasTextValue: false },
      ]),
    ).toEqual(['tax', 'si']);
  });
});

describe('worker folder labels', () => {
  it('exposes English and Greek copy for folder CTAs', () => {
    expect(workerFolderLabel('openWorkerFolder', 'en')).toMatch(/folder/i);
    expect(workerFolderLabel('openWorkerFolder', 'el').length).toBeGreaterThan(3);
    expect(workerFolderLabel('approveWorker', 'el')).not.toBe(
      workerFolderLabel('approveWorker', 'en'),
    );
  });
});

describe('worker folder sort defaults', () => {
  it('defaults to newest submissions and ignores unreleased sort keys', () => {
    expect(resolveWorkerFolderSort(undefined)).toBe('submitted_at');
    expect(resolveWorkerFolderSort('oldest_waiting')).toBe('oldest_waiting');
    expect(resolveWorkerFolderSort('worker_name')).toBe('submitted_at');
    expect(resolveWorkerFolderSort('urgency')).toBe('submitted_at');
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
    expect(blob).not.toMatch(/text_value/i);
  });

  it('keeps workers with the same name as separate folders by worker_id', () => {
    const a = serializeCard({
      worker_id: 'aaaaaaaa-0000-4000-8000-000000000001',
      application_ref: 'aaaaaaaa',
      full_name: 'Test Worker 2002',
      email: 'a@test.local',
      phone: null,
      worker_role: 'registered_nurse',
      application_status: 'under_review',
      required_total: 7,
      awaiting_review_count: 7,
      approved_count: 0,
      rejected_count: 0,
      submitted_file_count: 7,
      payout_status: 'pending',
      submitted_at: '2026-11-10T15:57:00+00:00',
      last_activity_at: '2026-11-10T15:57:00+00:00',
    });
    const b = serializeCard({
      worker_id: 'bbbbbbbb-0000-4000-8000-000000000002',
      application_ref: 'bbbbbbbb',
      full_name: 'Test Worker 2002',
      email: 'b@test.local',
      phone: null,
      worker_role: 'registered_nurse',
      application_status: 'under_review',
      required_total: 7,
      awaiting_review_count: 2,
      approved_count: 0,
      rejected_count: 0,
      submitted_file_count: 7,
      payout_status: 'pending',
      submitted_at: '2026-11-10T16:00:00+00:00',
      last_activity_at: '2026-11-10T16:00:00+00:00',
    });
    expect(a.fullName).toBe(b.fullName);
    expect(a.workerId).not.toBe(b.workerId);
    const grouped = new Map(
      [a, b].map((card) => [card.workerId, card] as const),
    );
    expect(grouped.size).toBe(2);
  });
});
