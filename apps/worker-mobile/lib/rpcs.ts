import type { Tables } from '@bridge-hive/supabase-types';
import { claimErrorMessage as mapClaimError } from '@bridge-hive/domain';

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
  open_positions: number;
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
 * Prefer the dedicated RPC when available (migration 014).
 * Falls back to raw shift row if the RPC is not yet applied.
 */
export async function getWorkerShiftDetails(shiftId: string): Promise<{
  data: WorkerShiftDetails | null;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('get_worker_shift_details' as never, {
    p_shift_id: shiftId,
  } as never);

  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as WorkerShiftDetails | undefined;
    if (row?.shift_id) {
      const required = row.required_positions ?? 1;
      return {
        data: {
          ...row,
          required_positions: required,
          open_positions:
            typeof row.open_positions === 'number' ? row.open_positions : required,
        },
      };
    }
    return { data: null };
  }

  const missingFunction = /PGRST202|Could not find the function|schema cache/i.test(error.message ?? '');
  if (!missingFunction) {
    return { data: null, error: error.message };
  }

  // Fallback before migration 014 / 031 RPCs are applied
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .maybeSingle();

  if (shiftError || !shift) {
    return { data: null, error: shiftError?.message ?? error?.message ?? 'Shift not found' };
  }

  const requiredPositions = shift.required_positions ?? 1;
  const { count: activeCount } = await supabase
    .from('shift_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('shift_id', shiftId)
    .in('status', [
      'accepted',
      'checked_in',
      'checked_out',
      'submitted',
      'approved',
    ]);
  const openPositions = Math.max(0, requiredPositions - (activeCount ?? 0));

  return {
    data: {
      shift_id: shift.id,
      organization_name: 'Organization',
      location_name: 'Location',
      ward_name: null,
      title: shift.title,
      starts_at: shift.starts_at,
      ends_at: shift.ends_at,
      rate_minor: shift.rate_minor,
      currency: shift.currency,
      required_role: shift.required_role,
      status: shift.status,
      notes: shift.notes,
      break_minutes: shift.break_minutes,
      acceptance_deadline: shift.acceptance_deadline,
      required_positions: requiredPositions,
      open_positions: openPositions,
    },
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
