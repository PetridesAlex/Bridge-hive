import type { Tables } from '@bridge-hive/supabase-types';
import { claimErrorMessage as mapClaimError } from '@bridge-hive/domain';

import {
  metadataOnlyShiftDetailsCapacity,
  normalizeShiftDetailsCapacity,
} from '@/lib/shift-availability';
import { supabase } from '@/lib/supabase';

export type ShiftAssignment = Tables<'shift_assignments'>;
export type PayoutAccount = Tables<'payout_accounts'>;
export type Timesheet = Tables<'timesheets'>;

export type WorkerShiftDetails = {
  shift_id: string;
  organization_name: string;
  location_name: string;
  ward_name: string | null;
  title: string | null;
  starts_at: string;
  ends_at: string;
  rate_minor: number;
  currency: string;
  required_role: string;
  status: string;
  notes: string | null;
  break_minutes: number;
  acceptance_deadline: string | null;
  required_positions: number;
  /**
   * Authoritative remaining seats from get_worker_shift_details.
   * null = unknown — never treat as 0 or as "all open".
   */
  open_positions: number | null;
  /** True only when open_positions came from the security-definer RPC. */
  availability_known: boolean;
  /** Set when capacity could not be loaded; claim stays disabled. */
  availability_error: string | null;
  location_address_line1: string | null;
  location_address_line2: string | null;
  location_city: string | null;
  location_postal_code: string | null;
  location_country_code: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
};

/** Scheduled working minutes for a shift (duration minus break). */
export function scheduledWorkingMinutes(
  startsAt: string,
  endsAt: string,
  breakMinutes = 0,
): number {
  const duration = Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000),
  );
  return Math.max(1, duration - Math.max(0, breakMinutes));
}

export function shiftHasEnded(endsAt: string, now = new Date()): boolean {
  return now.getTime() >= new Date(endsAt).getTime();
}

/** Assignment statuses that can still submit completed hours. */
export function canSubmitCompletedHours(status: string | undefined): boolean {
  return status === 'accepted' || status === 'checked_in' || status === 'checked_out';
}

export async function claimShift(shiftId: string) {
  const { data, error } = await supabase.rpc('claim_shift', { p_shift_id: shiftId });

  return {
    data: (data as ShiftAssignment | null) ?? null,
    error: error?.message,
    code: error?.code,
  };
}

export async function submitTimesheetRpc(
  assignmentId: string,
  submittedMinutes: number,
) {
  const { data, error } = await supabase.rpc('submit_timesheet', {
    p_assignment_id: assignmentId,
    p_submitted_minutes: submittedMinutes,
  });

  return {
    data: (data as Timesheet | null) ?? null,
    error: error?.message,
  };
}

export async function submitPayoutAccount(params: {
  country: string;
  currency: string;
  iban: string;
  accountHolderName: string;
  proofStoragePath: string;
  proofMimeType: string;
}) {
  const { data, error } = await supabase.rpc('submit_payout_account', {
    p_country: params.country,
    p_currency: params.currency,
    p_iban: params.iban,
    p_account_holder_name: params.accountHolderName,
    p_proof_storage_path: params.proofStoragePath,
    p_proof_mime_type: params.proofMimeType,
  });

  return {
    data: (data as PayoutAccount | null) ?? null,
    error: error?.message,
  };
}

/**
 * Prefer security-definer get_worker_shift_details (open_positions via
 * shift_open_positions). Never recount peer assignments under worker RLS.
 * If the RPC is missing or omits capacity, availability stays unknown.
 */
export async function getWorkerShiftDetails(shiftId: string): Promise<{
  data: WorkerShiftDetails | null;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('get_worker_shift_details' as never, {
    p_shift_id: shiftId,
  } as never);

  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as
      | Parameters<typeof normalizeShiftDetailsCapacity>[0]
      | undefined;
    if (row?.shift_id) {
      return { data: normalizeShiftDetailsCapacity(row) as WorkerShiftDetails };
    }
    return { data: null };
  }

  const missingFunction = /PGRST202|Could not find the function|schema cache/i.test(
    error.message ?? '',
  );
  if (!missingFunction) {
    return { data: null, error: error.message };
  }

  // Metadata-only fallback: never invent capacity from RLS-limited assignment rows.
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .maybeSingle();

  if (shiftError || !shift) {
    return {
      data: null,
      error: shiftError?.message ?? error.message ?? 'Shift not found',
    };
  }

  return {
    data: metadataOnlyShiftDetailsCapacity({
      shiftId: shift.id,
      title: shift.title,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      rateMinor: shift.rate_minor,
      currency: shift.currency,
      requiredRole: shift.required_role,
      status: shift.status,
      notes: shift.notes,
      breakMinutes: shift.break_minutes,
      acceptanceDeadline: shift.acceptance_deadline,
      requiredPositions: shift.required_positions,
    }) as WorkerShiftDetails,
  };
}

/** Map claim_shift errors to worker-friendly messages. */
export function claimErrorMessage(
  error?: string,
  requiredRole?: string | null,
): string {
  return mapClaimError(error, { requiredRole });
}

/** Map completed-hours / timesheet RPC errors to worker-friendly messages. */
export function assignmentActionErrorMessage(error?: string): string {
  if (!error) return 'Unable to update this assignment.';
  const upper = error.toUpperCase();
  if (upper.includes('SHIFT_NOT_ENDED')) {
    return 'You can submit completed hours after the scheduled end time.';
  }
  if (upper.includes('INVALID_SUBMITTED_MINUTES')) {
    return 'Enter completed time between 1 minute and 24 hours.';
  }
  if (upper.includes('ASSIGNMENT_NOT_COMPLETABLE')) {
    return 'This assignment cannot submit completed hours right now.';
  }
  if (upper.includes('CHECK_IN_RETIRED')) {
    return 'Check-in is no longer used. Submit completed hours after the shift ends.';
  }
  if (upper.includes('NOT_AUTHORIZED') || upper.includes('NOT_AUTHENTICATED')) {
    return 'You are not allowed to update this assignment.';
  }
  return error;
}
