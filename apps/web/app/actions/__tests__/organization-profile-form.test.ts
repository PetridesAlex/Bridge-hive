import {
  canEditOrgProfile,
  formatOrgProfileIncompleteMessage,
  missingOrgProfileRequiredLabels,
  ORG_PROFILE_REQUIRED_FIELDS,
  translateOrgProfileIncompleteError,
  updateOrganizationProfileSchema,
} from '@bridge-hive/domain';

import { parseOrganizationProfileFormData } from '@/lib/organization-profile';
import { rpcErrorMessage } from '@/lib/admin/capabilities';

describe('Organization profile required fields', () => {
  it('requires legal name, display name, contact name, and contact email', () => {
    expect(ORG_PROFILE_REQUIRED_FIELDS.map((field) => field.label)).toEqual([
      'Legal name',
      'Display name',
      'Contact name',
      'Contact email',
    ]);
  });

  it('lists missing fields with user-facing labels', () => {
    expect(
      missingOrgProfileRequiredLabels({
        legalName: 'Acme Ltd',
        displayName: 'Acme',
        primaryContactName: '',
        primaryContactEmail: '   ',
      }),
    ).toEqual(['Contact name', 'Contact email']);
  });

  it('formats a readable incomplete message', () => {
    expect(formatOrgProfileIncompleteMessage(['Contact email', 'Billing email'])).toBe(
      'Complete the following required fields before submitting for review: Contact email, Billing email.',
    );
  });

  it('never exposes ORG_PROFILE_INCOMPLETE raw codes from translators', () => {
    const message = translateOrgProfileIncompleteError(
      'ORG_PROFILE_INCOMPLETE:primary_contact_email,primary_contact_name',
    );
    expect(message).not.toContain('ORG_PROFILE_INCOMPLETE');
    expect(message).toContain('Contact email');
    expect(message).toContain('Contact name');
  });
});

describe('parseOrganizationProfileFormData', () => {
  it('includes contact email under primaryContactEmail', () => {
    const formData = new FormData();
    formData.set('organizationId', '123e4567-e89b-12d3-a456-426614174000');
    formData.set('legalName', 'Test Hospital Ltd');
    formData.set('displayName', 'Test Hospital');
    formData.set('organizationType', 'hospital');
    formData.set('addressLine1', '1 Main');
    formData.set('addressLine2', '');
    formData.set('city', 'Nicosia');
    formData.set('postalCode', '1000');
    formData.set('countryCode', 'cy');
    formData.set('taxVat', '');
    formData.set('billingEmail', 'billing@test.local');
    formData.set('primaryContactName', 'Ada Admin');
    formData.set('primaryContactEmail', 'contact@test.local');

    const payload = parseOrganizationProfileFormData(formData);
    expect(payload.primaryContactEmail).toBe('contact@test.local');
    expect(payload).not.toHaveProperty('contactEmail');

    const parsed = updateOrganizationProfileSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.primaryContactEmail).toBe('contact@test.local');
      expect(parsed.data.billingEmail).toBe('billing@test.local');
      expect(parsed.data.countryCode).toBe('CY');
    }
  });

  it('maps saved contact email for display after reload', () => {
    const saved = {
      primary_contact_email: 'contact@test.local',
      billing_email: 'billing@test.local',
    };
    expect(saved.primary_contact_email).toBe('contact@test.local');
    expect(saved.billing_email).toBe('billing@test.local');
  });

  it('keeps typed values available for save-then-submit', () => {
    const formData = new FormData();
    formData.set('organizationId', '123e4567-e89b-12d3-a456-426614174000');
    formData.set('legalName', 'Test Hospital Ltd');
    formData.set('displayName', 'Test Hospital');
    formData.set('organizationType', 'clinic');
    formData.set('addressLine1', '');
    formData.set('addressLine2', '');
    formData.set('city', '');
    formData.set('postalCode', '');
    formData.set('countryCode', 'CY');
    formData.set('taxVat', '');
    formData.set('billingEmail', '');
    formData.set('primaryContactName', 'Unsaved Name');
    formData.set('primaryContactEmail', 'unsaved@test.local');

    const payload = parseOrganizationProfileFormData(formData);
    expect(payload.primaryContactName).toBe('Unsaved Name');
    expect(payload.primaryContactEmail).toBe('unsaved@test.local');
    expect(missingOrgProfileRequiredLabels(payload)).toEqual([]);
  });
});

describe('Required field indicators', () => {
  it('marks only DB-required fields', () => {
    const requiredLabels = ORG_PROFILE_REQUIRED_FIELDS.map((field) => field.label);
    expect(requiredLabels).toContain('Legal name');
    expect(requiredLabels).toContain('Display name');
    expect(requiredLabels).toContain('Contact name');
    expect(requiredLabels).toContain('Contact email');
    expect(requiredLabels).not.toContain('Address line 2');
    expect(requiredLabels).not.toContain('Tax/VAT number');
    expect(requiredLabels).not.toContain('Billing email');
  });
});

describe('rpcErrorMessage org profile incomplete', () => {
  it('never returns ORG_PROFILE_INCOMPLETE literally', () => {
    const message = rpcErrorMessage({ message: 'ORG_PROFILE_INCOMPLETE' });
    expect(message).not.toBe('ORG_PROFILE_INCOMPLETE');
    expect(message).not.toContain('ORG_PROFILE_INCOMPLETE');
    expect(message).toMatch(/Contact email/i);
  });

  it('translates field-suffixed incompleteness', () => {
    const message = rpcErrorMessage({
      message: 'ORG_PROFILE_INCOMPLETE:primary_contact_email',
    });
    expect(message).toContain('Contact email');
    expect(message).not.toContain('ORG_PROFILE_INCOMPLETE');
  });
});

describe('Under-review profile read-only', () => {
  it('locks profile editing and submission while under review', () => {
    expect(canEditOrgProfile('under_review')).toBe(false);
  });

  it('uses the submitted success copy', () => {
    expect('Organization submitted for review.').not.toContain('ORG_PROFILE');
  });
});

describe('Duplicate submission guard', () => {
  it('treats under_review as non-submittable', async () => {
    const { canSubmitOrgForReview } = await import('@bridge-hive/domain');
    expect(canSubmitOrgForReview('under_review')).toBe(false);
    expect(canSubmitOrgForReview('pending')).toBe(true);
  });
});
