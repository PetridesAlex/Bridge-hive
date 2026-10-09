import {
  accountSetupNextStep,
  canSubmitWorkerVerificationPackage,
  credentialExpiryIsValid,
  credentialRequirementsForRole,
  credentialRequiresKnownExpiry,
  credentialTypeLabel,
  documentProgressCounts,
  documentsSummaryLabel,
  endOfCyprusBusinessDayIso,
  finalApprovalSummaryLabel,
  isOwnedAvatarPath,
  isValidCivilDateYmd,
  isWorkerAccountSetupRouteAllowed,
  isWorkerMarketplaceRoute,
  isWorkerRole,
  invoicesMenuTrailingStatus,
  personalInformationTrailingStatus,
  payoutAccountActionLabel,
  payoutSummaryLabel,
  profileInitials,
  requiredCredentialTypesForRole,
  validateCredentialUpload,
  WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE,
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  workerDocumentPackageLabel,
  credentialsMenuTrailingStatus,
  notificationsMenuTrailingStatus,
} from '@bridge-hive/domain';

describe('credential requirements', () => {
  it('returns role-specific checklist with required and optional labels', () => {
    const rn = credentialRequirementsForRole('registered_nurse');
    expect(rn.map((r) => r.credentialType)).toEqual([
      'identity_document_front',
      'identity_document_back',
      'nursing_licence',
      'nursing_degree',
      'tax_identification_proof',
      'social_insurance_proof',
      'cv',
    ]);
    expect(rn.find((r) => r.credentialType === 'cv')?.isRequired).toBe(false);
    expect(requiredCredentialTypesForRole('ward_assistant')).toEqual([
      'identity_document_front',
      'identity_document_back',
      'employment_certificate',
      'tax_identification_proof',
      'social_insurance_proof',
    ]);
    expect(requiredCredentialTypesForRole('physiotherapist')).toEqual([
      'identity_document_front',
      'identity_document_back',
      'physiotherapy_degree',
      'physiotherapist_registration_certificate',
      'physiotherapy_practising_licence',
      'tax_identification_proof',
      'social_insurance_proof',
    ]);
    expect(requiredCredentialTypesForRole('physiotherapist')).toHaveLength(7);
    expect(credentialRequirementsForRole(null)).toEqual([]);
    expect(
      credentialRequirementsForRole('unknown_role' as never),
    ).toEqual([]);
  });

  it('keeps physiotherapist professional document keys separate', () => {
    const types = requiredCredentialTypesForRole('physiotherapist');
    expect(types).toContain('physiotherapy_degree');
    expect(types).toContain('physiotherapist_registration_certificate');
    expect(types).toContain('physiotherapy_practising_licence');
    expect(types).not.toContain('nursing_licence');
    expect(credentialTypeLabel('physiotherapy_practising_licence')).toContain(
      'practising licence',
    );
  });

  it('registers physiotherapist in the shared role registry', () => {
    expect(WORKER_ROLES).toContain('physiotherapist');
    expect(WORKER_ROLE_LABELS.physiotherapist).toBe('Physiotherapist');
    expect(isWorkerRole('physiotherapist')).toBe(true);
    expect(isWorkerRole('doctor')).toBe(false);
    expect(isWorkerRole(null)).toBe(false);
  });

  it('requires a known future expiry only for the annual practising licence', () => {
    expect(
      credentialRequiresKnownExpiry('physiotherapy_practising_licence'),
    ).toBe(true);
    expect(credentialRequiresKnownExpiry('physiotherapy_degree')).toBe(false);
    expect(credentialRequiresKnownExpiry('nursing_licence')).toBe(false);
    expect(
      credentialExpiryIsValid({
        credentialType: 'physiotherapy_practising_licence',
        expiresAt: null,
      }),
    ).toBe(false);
    expect(
      credentialExpiryIsValid({
        credentialType: 'nursing_licence',
        expiresAt: null,
      }),
    ).toBe(true);
  });

  it('rejects impossible civil dates and keeps same-day Cyprus licences valid through end of day', () => {
    expect(isValidCivilDateYmd('2026-02-31')).toBe(false);
    expect(isValidCivilDateYmd('2026-02-29')).toBe(false);
    expect(isValidCivilDateYmd('2024-02-29')).toBe(true);
    expect(() => endOfCyprusBusinessDayIso('2026-02-31')).toThrow(
      'INVALID_DATE',
    );

    const winter = endOfCyprusBusinessDayIso('2026-01-15');
    const summer = endOfCyprusBusinessDayIso('2026-07-15');
    // EET = UTC+2 → end of day is 21:59:59.999Z; EEST = UTC+3 → 20:59:59.999Z
    expect(winter).toBe('2026-01-15T21:59:59.999Z');
    expect(summer).toBe('2026-07-15T20:59:59.999Z');

    const middayCyprusWinter = new Date('2026-01-15T10:00:00.000Z');
    expect(
      credentialExpiryIsValid({
        credentialType: 'physiotherapy_practising_licence',
        expiresAt: winter,
        now: middayCyprusWinter,
      }),
    ).toBe(true);
    expect(
      credentialExpiryIsValid({
        credentialType: 'physiotherapy_practising_licence',
        expiresAt: winter,
        now: new Date('2026-01-15T22:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('uses approved terminology', () => {
    expect(credentialTypeLabel('identity_document_front')).toContain(
      'National identity card',
    );
    expect(credentialTypeLabel('identity_document_front')).not.toContain('Police');
    expect(credentialTypeLabel('employment_certificate')).toContain(
      'Employment certificate',
    );
    expect(credentialTypeLabel('nursing_degree', 'el')).toContain('Πτυχίο');
  });

  it('rejects unsupported file types and oversize files', () => {
    expect(
      validateCredentialUpload({
        mimeType: 'image/gif',
        sizeBytes: 100,
      }).ok,
    ).toBe(false);
    expect(
      validateCredentialUpload({
        mimeType: 'application/pdf',
        sizeBytes: 11 * 1024 * 1024,
      }).ok,
    ).toBe(false);
    expect(
      validateCredentialUpload({
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
      }).ok,
    ).toBe(true);
  });

  it('labels draft workers without credentials as awaiting documents', () => {
    expect(
      workerDocumentPackageLabel({
        verificationStatus: 'draft',
        role: 'registered_nurse',
        credentials: [],
      }),
    ).toBe('Documents not submitted');
  });

  it('does not treat missing optional CV as blocking final approval', () => {
    const required = requiredCredentialTypesForRole('registered_nurse');
    expect(
      workerDocumentPackageLabel({
        verificationStatus: 'draft',
        role: 'registered_nurse',
        payoutSatisfied: true,
        credentials: required.map((credentialType) => ({
          credentialType,
          status: 'verified' as const,
          hasFile: true,
        })),
      }),
    ).toBe('Ready for final approval');
  });

  it('requires verified payout after documents are complete', () => {
    const required = requiredCredentialTypesForRole('registered_nurse');
    const credentials = required.map((credentialType) => ({
      credentialType,
      status: 'verified' as const,
      hasFile: true,
    }));
    expect(
      workerDocumentPackageLabel({
        verificationStatus: 'draft',
        role: 'registered_nurse',
        payoutSatisfied: false,
        credentials,
      }),
    ).toBe('Documents complete — payout account submission required');
    expect(
      workerDocumentPackageLabel({
        verificationStatus: 'draft',
        role: 'registered_nurse',
        payoutStatus: 'pending',
        credentials,
      }),
    ).toBe('Documents complete — payout account approval pending');
    expect(
      workerDocumentPackageLabel({
        verificationStatus: 'draft',
        role: 'registered_nurse',
        payoutStatus: 'rejected',
        credentials,
      }),
    ).toBe('Payout account rejected — worker action required');
    expect(
      workerDocumentPackageLabel({
        verificationStatus: 'verified',
        role: 'registered_nurse',
        payoutSatisfied: true,
        credentials,
      }),
    ).toBe('Approved for marketplace access');
  });
});

describe('Account Setup status labels', () => {
  const required = requiredCredentialTypesForRole('registered_nurse');
  const verifiedDocs = required.map((credentialType) => ({
    credentialType,
    status: 'verified' as const,
    hasFile: true,
  }));
  const underReviewDocs = required.map((credentialType) => ({
    credentialType,
    status: 'under_review' as const,
    hasFile: true,
  }));

  it('keeps Documents / Payout / Final labels independent', () => {
    expect(
      documentsSummaryLabel({
        role: 'registered_nurse',
        credentials: underReviewDocs,
      }),
    ).toBe('Under review');
    expect(payoutSummaryLabel(null)).toBe('Not submitted');
    expect(
      finalApprovalSummaryLabel({
        verificationStatus: 'draft',
        documentsLabel: 'Under review',
        payoutStatus: null,
      }),
    ).toBe('Waiting for document review');
  });

  it('does not treat under-review documents as not submitted', () => {
    expect(
      documentsSummaryLabel({
        role: 'registered_nurse',
        credentials: underReviewDocs,
      }),
    ).not.toBe('Missing');
    expect(
      documentsSummaryLabel({
        role: 'registered_nurse',
        credentials: underReviewDocs,
      }),
    ).toBe('Under review');
  });

  it('uses correction wording for rejected payout', () => {
    expect(payoutSummaryLabel('rejected')).toBe('Rejected — correction required');
    expect(payoutAccountActionLabel('rejected')).toBe('Correct payout details');
    expect(
      accountSetupNextStep({
        documentsLabel: 'Complete',
        payoutStatus: 'rejected',
        finalLabel: 'Waiting for payout approval',
      }),
    ).toBe('Correct and resubmit the rejected item.');
  });

  it('marks final approval ready only when documents and payout are verified', () => {
    expect(
      finalApprovalSummaryLabel({
        verificationStatus: 'draft',
        documentsLabel: 'Complete',
        payoutStatus: 'verified',
      }),
    ).toBe('Ready for final administrative approval');
    expect(
      finalApprovalSummaryLabel({
        verificationStatus: 'verified',
        documentsLabel: 'Complete',
        payoutStatus: 'verified',
      }),
    ).toBe('Approved for marketplace access');
    expect(
      finalApprovalSummaryLabel({
        verificationStatus: 'submitted',
        documentsLabel: 'Under review',
        payoutStatus: 'pending',
      }),
    ).toBe('Ready for final administrative approval');
  });

  it('gates package submit on uploaded required files and draft/rejected status', () => {
    const withFiles = required.map((credentialType) => ({
      credentialType,
      status: 'pending' as const,
      hasFile: true,
    }));
    expect(
      canSubmitWorkerVerificationPackage({
        role: 'registered_nurse',
        credentials: withFiles,
        verificationStatus: 'draft',
      }),
    ).toBe(true);
    expect(
      canSubmitWorkerVerificationPackage({
        role: 'registered_nurse',
        credentials: withFiles,
        verificationStatus: 'submitted',
      }),
    ).toBe(false);
    expect(
      canSubmitWorkerVerificationPackage({
        role: 'ward_assistant',
        credentials: [],
        verificationStatus: 'draft',
      }),
    ).toBe(false);
    expect(
      accountSetupNextStep({
        documentsLabel: 'Submitted',
        payoutStatus: null,
        finalLabel: 'Waiting for document review',
        canSubmitPackage: true,
      }),
    ).toMatch(/Submit your document package/i);
  });

  it('counts document progress by status', () => {
    const mixed = [
      ...required.slice(0, 2).map((credentialType) => ({
        credentialType,
        status: 'verified' as const,
        hasFile: true,
      })),
      {
        credentialType: required[2]!,
        status: 'under_review' as const,
        hasFile: true,
      },
      {
        credentialType: required[3]!,
        status: 'rejected' as const,
        hasFile: true,
      },
    ];
    const counts = documentProgressCounts({
      role: 'registered_nurse',
      credentials: mixed,
    });
    expect(counts.approved).toBe(2);
    expect(counts.underReview).toBe(1);
    expect(counts.rejected).toBe(1);
    expect(counts.missing).toBe(required.length - 4);
  });

  it('exposes payout setup route for Account Setup CTA', () => {
    expect(WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE).toBe('/payout-setup');
    expect(isWorkerAccountSetupRouteAllowed('/payout-setup')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/documents')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/auth/worker/pending')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/auth/worker/reset-password')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/auth/worker/check-email')).toBe(true);
    expect(isWorkerMarketplaceRoute('/(tabs)')).toBe(true);
    expect(isWorkerMarketplaceRoute('/shifts/abc')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/(tabs)/payments')).toBe(false);
  });

  it('never includes a full IBAN in account-setup labels', () => {
    const labels = [
      documentsSummaryLabel({ role: 'registered_nurse', credentials: verifiedDocs }),
      payoutSummaryLabel('verified'),
      finalApprovalSummaryLabel({
        verificationStatus: 'draft',
        documentsLabel: 'Complete',
        payoutStatus: 'verified',
      }),
      accountSetupNextStep({
        documentsLabel: 'Complete',
        payoutStatus: 'verified',
        finalLabel: 'Ready for final administrative approval',
      }),
    ].join(' ');
    expect(labels).not.toMatch(/CY\d{2}[A-Z0-9]+/i);
    expect(labels).not.toContain('IBAN');
  });
});

describe('account hub helpers', () => {
  const uid = 'a1111111-1111-4111-8111-111111111111';

  it('validates owned avatar paths', () => {
    expect(isOwnedAvatarPath(uid, `${uid}/v1.jpg`)).toBe(true);
    expect(isOwnedAvatarPath(uid, `${uid}/photo.jpeg`)).toBe(true);
    expect(isOwnedAvatarPath(uid, 'other/v1.jpg')).toBe(false);
    expect(isOwnedAvatarPath(uid, `${uid}/../x.jpg`)).toBe(false);
    expect(isOwnedAvatarPath(uid, `${uid}/v1.png`)).toBe(false);
    expect(isOwnedAvatarPath(uid, null)).toBe(false);
  });

  it('builds initials and personal info trailing copy', () => {
    expect(profileInitials('Alex Petrides')).toBe('AP');
    expect(profileInitials('')).toBe('BH');
    expect(personalInformationTrailingStatus('+357 99')).toBe('Complete');
    expect(personalInformationTrailingStatus('')).toBe('Add phone');
  });

  it('builds credentials and invoice trailing statuses', () => {
    expect(
      credentialsMenuTrailingStatus({
        role: 'registered_nurse',
        credentials: [],
      }),
    ).toBe('Action required');
    expect(
      credentialsMenuTrailingStatus({
        role: 'registered_nurse',
        credentials: [
          {
            credentialType: 'identity_document_front',
            status: 'verified',
            hasFile: true,
          },
          {
            credentialType: 'identity_document_back',
            status: 'verified',
            hasFile: true,
          },
          {
            credentialType: 'nursing_licence',
            status: 'verified',
            hasFile: true,
          },
          {
            credentialType: 'nursing_degree',
            status: 'verified',
            hasFile: true,
          },
          {
            credentialType: 'tax_identification_proof',
            status: 'verified',
            hasFile: true,
          },
          {
            credentialType: 'social_insurance_proof',
            status: 'verified',
            hasFile: true,
          },
        ],
      }),
    ).toMatch(/approved/);
    expect(
      invoicesMenuTrailingStatus([
        { status: 'past_due', commission_amount_minor: 1600, currency: 'EUR' },
      ]),
    ).toContain('Past due');
    expect(invoicesMenuTrailingStatus([{ status: 'paid', commission_amount_minor: 0 }])).toBe(
      'All paid',
    );
    expect(notificationsMenuTrailingStatus(3)).toBe('3 unread');
    expect(notificationsMenuTrailingStatus(0)).toBeNull();
  });

  it('allows personal information and support during account setup', () => {
    expect(isWorkerAccountSetupRouteAllowed('/profile/personal-information')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/support')).toBe(true);
    expect(isWorkerAccountSetupRouteAllowed('/profile/app-information')).toBe(true);
  });
});
