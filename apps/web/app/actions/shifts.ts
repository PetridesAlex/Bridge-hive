'use server';

import {
  createShiftDraftSchema,
  reviewTimesheetSchema,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOrgMembership } from '@/lib/auth';
import { eurosToMinor, localInputToIsoWithTimezone } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
  error?: string;
  success?: boolean;
};

function zodErrorMessage(error: {
  flatten: () => {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}) {
  const flat = error.flatten();
  const field = Object.values(flat.fieldErrors).flat().filter(Boolean)[0];
  return field ?? flat.formErrors[0] ?? 'Validation failed';
}

async function parseShiftForm(
  formData: FormData,
  organizationId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const requirementsRaw = String(formData.get('requirements') ?? '').trim();
  const requirements = requirementsRaw
    ? requirementsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((requirementType) => ({ requirementType, required: true }))
    : undefined;

  const wardIdRaw = String(formData.get('wardId') ?? '');
  const locationId = String(formData.get('locationId') ?? '');
  const startsLocal = String(formData.get('startsAt') ?? '');
  const endsLocal = String(formData.get('endsAt') ?? '');
  const deadlineLocal = String(formData.get('acceptanceDeadline') ?? '');

  const { data: location } = await supabase
    .from('locations')
    .select('id, timezone')
    .eq('id', locationId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!location) {
    return {
      success: false as const,
      error: { message: 'Location not found or does not belong to this organization.' },
    };
  }

  let startsAtIso: string;
  let endsAtIso: string;
  let acceptanceDeadlineIso: string | null = null;

  try {
    startsAtIso = startsLocal
      ? localInputToIsoWithTimezone(startsLocal, location.timezone)
      : '';
    endsAtIso = endsLocal
      ? localInputToIsoWithTimezone(endsLocal, location.timezone)
      : '';
    acceptanceDeadlineIso = deadlineLocal
      ? localInputToIsoWithTimezone(deadlineLocal, location.timezone)
      : null;
  } catch (error) {
    return {
      success: false as const,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Invalid datetime or timezone format.',
      },
    };
  }

  if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
    return {
      success: false as const,
      error: { message: 'End time must be after start time.' },
    };
  }

  if (acceptanceDeadlineIso && startsAtIso && new Date(acceptanceDeadlineIso) >= new Date(startsAtIso)) {
    return {
      success: false as const,
      error: { message: 'Acceptance deadline must be before shift start time.' },
    };
  }

  const parsed = createShiftDraftSchema.safeParse({
    organizationId,
    locationId,
    wardId: wardIdRaw ? wardIdRaw : null,
    requiredRole: String(formData.get('requiredRole') ?? ''),
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    breakMinutes: Number(formData.get('breakMinutes') ?? 0),
    rateMinor: eurosToMinor(String(formData.get('rateEuros') ?? '0')),
    currency: String(formData.get('currency') ?? 'EUR') || 'EUR',
    acceptanceDeadline: acceptanceDeadlineIso,
    title: String(formData.get('title') ?? '') || undefined,
    notes: String(formData.get('notes') ?? '') || undefined,
    requirements,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error };
  }

  return { success: true as const, data: parsed.data };
}

export async function createShiftDraftAction(
  slug: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageShifts) {
    return { error: 'You do not have permission to create shifts.' };
  }

  const supabase = await createClient();
  const parsed = await parseShiftForm(formData, ctx.org.id, supabase);
  
  if (!parsed.success) {
    if ('message' in parsed.error) {
      return { error: parsed.error.message };
    }
    return { error: zodErrorMessage(parsed.error) };
  }

  const v = parsed.data;
  const { data: shift, error } = await supabase
    .from('shifts')
    .insert({
      organization_id: v.organizationId,
      location_id: v.locationId,
      ward_id: v.wardId ?? null,
      required_role: v.requiredRole,
      starts_at: v.startsAt,
      ends_at: v.endsAt,
      break_minutes: v.breakMinutes,
      rate_minor: v.rateMinor,
      currency: v.currency,
      status: 'draft',
      acceptance_deadline: v.acceptanceDeadline ?? null,
      title: v.title ?? null,
      notes: v.notes ?? null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  if (v.requirements?.length) {
    const { error: reqError } = await supabase.from('shift_requirements').insert(
      v.requirements.map((r) => ({
        shift_id: shift.id,
        requirement_type: r.requirementType,
        required: r.required,
      })),
    );
    if (reqError) {
      return { error: reqError.message };
    }
  }

  revalidatePath(`/org/${slug}/shifts`);
  redirect(`/org/${slug}/shifts/${shift.id}`);
}

export async function updateShiftDraftAction(
  slug: string,
  shiftId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageShifts) {
    return { error: 'You do not have permission to update shifts.' };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('shifts')
    .select('id, status')
    .eq('id', shiftId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!existing) {
    return { error: 'Shift not found.' };
  }
  if (existing.status !== 'draft') {
    return { error: 'Only draft shifts can be edited.' };
  }

  const parsed = await parseShiftForm(formData, ctx.org.id, supabase);
  
  if (!parsed.success) {
    if ('message' in parsed.error) {
      return { error: parsed.error.message };
    }
    return { error: zodErrorMessage(parsed.error) };
  }

  const v = parsed.data;
  const { error } = await supabase
    .from('shifts')
    .update({
      location_id: v.locationId,
      ward_id: v.wardId ?? null,
      required_role: v.requiredRole,
      starts_at: v.startsAt,
      ends_at: v.endsAt,
      break_minutes: v.breakMinutes,
      rate_minor: v.rateMinor,
      currency: v.currency,
      acceptance_deadline: v.acceptanceDeadline ?? null,
      title: v.title ?? null,
      notes: v.notes ?? null,
    })
    .eq('id', shiftId)
    .eq('organization_id', ctx.org.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from('shift_requirements').delete().eq('shift_id', shiftId);
  if (v.requirements?.length) {
    const { error: reqError } = await supabase.from('shift_requirements').insert(
      v.requirements.map((r) => ({
        shift_id: shiftId,
        requirement_type: r.requirementType,
        required: r.required,
      })),
    );
    if (reqError) {
      return { error: reqError.message };
    }
  }

  revalidatePath(`/org/${slug}/shifts`);
  revalidatePath(`/org/${slug}/shifts/${shiftId}`);
  return { success: true };
}


export async function publishShiftAction(
  slug: string,
  shiftId: string,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canPublishShifts) {
    return { error: 'You do not have permission to publish shifts.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('publish_shift', {
    p_shift_id: shiftId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/org/${slug}/shifts`);
  revalidatePath(`/org/${slug}/shifts/${shiftId}`);
  revalidatePath(`/org/${slug}/dashboard`);
  return { success: true };
}

export async function reviewTimesheetAction(
  slug: string,
  shiftId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canReviewTimesheets) {
    return { error: 'You do not have permission to review timesheets.' };
  }

  const approvedMinutesRaw = String(formData.get('approvedMinutes') ?? '').trim();
  const parsed = reviewTimesheetSchema.safeParse({
    timesheetId: String(formData.get('timesheetId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    approvedMinutes: approvedMinutesRaw
      ? Number.parseInt(approvedMinutesRaw, 10)
      : undefined,
    reviewNote: String(formData.get('reviewNote') ?? '') || undefined,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('review_timesheet', {
    p_timesheet_id: parsed.data.timesheetId,
    p_decision: parsed.data.decision,
    p_approved_minutes: parsed.data.approvedMinutes,
    p_review_note: parsed.data.reviewNote,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/org/${slug}/shifts/${shiftId}`);
  revalidatePath(`/org/${slug}/shifts`);
  return { success: true };
}
