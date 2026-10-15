import type { Tables } from '@bridge-hive/supabase-types';

import { supabase } from '@/lib/supabase';

export type Shift = Tables<'shifts'>;
export type ShiftAssignment = Tables<'shift_assignments'>;
export type Timesheet = Tables<'timesheets'>;
export type Credential = Tables<'credentials'>;
export type Payout = Tables<'payouts'>;
export type PayoutAccount = Tables<'payout_accounts'>;
export type Notification = Tables<'notifications'>;
export type ShiftRequirement = Tables<'shift_requirements'>;

export type MarketplaceShift = Shift & {
  open_positions: number;
  filled_positions: number;
  is_claimable: boolean;
  my_assignment_status: string | null;
};

type ClaimAvailabilityRow = {
  shift_id: string;
  required_positions: number;
  filled_positions: number;
  open_positions: number;
  is_claimable: boolean;
  my_assignment_status: string | null;
};

export async function getPublishedShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'published')
    .order('starts_at', { ascending: true });

  if (error) {
    return { data: [] as MarketplaceShift[], error: error.message };
  }

  if (!data?.length) {
    return { data: [] as MarketplaceShift[] };
  }

  const shiftIds = data.map((shift) => shift.id);
  const { data: availabilityRows, error: availabilityError } = await supabase.rpc(
    'worker_shifts_claim_availability' as never,
    { p_shift_ids: shiftIds } as never,
  );

  if (availabilityError) {
    // Fallback before migration 035: treat every published shift as fully open.
    const enriched = data.map(
      (shift) =>
        ({
          ...shift,
          filled_positions: 0,
          open_positions: shift.required_positions ?? 1,
          is_claimable: true,
          my_assignment_status: null,
        }) satisfies MarketplaceShift,
    );
    return { data: enriched, error: undefined };
  }

  const byId = new Map<string, ClaimAvailabilityRow>();
  for (const row of (availabilityRows as ClaimAvailabilityRow[] | null) ?? []) {
    byId.set(row.shift_id, row);
  }

  const enriched = data.map((shift) => {
    const avail = byId.get(shift.id);
    const required = avail?.required_positions ?? shift.required_positions ?? 1;
    return {
      ...shift,
      required_positions: required,
      filled_positions: avail?.filled_positions ?? 0,
      open_positions: avail?.open_positions ?? required,
      is_claimable: avail?.is_claimable ?? true,
      my_assignment_status: avail?.my_assignment_status ?? null,
    } satisfies MarketplaceShift;
  });

  return { data: enriched };
}

export async function getShiftById(shiftId: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .maybeSingle();

  return { data: data as Shift | null, error: error?.message };
}

export async function getShiftRequirements(shiftId: string) {
  const { data, error } = await supabase
    .from('shift_requirements')
    .select('*')
    .eq('shift_id', shiftId);

  return { data: (data ?? []) as ShiftRequirement[], error: error?.message };
}

/** Assignment row with optional nested shift fields for Work/Home lists. */
export type AssignmentWithShift = ShiftAssignment & {
  shifts: Pick<
    Shift,
    | 'id'
    | 'title'
    | 'starts_at'
    | 'ends_at'
    | 'rate_minor'
    | 'currency'
    | 'required_role'
    | 'status'
    | 'break_minutes'
    | 'required_positions'
  > | null;
};

export async function getMyAssignments(workerId: string) {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select(
      '*, shifts ( id, title, starts_at, ends_at, rate_minor, currency, required_role, status, break_minutes, required_positions )',
    )
    .eq('worker_id', workerId)
    .order('accepted_at', { ascending: false });

  return { data: (data ?? []) as AssignmentWithShift[], error: error?.message };
}

export async function getAssignmentById(assignmentId: string) {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle();

  return { data: data as ShiftAssignment | null, error: error?.message };
}

export async function getMyCredentials(workerId: string) {
  const { data, error } = await supabase
    .from('credentials')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  return { data: (data ?? []) as Credential[], error: error?.message };
}

export async function getMyPayouts(workerId: string) {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  return { data: (data ?? []) as Payout[], error: error?.message };
}

export async function getMyPayoutAccount(workerId: string) {
  const { data, error } = await supabase
    .from('payout_accounts')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle();

  return { data: data as PayoutAccount | null, error: error?.message };
}

export async function getMyNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data: (data ?? []) as Notification[], error: error?.message };
}

export async function getTimesheetForAssignment(assignmentId: string) {
  const { data, error } = await supabase
    .from('timesheets')
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle();

  return { data: data as Timesheet | null, error: error?.message };
}

/** @deprecated Direct assignment status writes are locked. Use checkInAssignment / checkOutAssignment RPCs. */
export async function updateAssignmentStatus(
  _assignmentId: string,
  _patch: Partial<Pick<ShiftAssignment, 'status' | 'check_in_at' | 'check_out_at' | 'cancellation_reason'>>,
) {
  return {
    data: null as ShiftAssignment | null,
    error:
      'Direct assignment updates are blocked. Use check_in_assignment / check_out_assignment RPCs.',
  };
}

/** @deprecated Client-chosen minutes are blocked. Use submitTimesheetRpc. */
export async function submitTimesheet(_params: {
  assignmentId: string;
  submittedMinutes: number;
  breakMinutes: number;
}) {
  return {
    data: null as Timesheet | null,
    error: 'Direct timesheet submission is blocked. Use submit_timesheet RPC.',
  };
}

export async function createCredential(params: {
  workerId: string;
  credentialType: string;
  storagePath: string;
  expiresAt?: string | null;
}) {
  const { data, error } = await supabase
    .from('credentials')
    .insert({
      worker_id: params.workerId,
      credential_type: params.credentialType,
      storage_path: params.storagePath,
      expires_at: params.expiresAt ?? null,
      status: 'pending',
    })
    .select('*')
    .single();

  return { data: data as Credential | null, error: error?.message };
}

export async function updateWorkerProfile(
  userId: string,
  patch: Partial<Pick<Tables<'worker_profiles'>, 'bio' | 'worker_role' | 'onboarding_status'>>,
) {
  const { data, error } = await supabase
    .from('worker_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();

  return { data, error: error?.message };
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Tables<'profiles'>, 'full_name' | 'phone'>>,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  return { data, error: error?.message };
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { error: error?.message };
}
