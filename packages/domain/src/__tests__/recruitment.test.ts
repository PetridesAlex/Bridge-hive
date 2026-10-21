import {
  RECRUITMENT_CONSENT_PLACEHOLDER,
  RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES,
  RECRUITMENT_MAX_UPLOAD_FILES,
  RECRUITMENT_PRIVACY_NOTICE_VERSION,
  buildRecruitmentStoragePath,
  emptyRecruitmentApplicationDraft,
  isSafeRecruitmentDocumentType,
  recruitmentDocumentRequirementsForRole,
  resolveRecruitmentDocumentExpiresAt,
  validateRecruitmentConsentStep,
  validateRecruitmentDocumentBatch,
  validateRecruitmentPersonalStep,
  validateRecruitmentPreferencesStep,
  validateRecruitmentProfessionalStep,
  validateRecruitmentUpload,
} from '../recruitment';

describe('recruitment domain', () => {
  it('keeps consent unchecked by default', () => {
    const draft = emptyRecruitmentApplicationDraft();
    expect(draft.consentAccepted).toBe(false);
    expect(validateRecruitmentConsentStep(draft)).toMatch(/accept/i);
  });

  it('preserves worker role enum through professional validation', () => {
    const draft = emptyRecruitmentApplicationDraft();
    draft.role = 'physiotherapist';
    draft.yearsExperience = '5 years outpatient';
    draft.registrationState = 'Registered in Cyprus';
    expect(validateRecruitmentProfessionalStep(draft)).toBeNull();
    // Invalid role for runtime validation (not a WorkerRole).
    draft.role = 'other' as never;
    expect(validateRecruitmentProfessionalStep(draft)).toMatch(/role/i);
  });

  it('requires personal fields', () => {
    const draft = emptyRecruitmentApplicationDraft();
    expect(validateRecruitmentPersonalStep(draft)).toMatch(/name/i);
    draft.fullName = 'Alex Example';
    draft.email = 'alex@example.com';
    draft.phone = '+357';
    draft.countryOfResidence = 'Cyprus';
    expect(validateRecruitmentPersonalStep(draft)).toMatch(/location/i);
    draft.currentLocation = 'Nicosia';
    expect(validateRecruitmentPersonalStep(draft)).toBeNull();
  });

  it('requires a professional role on preferences', () => {
    const draft = emptyRecruitmentApplicationDraft();
    draft.employmentType = 'full_time';
    expect(validateRecruitmentPreferencesStep(draft)).toMatch(/role/i);
    draft.role = 'ward_assistant';
    expect(validateRecruitmentPreferencesStep(draft)).toBeNull();
  });

  it('requires role checklist documents when a role is selected', () => {
    expect(
      validateRecruitmentDocumentBatch({
        role: 'ward_assistant',
        documents: [
          {
            documentType: 'identity_document_front',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
          {
            documentType: 'identity_document_back',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateRecruitmentDocumentBatch({
        role: 'ward_assistant',
        documents: [
          {
            documentType: 'identity_document_front',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
          {
            documentType: 'identity_document_back',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
          {
            documentType: 'employment_certificate',
            mimeType: 'application/pdf',
            sizeBytes: 100,
          },
        ],
      }).ok,
    ).toBe(true);
  });

  it('reuses credential checklist for physiotherapist including practising licence', () => {
    const docs = recruitmentDocumentRequirementsForRole('physiotherapist');
    expect(docs.filter((d) => d.isRequired)).toHaveLength(5);
    expect(
      docs.some((d) => d.credentialType === 'tax_identification_proof'),
    ).toBe(false);
    expect(
      docs.some((d) => d.credentialType === 'social_insurance_proof'),
    ).toBe(false);
    expect(
      docs.some((d) => d.credentialType === 'physiotherapy_practising_licence'),
    ).toBe(true);
    expect(
      docs.find((d) => d.credentialType === 'physiotherapy_practising_licence')
        ?.requiresExpiry,
    ).toBe(true);
  });

  it('validates upload mime and size', () => {
    expect(
      validateRecruitmentUpload({ type: 'application/pdf', size: 1024 }).ok,
    ).toBe(true);
    expect(
      validateRecruitmentUpload({ type: 'text/plain', size: 1024 }).ok,
    ).toBe(false);
    expect(
      validateRecruitmentUpload({
        type: 'application/pdf',
        size: 11 * 1024 * 1024,
      }).ok,
    ).toBe(false);
    expect(
      validateRecruitmentUpload({ type: 'Application/PDF', size: 1024 }).ok,
    ).toBe(true);
  });

  it('rejects unsafe document types and path segments', () => {
    expect(isSafeRecruitmentDocumentType('cv')).toBe(true);
    expect(isSafeRecruitmentDocumentType('')).toBe(false);
    expect(isSafeRecruitmentDocumentType('../x')).toBe(false);
    expect(isSafeRecruitmentDocumentType('a/../../b')).toBe(false);
    expect(isSafeRecruitmentDocumentType('identity_document_front/../x')).toBe(
      false,
    );
    expect(isSafeRecruitmentDocumentType('unknown_doc')).toBe(false);
  });

  it('builds storage paths only from validated segments', () => {
    const candidateId = 'c1000001-dddd-4000-8000-0000000000d1';
    expect(
      buildRecruitmentStoragePath({
        candidateId,
        documentType: 'cv',
        extension: 'pdf',
        objectId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).toBe(
      `${candidateId}/cv/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.pdf`,
    );
    expect(
      buildRecruitmentStoragePath({
        candidateId: 'not-a-uuid',
        documentType: 'cv',
        extension: 'pdf',
      }),
    ).toBeNull();
    expect(
      buildRecruitmentStoragePath({
        candidateId,
        documentType: '../x',
        extension: 'pdf',
      }),
    ).toBeNull();
  });

  it('enforces file count and total byte budget', () => {
    expect(RECRUITMENT_MAX_UPLOAD_FILES).toBe(9);
    expect(RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
    expect(
      validateRecruitmentDocumentBatch({
        role: 'registered_nurse',
        documents: [
          {
            documentType: 'cv',
            mimeType: 'application/pdf',
            sizeBytes: RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES + 1,
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it('resolves expiry only for practising licence using Cyprus conventions', () => {
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'physiotherapy_practising_licence',
        expiresAtYmd: '2099-06-15',
      }),
    ).toEqual({ expiresAt: '2099-06-15' });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'physiotherapy_practising_licence',
        expiresAtYmd: '2020-01-01',
      }),
    ).toMatchObject({ error: expect.any(String) });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'nursing_licence',
        expiresAtYmd: '2099-06-15',
      }),
    ).toEqual({ expiresAt: null });
    expect(
      resolveRecruitmentDocumentExpiresAt({
        documentType: 'nursing_licence',
        expiresAtYmd: 'not-a-date',
      }),
    ).toMatchObject({ error: expect.any(String) });
  });

  it('exposes draft privacy notice version without claiming compliance', () => {
    expect(RECRUITMENT_PRIVACY_NOTICE_VERSION).toMatch(/draft/i);
    expect(RECRUITMENT_CONSENT_PLACEHOLDER.toLowerCase()).not.toContain(
      'gdpr compliant',
    );
  });
});
