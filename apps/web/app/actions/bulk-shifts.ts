'use server';

import {
  BULK_SHIFT_MAX,
  BULK_SHIFT_MIN,
  assertBulkShiftCount,
  createShiftDraftSchema,
  findExactDuplicateShifts,
  findOverlappingShifts,
  summarizeBulkBatch,
  type BulkCreationMode,
  type BulkPreviewShift,
  type BulkRequestedStatus,
  type WorkerRole,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type BulkRowError = {
  rowIndex: number;
  field: string;
  message: string;
};

export type CreateShiftsBatchResult =
  | {
      success: true;
      batchId: string;
      shiftIds: string[];
      shiftCount: number;
      requestedStatus: BulkRequestedStatus;
      creationMode: BulkCreationMode;
      idempotentReplay: boolean;
      overlapWarnings: Array<{ a: number; b: number }>;
    }
  | {
      success: false;
      error: string;
      rowErrors?: BulkRowError[];
      exactDuplicates?: Array<{ a: number; b: number }>;
    };

const bulkShiftRowSchema = z.object({
  locationId: z.string().uuid(),
  wardId: z.string().uuid().nullable().optional(),
  requiredRole: z.enum(['registered_nurse', 'ward_assistant']),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  breakMinutes: z.number().int().min(0).default(0),
  rateMinor: z.number().int().positive(),
  currency: z.string().length(3).default('EUR'),
  acceptanceDeadline: z.string().datetime({ offset: true }).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  requirements: z
    .array(
      z.object({
        requirementType: z.string().min(1).max(120),
        required: z.boolean().default(true),
      }),
    )
    .optional(),
});

const createShiftsBatchInputSchema = z.object({
  requestKey: z.string().trim().min(8).max(128),
  requestedStatus: z.enum(['draft', 'published']),
  creationMode: z.enum(['repeat', 'individual', 'custom']),
  allowExactDuplicates: z.boolean().default(false),
  shifts: z.array(bulkShiftRowSchema).min(BULK_SHIFT_MIN).max(BULK_SHIFT_MAX),
});

export type CreateShiftsBatchInput = z.infer<typeof createShiftsBatchInputSchema>;

function parseBulkRowErrorDetail(detail: string | undefined): BulkRowError | null {
  if (!detail) return null;
  // detail format: rowIndex=N field=F message=M
  const rowMatch = /rowIndex=(\d+)/.exec(detail);
  const fieldMatch = /field=([^\s]+)/.exec(detail);
  const messageMatch = /message=(.+)$/.exec(detail);
  if (!rowMatch || !fieldMatch || !messageMatch) return null;
  return {
    rowIndex: Number(rowMatch[1]),
    field: fieldMatch[1]!,
    message: messageMatch[1]!.trim(),
  };
}

function mapRpcError(message: string, details?: string): CreateShiftsBatchResult {
  if (message.includes('NOT_AUTHENTICATED')) {
    return { success: false, error: 'You must be signed in to create shifts.' };
  }
  if (message.includes('NOT_AUTHORIZED')) {
    return { success: false, error: 'You do not have permission to create shifts.' };
  }
  if (message.includes('ORG_NOT_ACTIVE')) {
    return {
      success: false,
      error: 'This organization must be active before publishing shifts.',
    };
  }
  if (message.includes('BATCH_TOO_SMALL')) {
    return {
      success: false,
      error: `Create at least ${BULK_SHIFT_MIN} shifts in a batch.`,
    };
  }
  if (message.includes('BATCH_TOO_LARGE') || message.includes('PAYLOAD_TOO_LARGE')) {
    return {
      success: false,
      error: `A batch can include at most ${BULK_SHIFT_MAX} shifts.`,
    };
  }
  if (message.includes('REQUEST_KEY_CONFLICT')) {
    return {
      success: false,
      error:
        'This batch request key was already used with different shift data. Refresh and try again.',
    };
  }
  if (message.includes('BULK_ROW_ERROR')) {
    const rowError = parseBulkRowErrorDetail(details);
    return {
      success: false,
      error: rowError?.message ?? 'One or more shifts failed validation.',
      rowErrors: rowError ? [rowError] : undefined,
    };
  }
  return {
    success: false,
    error: 'Unable to create shifts. Please check your inputs and try again.',
  };
}

export async function createShiftsBatchAction(
  slug: string,
  input: CreateShiftsBatchInput,
): Promise<CreateShiftsBatchResult> {
  const ctx = await requireOrgMembership(slug);

  if (!ctx.capabilities.canManageShifts) {
    return { success: false, error: 'You do not have permission to create shifts.' };
  }

  if (input.requestedStatus === 'published' && !ctx.capabilities.canPublishShifts) {
    return { success: false, error: 'You do not have permission to publish shifts.' };
  }

  if (input.requestedStatus === 'published' && !ctx.capabilities.canOperate) {
    return {
      success: false,
      error: 'This organization must be active before publishing shifts.',
    };
  }

  const parsed = createShiftsBatchInputSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const field = Object.values(flat.fieldErrors).flat().filter(Boolean)[0];
    return {
      success: false,
      error: field ?? flat.formErrors[0] ?? 'Validation failed',
    };
  }

  const countCheck = assertBulkShiftCount(parsed.data.shifts.length);
  if (!countCheck.ok) {
    return { success: false, error: countCheck.error };
  }

  const rowErrors: BulkRowError[] = [];
  const preview: BulkPreviewShift[] = [];

  for (let i = 0; i < parsed.data.shifts.length; i++) {
    const row = parsed.data.shifts[i]!;
    const draft = createShiftDraftSchema.safeParse({
      organizationId: ctx.org.id,
      locationId: row.locationId,
      wardId: row.wardId ?? null,
      requiredRole: row.requiredRole,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      breakMinutes: row.breakMinutes,
      rateMinor: row.rateMinor,
      currency: row.currency,
      acceptanceDeadline: row.acceptanceDeadline ?? null,
      title: row.title ?? undefined,
      notes: row.notes ?? undefined,
      requirements: row.requirements?.map((r) => ({
        requirementType: r.requirementType as never,
        required: r.required,
      })),
    });

    if (!draft.success) {
      const flat = draft.error.flatten();
      const fieldKey = Object.keys(flat.fieldErrors)[0] ?? 'row';
      const message =
        Object.values(flat.fieldErrors).flat().filter(Boolean)[0] ??
        flat.formErrors[0] ??
        'Invalid shift row';
      rowErrors.push({ rowIndex: i, field: fieldKey, message });
      continue;
    }

    if (
      draft.data.acceptanceDeadline &&
      new Date(draft.data.acceptanceDeadline) >= new Date(draft.data.startsAt)
    ) {
      rowErrors.push({
        rowIndex: i,
        field: 'acceptanceDeadline',
        message: 'Acceptance deadline must be before shift start time.',
      });
      continue;
    }

    preview.push({
      rowIndex: i,
      dateYmd: draft.data.startsAt.slice(0, 10),
      startsAtIso: draft.data.startsAt,
      endsAtIso: draft.data.endsAt,
      requiredRole: draft.data.requiredRole as WorkerRole,
      locationId: draft.data.locationId,
      wardId: draft.data.wardId,
      rateMinor: draft.data.rateMinor,
      currency: draft.data.currency,
      breakMinutes: draft.data.breakMinutes,
      title: draft.data.title,
    });
  }

  if (rowErrors.length) {
    return {
      success: false,
      error: rowErrors[0]!.message,
      rowErrors,
    };
  }

  const exactDuplicates = findExactDuplicateShifts(preview);
  if (exactDuplicates.length > 0 && !parsed.data.allowExactDuplicates) {
    return {
      success: false,
      error:
        'Some shifts are exact duplicates. Confirm to create them anyway, or remove duplicates.',
      exactDuplicates,
    };
  }

  const overlapWarnings = findOverlappingShifts(preview);
  // Summary available for callers that want it (UI computes client-side too).
  void summarizeBulkBatch(preview);

  const supabase = await createClient();

  // Verify locations belong to org (defense in depth; RPC also checks).
  const locationIds = [...new Set(parsed.data.shifts.map((s) => s.locationId))];
  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('id')
    .eq('organization_id', ctx.org.id)
    .in('id', locationIds);

  if (locError || !locations || locations.length !== locationIds.length) {
    return {
      success: false,
      error: 'One or more locations were not found in this organization.',
    };
  }

  const rpcShifts = parsed.data.shifts.map((row) => ({
    location_id: row.locationId,
    ward_id: row.wardId ?? null,
    required_role: row.requiredRole,
    starts_at: row.startsAt,
    ends_at: row.endsAt,
    break_minutes: row.breakMinutes,
    rate_minor: row.rateMinor,
    currency: row.currency,
    acceptance_deadline: row.acceptanceDeadline ?? null,
    title: row.title ?? null,
    notes: row.notes ?? null,
    requirements: (row.requirements ?? []).map((r) => ({
      requirement_type: r.requirementType,
      required: r.required,
    })),
  }));

  const { data, error } = await supabase.rpc('create_shifts_batch', {
    p_organization_id: ctx.org.id,
    p_request_key: parsed.data.requestKey,
    p_requested_status: parsed.data.requestedStatus,
    p_creation_mode: parsed.data.creationMode,
    p_shifts: rpcShifts,
  });

  if (error) {
    return mapRpcError(error.message ?? '', error.details);
  }

  const payload = data as {
    batch_id?: string;
    shift_ids?: string[];
    shift_count?: number;
    requested_status?: string;
    creation_mode?: string;
    idempotent_replay?: boolean;
  } | null;

  if (!payload?.batch_id || !Array.isArray(payload.shift_ids)) {
    return { success: false, error: 'Unexpected response from shift batch create.' };
  }

  revalidatePath(`/org/${slug}/shifts`);
  revalidatePath(`/org/${slug}/dashboard`);

  return {
    success: true,
    batchId: payload.batch_id,
    shiftIds: payload.shift_ids,
    shiftCount: payload.shift_count ?? payload.shift_ids.length,
    requestedStatus: (payload.requested_status as BulkRequestedStatus) ?? parsed.data.requestedStatus,
    creationMode: (payload.creation_mode as BulkCreationMode) ?? parsed.data.creationMode,
    idempotentReplay: Boolean(payload.idempotent_replay),
    overlapWarnings,
  };
}
