import {
  RECRUITMENT_CONSENT_PLACEHOLDER,
  RECRUITMENT_PRIVACY_NOTICE_VERSION,
  emptyRecruitmentApplicationDraft,
  recruitmentDocumentRequirementsForRole,
  validateRecruitmentConsentStep,
  validateRecruitmentPersonalStep,
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
    draft.role = 'other' as typeof draft.role;
    expect(validateRecruitmentProfessionalStep(draft)).toMatch(/role/i);
  });

  it('requires personal fields', () => {
    const draft = emptyRecruitmentApplicationDraft();
    expect(validateRecruitmentPersonalStep(draft)).toMatch(/name/i);
    draft.fullName = 'Alex Example';
    draft.email = 'alex@example.com';
    draft.phone = '+357';
    draft.currentLocation = 'Nicosia';
    draft.countryOfResidence = 'Cyprus';
    expect(validateRecruitmentPersonalStep(draft)).toBeNull();
  });

  it('reuses credential checklist for physiotherapist including practising licence', () => {
    const docs = recruitmentDocumentRequirementsForRole('physiotherapist');
    expect(docs.filter((d) => d.isRequired)).toHaveLength(7);
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
  });

  it('exposes draft privacy notice version without claiming compliance', () => {
    expect(RECRUITMENT_PRIVACY_NOTICE_VERSION).toMatch(/draft/i);
    expect(RECRUITMENT_CONSENT_PLACEHOLDER.toLowerCase()).not.toContain(
      'gdpr compliant',
    );
  });
});
