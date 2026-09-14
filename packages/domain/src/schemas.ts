import { z } from 'zod';

import { CREDENTIAL_TYPES } from './credential-requirements';
import {
  ASSIGNMENT_STATUSES,
  COMMISSION_PAYER_TYPES,
  COMMISSION_STATUSES,
  CREDENTIAL_STATUSES,
  DEFAULT_COMMISSION_RATE_BPS,
  MEMBERSHIP_STATUSES,
  ONBOARDING_STATUSES,
  ORGANIZATION_TYPES,
  ORG_ROLES,
  ORG_STATUSES,
  PAYOUT_ACCOUNT_STATUSES,
  PAYOUT_STATUSES,
  PLATFORM_ADMIN_ROLES,
  SHIFT_STATUSES,
  TIMESHEET_STATUSES,
  VERIFICATION_STATUSES,
  WORKER_ROLES,
} from './types';

export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export const moneyMinorSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: currencyCodeSchema,
});

export const workerRoleSchema = z.enum(WORKER_ROLES);
export const credentialTypeSchema = z.enum(CREDENTIAL_TYPES);
export const orgRoleSchema = z.enum(ORG_ROLES);
export const orgStatusSchema = z.enum(ORG_STATUSES);
export const organizationTypeSchema = z.enum(ORGANIZATION_TYPES);
export const shiftStatusSchema = z.enum(SHIFT_STATUSES);
export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);
export const timesheetStatusSchema = z.enum(TIMESHEET_STATUSES);
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export const onboardingStatusSchema = z.enum(ONBOARDING_STATUSES);
export const credentialStatusSchema = z.enum(CREDENTIAL_STATUSES);
export const membershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);
export const platformAdminRoleSchema = z.enum(PLATFORM_ADMIN_ROLES);
export const payoutAccountStatusSchema = z.enum(PAYOUT_ACCOUNT_STATUSES);
export const payoutStatusSchema = z.enum(PAYOUT_STATUSES);
export const commissionPayerTypeSchema = z.enum(COMMISSION_PAYER_TYPES);
export const commissionStatusSchema = z.enum(COMMISSION_STATUSES);

export const orgSlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const reviewTimesheetSchema = z.object({
  timesheetId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  approvedMinutes: z.number().int().min(0).optional(),
  reviewNote: z.string().max(2000).optional(),
});

export const submitPayoutAccountSchema = z.object({
  country: z.string().length(2),
  currency: currencyCodeSchema,
  iban: z.string().min(15).max(34),
  accountHolderName: z.string().min(2).max(120),
  proofStoragePath: z.string().min(1).max(500),
  proofMimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
});

export const reportOrganizationPaymentSchema = z.object({
  payoutId: z.string().uuid(),
  bankReference: z.string().min(1).max(120),
  evidenceStoragePath: z.string().max(500).optional(),
});

export const financialSnapshotSchema = z.object({
  grossAmountMinor: z.number().int().nonnegative(),
  commissionRateBps: z.number().int().min(0).max(10000).default(DEFAULT_COMMISSION_RATE_BPS),
  commissionAmountMinor: z.number().int().nonnegative(),
  workerTransferAmountMinor: z.number().int().nonnegative(),
  organizationTotalDueMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export const createLocationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  postalCode: z.string().max(32).optional(),
  countryCode: z.string().length(2).default('CY'),
  timezone: z.string().min(1).default('Europe/Nicosia'),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(40).optional(),
  contactEmail: z.string().email().optional(),
});

export const createWardSchema = z.object({
  locationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  instructions: z.string().max(2000).optional(),
});

