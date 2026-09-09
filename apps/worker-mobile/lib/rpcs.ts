import type { Tables } from '@bridge-hive/supabase-types';

import { supabase } from '@/lib/supabase';

export type ShiftAssignment = Tables<'shift_assignments'>;
export type PayoutAccount = Tables<'payout_accounts'>;

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
};

export async function claimShift(shiftId: string) {
  const { data, error } = await supabase.rpc('claim_shift', { p_shift_id: shiftId });

  return {
    data: (data as ShiftAssignment | null) ?? null,
    error: error?.message,
    code: error?.code,
  };
}

export async function submitPayoutAccount(params: {
  country: string;
  currency: string;
  maskedIban: string;
}) {
  const { data, error } = await supabase.rpc('submit_payout_account', {
    p_country: params.country,
    p_currency: params.currency,
    p_masked_iban: params.maskedIban,
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

  if (!error && data) {
    const row = (Array.isArray(data) ? data[0] : data) as WorkerShiftDetails | undefined;
    return { data: row ?? null };
  }

  // Fallback before migration 014 is applied
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .maybeSingle();

  if (shiftError || !shift) {
    return { data: null, error: shiftError?.message ?? error?.message ?? 'Shift not found' };
  }

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
    },
  };
}

/** Map claim_shift errors to worker-friendly messages. */
export function claimErrorMessage(error?: string): string {
  if (!error) return 'Unable to claim this shift.';
  const upper = error.toUpperCase();
  if (upper.includes('SHIFT_ALREADY_FILLED') || upper.includes('SHIFT_NOT_AVAILABLE')) {
    return 'This shift was just filled by another worker.';
  }
  if (upper.includes('NOT_ELIGIBLE') || upper.includes('NOT_VERIFIED')) {
    return 'You are not eligible for this shift yet. Check verification and credentials.';
  }
  if (upper.includes('SCHEDULE_CONFLICT')) {
    return 'This shift conflicts with another assignment on your schedule.';
  }
  if (upper.includes('ROLE_MISMATCH')) {
    return 'This shift requires a different worker role.';
  }
  if (upper.includes('MISSING_CREDENTIAL') || upper.includes('EXPIRED')) {
    return 'A required credential is missing or expired.';
  }
  return error;
}
