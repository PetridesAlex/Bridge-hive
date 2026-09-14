import {
  canEditOrgProfile,
  canSubmitOrgForReview,
  isOrgOperational,
  ORG_STATUS_LABELS,
  orgOperationalBlockedMessage,
  ORGANIZATION_TYPE_LABELS,
} from '@bridge-hive/domain';

describe('Organization onboarding domain helpers', () => {
  describe('ORG_STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(ORG_STATUS_LABELS.pending).toBe('Pending');
      expect(ORG_STATUS_LABELS.under_review).toBe('Under review');
      expect(ORG_STATUS_LABELS.active).toBe('Active');
      expect(ORG_STATUS_LABELS.rejected).toBe('Rejected');
      expect(ORG_STATUS_LABELS.suspended).toBe('Suspended');
      expect(ORG_STATUS_LABELS.closed).toBe('Closed');
    });
  });

  describe('ORGANIZATION_TYPE_LABELS', () => {
    it('should have labels for all types', () => {
      expect(ORGANIZATION_TYPE_LABELS.hospital).toBe('Hospital');
      expect(ORGANIZATION_TYPE_LABELS.clinic).toBe('Clinic');
      expect(ORGANIZATION_TYPE_LABELS.nursing_home).toBe('Nursing home');
      expect(ORGANIZATION_TYPE_LABELS.other).toBe('Other');
    });
  });

  describe('isOrgOperational', () => {
    it('should return true only for active status', () => {
      expect(isOrgOperational('active')).toBe(true);
      expect(isOrgOperational('pending')).toBe(false);
      expect(isOrgOperational('under_review')).toBe(false);
      expect(isOrgOperational('rejected')).toBe(false);
      expect(isOrgOperational('suspended')).toBe(false);
      expect(isOrgOperational('closed')).toBe(false);
    });
  });

  describe('canEditOrgProfile', () => {
    it('should return true for pending and rejected', () => {
      expect(canEditOrgProfile('pending')).toBe(true);
      expect(canEditOrgProfile('rejected')).toBe(true);
      expect(canEditOrgProfile('under_review')).toBe(false);
      expect(canEditOrgProfile('active')).toBe(false);
      expect(canEditOrgProfile('suspended')).toBe(false);
      expect(canEditOrgProfile('closed')).toBe(false);
    });
  });

  describe('canSubmitOrgForReview', () => {
    it('should return true for pending and rejected', () => {
      expect(canSubmitOrgForReview('pending')).toBe(true);
      expect(canSubmitOrgForReview('rejected')).toBe(true);
      expect(canSubmitOrgForReview('under_review')).toBe(false);
      expect(canSubmitOrgForReview('active')).toBe(false);
      expect(canSubmitOrgForReview('suspended')).toBe(false);
      expect(canSubmitOrgForReview('closed')).toBe(false);
    });
  });

  describe('orgOperationalBlockedMessage', () => {
    it('should return null for active status', () => {
      expect(orgOperationalBlockedMessage('active')).toBeNull();
    });

    it('should return appropriate messages for non-operational statuses', () => {
      expect(orgOperationalBlockedMessage('pending')).toContain('pending');
      expect(orgOperationalBlockedMessage('under_review')).toContain('under review');
      expect(orgOperationalBlockedMessage('rejected')).toContain('rejected');
      expect(orgOperationalBlockedMessage('suspended')).toContain('suspended');
      expect(orgOperationalBlockedMessage('closed')).toContain('closed');
    });
  });
});

describe('ORG_PROFILE_REQUIRED_FIELDS helpers', () => {
  it('lists missing required labels', async () => {
    const { missingOrgProfileRequiredLabels } = await import('@bridge-hive/domain');
    expect(
      missingOrgProfileRequiredLabels({
        legalName: 'A',
        displayName: 'B',
        primaryContactName: null,
        primaryContactEmail: 'x@y.com',
      }),
    ).toEqual(['Contact name']);
  });

  it('translates incomplete errors without raw codes', async () => {
    const { translateOrgProfileIncompleteError } = await import('@bridge-hive/domain');
    const message = translateOrgProfileIncompleteError(
      'ORG_PROFILE_INCOMPLETE:legal_name,display_name',
    );
    expect(message).not.toContain('ORG_PROFILE_INCOMPLETE');
    expect(message).toContain('Legal name');
    expect(message).toContain('Display name');
  });
});

