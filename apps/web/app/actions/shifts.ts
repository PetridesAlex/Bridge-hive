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
  const requirementTypes = formData
    .getAll('requirementTypes')
    .map((value) => String(value).trim())
    .filter(Boolean);
  const requirements = requirementTypes.length
    ? requirementTypes.map((requirementType) => ({
        requirementType,
        required: true,
      }))
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

  if (acceptanceDeadlineIso && new Date(acceptanceDeadlineIso) <= new Date()) {
    return {
      success: false as const,
      error: {
        message:
          'Acceptance deadline must be in the future so workers can still claim this shift.',
      },
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
    return { error: 'Unable to save this shift. Please check your inputs and try again.' };
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
      return { error: 'Unable to save shift requirements. Please try again.' };
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
    return {
      error:
        'The required worker role cannot be changed after a shift is published.',
    };
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
    if (error.message?.includes('SHIFT_ROLE_LOCKED')) {
      return {
        error:
          'The required worker role cannot be changed after a shift is published.',
      };
    }
    return { error: 'Unable to update this shift. Please try again.' };
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
      return { error: 'Unable to save shift requirements. Please try again.' };
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

  const { data: existing } = await supabase
    .from('shifts')
    .select('id, status, acceptance_deadline, starts_at')
    .eq('id', shiftId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!existing) {
    return { error: 'Shift not found.' };
  }
  if (existing.status !== 'draft') {
    return { error: 'Only draft shifts can be published.' };
  }
  if (
    existing.acceptance_deadline &&
    new Date(existing.acceptance_deadline) <= new Date()
  ) {
    return {
      error:
        'Acceptance deadline is already past. Update the deadline before publishing so workers can claim this shift.',
    };
  }

  const { error } = await supabase.rpc('publish_shift', {
    p_shift_id: shiftId,
  });

  if (error) {
    if (error.message?.includes('ORG_NOT_ACTIVE')) {
      return { error: 'This organization is not active.' };
    }
    if (error.message?.includes('SHIFT_DEADLINE_IN_PAST')) {
      return {
        error:
          'Acceptance deadline is already past. Update the deadline before publishing so workers can claim this shift.',
      };
    }
    return { error: 'Unable to publish this shift. Please try again.' };
  }

  revalidatePath(`/org/${slug}/shifts`);
  revalidatePath(`/org/${slug}/shifts/${shiftId}`);
  revalidatePath(`/org/${slug}/dashboard`);
  return { success: true };
}

export async function extendShiftAcceptanceDeadlineAction(
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
    .select('id, status, starts_at, location_id, organization_id')
    .eq('id', shiftId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!existing) {
    return { error: 'Shift not found.' };
  }
  if (existing.status !== 'published') {
    return {
      error: 'Only published shifts can reopen the acceptance window this way.',
    };
  }
  if (new Date(existing.starts_at) <= new Date()) {
    return { error: 'This shift has already started and cannot accept claims.' };
  }

  const { count } = await supabase
    .from('shift_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('shift_id', shiftId)
    .in('status', ['accepted', 'checked_in', 'checked_out', 'submitted', 'approved']);

  if ((count ?? 0) > 0) {
    return { error: 'This shift already has an assignment.' };
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id, timezone')
    .eq('id', existing.location_id)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!location) {
    return { error: 'Location not found for this shift.' };
  }

  const deadlineLocal = String(formData.get('acceptanceDeadline') ?? '').trim();
  if (!deadlineLocal) {
    return { error: 'Choose a new acceptance deadline.' };
  }

  let acceptanceDeadlineIso: string;
  try {
    acceptanceDeadlineIso = localInputToIsoWithTimezone(
      deadlineLocal,
      location.timezone,
    );
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Invalid datetime or timezone format.',
    };
  }

  if (new Date(acceptanceDeadlineIso) <= new Date()) {
    return {
      error: 'Acceptance deadline must be in the future.',
    };
  }
  if (new Date(acceptanceDeadlineIso) >= new Date(existing.starts_at)) {
    return {
      error: 'Acceptance deadline must be before the shift start time.',
    };
  }

  const { error } = await supabase
    .from('shifts')
    .update({ acceptance_deadline: acceptanceDeadlineIso })
    .eq('id', shiftId)
    .eq('organization_id', ctx.org.id)
    .eq('status', 'published');

  if (error) {
    return { error: 'Unable to update the acceptance deadline. Please try again.' };
  }

  revalidatePath(`/org/${slug}/shifts`);
  revalidatePath(`/org/${slug}/shifts/${shiftId}`);
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
