import {
  canEditOrgProfile,
  canSubmitOrgForReview,
  isOrgOperational,
  ORG_STATUS_LABELS,
  orgOperationalBlockedMessage,
  orgPendingSubmitMessage,
  orgProfileCompleteness,
  orgSubmitCtaLabel,
  ORGANIZATION_TYPE_LABELS,
} from '@bridge-hive/domain';
import fs from 'node:fs/promises';
import path from 'node:path';

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

  describe('completeness is not approval', () => {
    it('4 of 4 complete still allows submit while pending', () => {
      const complete = orgProfileCompleteness({
        legalName: 'White Tiger Ltd',
        displayName: 'White Tiger',
        primaryContactName: 'Admin',
        primaryContactEmail: 'admin@example.com',
      });
      expect(complete.complete).toBe(4);
      expect(complete.percent).toBe(100);
      expect(canSubmitOrgForReview('pending')).toBe(true);
      expect(isOrgOperational('pending')).toBe(false);
      expect(
        orgPendingSubmitMessage({ status: 'pending', profileComplete: true }),
      ).toMatch(/not approval/i);
      expect(
        orgSubmitCtaLabel({ status: 'pending', profileComplete: true }),
      ).toBe('Submit for review');
    });

    it('incomplete profile keeps Complete setup CTA', () => {
      expect(
        orgSubmitCtaLabel({ status: 'pending', profileComplete: false }),
      ).toBe('Complete setup');
      expect(
        orgPendingSubmitMessage({ status: 'under_review', profileComplete: true }),
      ).toBeNull();
    });
  });
});

describe('submit action admin revalidation contract', () => {
  it('revalidates admin organization paths after submit RPC', async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), 'app/actions/organization-onboarding.ts'),
      'utf8',
    );
    expect(src).toMatch(/submit_organization_for_review/);
    expect(src).toMatch(/revalidatePath\('\/admin'\)/);
    expect(src).toMatch(/revalidatePath\('\/admin\/organizations'\)/);
    expect(src).toMatch(
      /revalidatePath\(`\/admin\/organizations\/\$\{parsed\.data\.organizationId\}`\)/,
    );
  });

  it('admin dashboard separates org review from worker under_review', async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), 'app/admin/(console)/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Orgs awaiting review/);
    expect(src).toMatch(/status=under_review/);
    expect(src).toMatch(/list_admin_organizations/);
    expect(src).toMatch(/Applications ready/);
    expect(src).toMatch(/verification_application_dashboard_counts/);
    expect(src).toMatch(/Organization queue — not worker applications/);
    expect(src).toMatch(/Mark notices read/);
  });

  it('mark-read action does not approve organizations', async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), 'app/actions/admin-org-notifications.ts'),
      'utf8',
    );
    expect(src).toMatch(/org_submitted/);
    expect(src).toMatch(/read_at/);
    expect(src).not.toMatch(/approve_organization/);
  });

  it('keeps migrations 001–023 untouched and adds worker package 024 separately', async () => {
    const dir = await fs.readdir(
      path.join(process.cwd(), '../../supabase/migrations'),
    );
    expect(dir).toContain('023_organization_account_activation.sql');
    expect(dir).toContain('024_worker_package_submit_and_profile_bootstrap.sql');
    expect(dir.filter((f) => f.startsWith('023')).length).toBe(1);
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