export const createShiftDraftSchema = z
  .object({
    organizationId: z.string().uuid(),
    locationId: z.string().uuid(),
    wardId: z.string().uuid().nullable().optional(),
    requiredRole: z
      .string({
        required_error: 'Select the worker role required for this shift.',
        invalid_type_error: 'Select the worker role required for this shift.',
      })
      .trim()
      .min(1, 'Select the worker role required for this shift.')
      .refine(
        (value): value is (typeof WORKER_ROLES)[number] =>
          (WORKER_ROLES as readonly string[]).includes(value),
        { message: 'Select the worker role required for this shift.' },
      ),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    breakMinutes: z.number().int().min(0).default(0),
    rateMinor: z.number().int().positive(),
    currency: currencyCodeSchema.default('EUR'),
    acceptanceDeadline: z.string().datetime({ offset: true }).nullable().optional(),
    title: z.string().max(200).optional(),
    notes: z.string().max(4000).optional(),
    requirements: z
      .array(
        z.object({
          requirementType: credentialTypeSchema,
          required: z.boolean().default(true),
        }),
      )
      .optional(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export const claimShiftInputSchema = z.object({
  shiftId: z.string().uuid(),
});

export const workerProfileUpdateSchema = z.object({
  workerRole: workerRoleSchema.optional(),
  bio: z.string().max(2000).nullable().optional(),
  onboardingStatus: onboardingStatusSchema.optional(),
});

export const credentialCreateSchema = z.object({
  credentialType: z.string().min(1).max(120),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  storagePath: z.string().min(1).max(500).optional(),
});

export const reviewCredentialSchema = z.object({
  credentialId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().max(2000).optional(),
});

export const reviewPayoutAccountSchema = z.object({
  payoutAccountId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().min(1).max(2000),
});

export const setWorkerVerificationSchema = z.object({
  workerId: z.string().uuid(),
  status: verificationStatusSchema,
  reason: z.string().max(2000).optional(),
});

export const suspendWorkerAccountSchema = z.object({
  workerId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

export const reactivateWorkerAccountSchema = z.object({
  workerId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

export const submitCredentialForReviewSchema = z.object({
  credentialId: z.string().uuid(),
});

export const approveReviewedCredentialsSchema = z.object({
  workerId: z.string().uuid(),
  credentialIds: z.array(z.string().uuid()).min(1).max(50),
  confirmReviewed: z.literal(true),
  expectedLastActivity: z.string().datetime({ offset: true }).optional(),
});

export const markCredentialsUnderReviewSchema = z.object({
  workerId: z.string().uuid(),
  credentialIds: z.array(z.string().uuid()).min(1).max(50),
});

export const listVerificationApplicationsSchema = z.object({
  search: z.string().max(200).optional(),
  role: workerRoleSchema.optional(),
  applicationStatus: z.string().max(80).optional(),
  payoutStatus: payoutAccountStatusSchema.optional(),
  sort: z
    .enum(['submitted_at', 'oldest_waiting', 'last_activity'])
    .default('last_activity'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateShiftDraftInput = z.infer<typeof createShiftDraftSchema>;
export type ClaimShiftInput = z.infer<typeof claimShiftInputSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type ReviewTimesheetInput = z.infer<typeof reviewTimesheetSchema>;
export type SubmitPayoutAccountInput = z.infer<typeof submitPayoutAccountSchema>;
export type ReportOrganizationPaymentInput = z.infer<
  typeof reportOrganizationPaymentSchema
>;
export type ReviewCredentialInput = z.infer<typeof reviewCredentialSchema>;
export type ReviewPayoutAccountInput = z.infer<typeof reviewPayoutAccountSchema>;
export type SetWorkerVerificationInput = z.infer<typeof setWorkerVerificationSchema>;
export type SuspendWorkerAccountInput = z.infer<typeof suspendWorkerAccountSchema>;
export type ReactivateWorkerAccountInput = z.infer<
  typeof reactivateWorkerAccountSchema
>;
export type ApproveReviewedCredentialsInput = z.infer<
  typeof approveReviewedCredentialsSchema
>;
export type ListVerificationApplicationsInput = z.infer<
  typeof listVerificationApplicationsSchema
>;

export const createOrganizationWithAdminInviteSchema = z.object({
  legalName: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
  slug: orgSlugSchema,
  organizationType: organizationTypeSchema,
  timezone: z.string().min(1).default('Europe/Nicosia'),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  postalCode: z.string().max(32).optional(),
  countryCode: z.string().length(2).default('CY'),
  taxVat: z.string().max(64).optional(),
  billingEmail: z.string().email().optional(),
  contactPhone: z.string().max(40).optional(),
  adminEmail: z.string().email(),
});

export const createOrganizationInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: orgRoleSchema,
});

export const revokeOrganizationInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

export const acceptOrganizationInvitationSchema = z.object({
  rawToken: z.string().min(1),
});

export const getOrganizationInvitationPreviewSchema = z.object({
  rawToken: z.string().min(1),
});

const trimmedString = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(max));

const emailOrEmpty = z
  .string()
  .transform((value) => value.trim())
  .refine(
    (value) => value === '' || z.string().email().safeParse(value).success,
    { message: 'Enter a valid email address' },
  );

export const updateOrganizationProfileSchema = z.object({
  organizationId: z.string().uuid(),
  legalName: trimmedString(200),
  displayName: trimmedString(200),
  organizationType: z.union([organizationTypeSchema, z.literal('')]),
  addressLine1: trimmedString(200),
  addressLine2: trimmedString(200),
  city: trimmedString(120),
  postalCode: trimmedString(32),
  countryCode: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => value === '' || /^[A-Z]{2}$/.test(value), {
      message: 'Country code must be 2 letters',
    }),
  taxVat: trimmedString(64),
  billingEmail: emailOrEmpty,
  primaryContactName: trimmedString(120),
  primaryContactEmail: emailOrEmpty,
});

export const submitOrganizationForReviewSchema = updateOrganizationProfileSchema;

export const approveOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
});

export const rejectOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

export const suspendOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

export const reactivateOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

export const listAdminOrganizationsSchema = z.object({
  search: z.string().max(200).optional(),
  status: orgStatusSchema.optional(),
  organizationType: organizationTypeSchema.optional(),
  sort: z.enum(['created_at', 'display_name', 'status']).default('created_at'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const getAdminOrganizationDetailSchema = z.object({
  organizationId: z.string().uuid(),
});

export const getMyOrganizationSetupSchema = z.object({
  organizationId: z.string().uuid(),
});

export type CreateOrganizationWithAdminInviteInput = z.infer<
  typeof createOrganizationWithAdminInviteSchema
>;
export type CreateOrganizationInvitationInput = z.infer<
  typeof createOrganizationInvitationSchema
>;
export type RevokeOrganizationInvitationInput = z.infer<
  typeof revokeOrganizationInvitationSchema
>;
export type AcceptOrganizationInvitationInput = z.infer<
  typeof acceptOrganizationInvitationSchema
>;
export type GetOrganizationInvitationPreviewInput = z.infer<
  typeof getOrganizationInvitationPreviewSchema
>;
export type UpdateOrganizationProfileInput = z.infer<
  typeof updateOrganizationProfileSchema
>;
export type SubmitOrganizationForReviewInput = z.infer<
  typeof submitOrganizationForReviewSchema
>;
export type ApproveOrganizationInput = z.infer<typeof approveOrganizationSchema>;
export type RejectOrganizationInput = z.infer<typeof rejectOrganizationSchema>;
export type SuspendOrganizationInput = z.infer<typeof suspendOrganizationSchema>;
export type ReactivateOrganizationInput = z.infer<typeof reactivateOrganizationSchema>;
export type ListAdminOrganizationsInput = z.infer<typeof listAdminOrganizationsSchema>;
export type GetAdminOrganizationDetailInput = z.infer<
  typeof getAdminOrganizationDetailSchema
>;
export type GetMyOrganizationSetupInput = z.infer<typeof getMyOrganizationSetupSchema>;
