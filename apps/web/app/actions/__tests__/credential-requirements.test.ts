import {
  accountSetupNextStep,
  credentialRequirementsForRole,
  credentialTypeLabel,
  documentProgressCounts,
  documentsSummaryLabel,
  finalApprovalSummaryLabel,
  isWorkerAccountSetupRouteAllowed,
  isWorkerMarketplaceRoute,
  payoutAccountActionLabel,
  payoutSummaryLabel,
  requiredCredentialTypesForRole,
  validateCredentialUpload,
  WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE,
  workerDocumentPackageLabel,
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