describe('Organization onboarding schemas', () => {
  describe('createOrganizationWithAdminInviteSchema', () => {
    it('should validate valid organization creation input', async () => {
      const { createOrganizationWithAdminInviteSchema } = await import(
        '@bridge-hive/domain'
      );
      const result = createOrganizationWithAdminInviteSchema.safeParse({
        legalName: 'Test Hospital Ltd',
        displayName: 'Test Hospital',
        slug: 'test-hospital',
        organizationType: 'hospital',
        timezone: 'Europe/Nicosia',
        countryCode: 'CY',
        adminEmail: 'admin@test.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug format', async () => {
      const { createOrganizationWithAdminInviteSchema } = await import(
        '@bridge-hive/domain'
      );
      const result = createOrganizationWithAdminInviteSchema.safeParse({
        legalName: 'Test Hospital Ltd',
        displayName: 'Test Hospital',
        slug: 'Test_Hospital',
        organizationType: 'hospital',
        timezone: 'Europe/Nicosia',
        countryCode: 'CY',
        adminEmail: 'admin@test.com',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const { createOrganizationWithAdminInviteSchema } = await import(
        '@bridge-hive/domain'
      );
      const result = createOrganizationWithAdminInviteSchema.safeParse({
        legalName: 'Test Hospital Ltd',
        displayName: 'Test Hospital',
        slug: 'test-hospital',
        organizationType: 'hospital',
        timezone: 'Europe/Nicosia',
        countryCode: 'CY',
        adminEmail: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateOrganizationProfileSchema', () => {
    it('should validate valid profile update', async () => {
      const { updateOrganizationProfileSchema } = await import('@bridge-hive/domain');
      const result = updateOrganizationProfileSchema.safeParse({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        legalName: 'Updated Legal',
        displayName: 'Updated Name',
        organizationType: 'clinic',
        addressLine1: '',
        addressLine2: '',
        city: 'Nicosia',
        postalCode: '',
        countryCode: 'CY',
        taxVat: '',
        billingEmail: '',
        primaryContactName: 'Ada',
        primaryContactEmail: 'ada@test.local',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid organization ID', async () => {
      const { updateOrganizationProfileSchema } = await import('@bridge-hive/domain');
      const result = updateOrganizationProfileSchema.safeParse({
        organizationId: 'not-a-uuid',
        legalName: 'Updated Legal',
        displayName: 'Updated Name',
        organizationType: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        countryCode: '',
        taxVat: '',
        billingEmail: '',
        primaryContactName: '',
        primaryContactEmail: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty optional emails for clearing', async () => {
      const { updateOrganizationProfileSchema } = await import('@bridge-hive/domain');
      const result = updateOrganizationProfileSchema.safeParse({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        legalName: 'Legal',
        displayName: 'Display',
        organizationType: 'hospital',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        countryCode: 'CY',
        taxVat: '',
        billingEmail: '',
        primaryContactName: 'Contact',
        primaryContactEmail: '',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Admin organization list serialization', () => {
  it('should strip tax_vat_number from list cards', () => {
    const mockOrgRow = {
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      display_name: 'Test Hospital',
      legal_name: 'Test Hospital Ltd',
      slug: 'test-hospital',
      organization_type: 'hospital',
      status: 'active',
      city: 'Nicosia',
      member_count: 5,
      created_at: '2024-01-01T00:00:00Z',
      total_count: 1,
      tax_vat_number: 'CY12345678X',
    };

    const serialized = {
      organization_id: mockOrgRow.organization_id,
      display_name: mockOrgRow.display_name,
      legal_name: mockOrgRow.legal_name,
      slug: mockOrgRow.slug,
      organization_type: mockOrgRow.organization_type,
      status: mockOrgRow.status,
      city: mockOrgRow.city,
      member_count: mockOrgRow.member_count,
      created_at: mockOrgRow.created_at,
      total_count: mockOrgRow.total_count,
    };

    expect(serialized).not.toHaveProperty('tax_vat_number');
    expect(mockOrgRow.tax_vat_number).toBe('CY12345678X');
  });
});
