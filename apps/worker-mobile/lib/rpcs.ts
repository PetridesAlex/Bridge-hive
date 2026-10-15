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
  filled_positions: number;
  open_positions: number;
  is_claimable: boolean;
  my_assignment_status: string | null;
};

/** Pilot check-in opens 30 minutes before shift start (server enforces the same rule). */
export const CHECK_IN_EARLY_MINUTES = 30;

export function getCheckInWindow(startsAt: string, endsAt: string, now = new Date()) {
  const starts = new Date(startsAt).getTime();
  const ends = new Date(endsAt).getTime();
  const opensAt = starts - CHECK_IN_EARLY_MINUTES * 60_000;
  const nowMs = now.getTime();

  return {
    opensAt: new Date(opensAt),
    closesAt: new Date(ends),
    isOpen: nowMs >= opensAt && nowMs <= ends,
    isTooEarly: nowMs < opensAt,
    isTooLate: nowMs > ends,
  };
}

export async function claimShift(shiftId: string) {
  const { data, error } = await supabase.rpc('claim_shift', { p_shift_id: shiftId });

  return {
    data: (data as ShiftAssignment | null) ?? null,
    error: error?.message,
    code: error?.code,
  };
}

export async function checkInAssignment(assignmentId: string) {
  const { data, error } = await supabase.rpc('check_in_assignment', {
    p_assignment_id: assignmentId,
  });

  return {
    data: (data as ShiftAssignment | null) ?? null,
    error: error?.message,
  };
}

export async function checkOutAssignment(assignmentId: string) {
  const { data, error } = await supabase.rpc('check_out_assignment', {
    p_assignment_id: assignmentId,
  });

  return {
    data: (data as ShiftAssignment | null) ?? null,
    error: error?.message,
  };
}

export async function submitTimesheetRpc(assignmentId: string) {
  const { data, error } = await supabase.rpc('submit_timesheet', {
    p_assignment_id: assignmentId,
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
 * Prefer the dedicated RPC when available (migration 014 / 031 / 035).
 * Falls back to raw shift row + availability RPC if details omit capacity.
 */
export async function getWorkerShiftDetails(shiftId: string): Promise<{
  data: WorkerShiftDetails | null;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('get_worker_shift_details' as never, {
    p_shift_id: shiftId,
  } as never);

  if (!error && data) {
    const row = (Array.isArray(data) ? data[0] : data) as Partial<WorkerShiftDetails> | undefined;
    if (!row) {
      return { data: null };
    }

    const required =
      typeof row.required_positions === 'number' ? row.required_positions : 1;
    let open =
      typeof row.open_positions === 'number' ? row.open_positions : undefined;
    let filled =
      typeof row.filled_positions === 'number' ? row.filled_positions : undefined;
    let isClaimable =
      typeof row.is_claimable === 'boolean' ? row.is_claimable : undefined;
    let myStatus =
      row.my_assignment_status === undefined
        ? undefined
        : (row.my_assignment_status as string | null);

    if (open === undefined || filled === undefined || isClaimable === undefined) {
      const { data: avail } = await supabase.rpc(
        'worker_shift_claim_availability' as never,
        { p_shift_id: shiftId } as never,
      );
      const availRow = (
        Array.isArray(avail) ? avail[0] : avail
      ) as Partial<WorkerShiftDetails> | null;
      if (availRow) {
        open = typeof availRow.open_positions === 'number' ? availRow.open_positions : open;
        filled =
          typeof availRow.filled_positions === 'number' ? availRow.filled_positions : filled;
        isClaimable =
          typeof availRow.is_claimable === 'boolean' ? availRow.is_claimable : isClaimable;
        if (myStatus === undefined) {
          myStatus = (availRow.my_assignment_status as string | null) ?? null;
        }
      }
    }

    return {
      data: {
        shift_id: String(row.shift_id),
        organization_name: String(row.organization_name ?? 'Organization'),
        location_name: String(row.location_name ?? 'Location'),
        ward_name: (row.ward_name as string | null) ?? null,
        title: (row.title as string | null) ?? null,
        starts_at: String(row.starts_at),
        ends_at: String(row.ends_at),
        rate_minor: Number(row.rate_minor ?? 0),
        currency: String(row.currency ?? 'EUR'),
        required_role: String(row.required_role),
        status: String(row.status),
        notes: (row.notes as string | null) ?? null,
        break_minutes: Number(row.break_minutes ?? 0),
        acceptance_deadline: (row.acceptance_deadline as string | null) ?? null,
        required_positions: required,
        filled_positions: filled ?? Math.max(0, required - (open ?? required)),
        open_positions: open ?? required,
        is_claimable: isClaimable ?? (open ?? required) > 0,
        my_assignment_status: myStatus ?? null,
      },
    };
  }

  // Fallback before migration 014 / 031 / 035 RPCs are applied
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .maybeSingle();

  if (shiftError || !shift) {
    return { data: null, error: shiftError?.message ?? error?.message ?? 'Shift not found' };
  }

  const requiredPositions = shift.required_positions ?? 1;
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
      filled_positions: 0,
      open_positions: requiredPositions,
      is_claimable: shift.status === 'published',
      my_assignment_status: null,
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

/** Map check-in / check-out / timesheet RPC errors to worker-friendly messages. */
export function assignmentActionErrorMessage(error?: string): string {
  if (!error) return 'Unable to update this assignment.';
  const upper = error.toUpperCase();
  if (upper.includes('CHECK_IN_TOO_EARLY')) {
    return 'Check-in opens 30 minutes before the shift starts.';
  }
  if (upper.includes('CHECK_IN_TOO_LATE')) {
    return 'This shift has already ended. Check-in is no longer available.';
  }
  if (upper.includes('ASSIGNMENT_NOT_CHECKED_IN')) {
    return 'Check in before you check out.';
  }
  if (upper.includes('ASSIGNMENT_NOT_CHECKED_OUT')) {
    return 'Check out before submitting your timesheet.';
  }
  if (upper.includes('NOT_AUTHORIZED') || upper.includes('NOT_AUTHENTICATED')) {
    return 'You are not allowed to update this assignment.';
  }
  if (upper.includes('ASSIGNMENT_NOT_ACCEPTED')) {
    return 'This assignment cannot be checked in right now.';
  }
  return error;
}
