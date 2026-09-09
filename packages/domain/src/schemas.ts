import { z } from 'zod';

import {
  ASSIGNMENT_STATUSES,
  COMMISSION_PAYER_TYPES,
  COMMISSION_STATUSES,
  CREDENTIAL_STATUSES,
  DEFAULT_COMMISSION_RATE_BPS,
  MEMBERSHIP_STATUSES,
  ONBOARDING_STATUSES,
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
export const orgRoleSchema = z.enum(ORG_ROLES);
export const orgStatusSchema = z.enum(ORG_STATUSES);
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
  maskedIban: z.string().min(4).max(64),
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
    requiredRole: workerRoleSchema,
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
          requirementType: z.string().min(1).max(120),
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

export type CreateShiftDraftInput = z.infer<typeof createShiftDraftSchema>;
export type ClaimShiftInput = z.infer<typeof claimShiftInputSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type ReviewTimesheetInput = z.infer<typeof reviewTimesheetSchema>;
export type SubmitPayoutAccountInput = z.infer<typeof submitPayoutAccountSchema>;
export type ReportOrganizationPaymentInput = z.infer<
  typeof reportOrganizationPaymentSchema
>;
