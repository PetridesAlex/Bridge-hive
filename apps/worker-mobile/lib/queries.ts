import type { Tables } from '@bridge-hive/supabase-types';
import { remainingOpenPositions } from '@bridge-hive/domain';

import { getWorkerShiftDetails } from '@/lib/rpcs';
import { supabase } from '@/lib/supabase';

export type Shift = Tables<'shifts'>;
export type ShiftAssignment = Tables<'shift_assignments'>;
export type Timesheet = Tables<'timesheets'>;
export type Credential = Tables<'credentials'>;
export type Payout = Tables<'payouts'>;
export type PayoutAccount = Tables<'payout_accounts'>;
export type Notification = Tables<'notifications'>;
export type ShiftRequirement = Tables<'shift_requirements'>;

const ACTIVE_ASSIGNMENT_STATUSES = [
  'accepted',
  'checked_in',
  'checked_out',
  'submitted',
  'approved',
] as const;

export type MarketplaceShift = Shift & {
  open_positions: number;
  filled_positions: number;
  location_name?: string | null;
  ward_name?: string | null;
  organization_name?: string | null;
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
  const { data: assignmentRows } = await supabase
    .from('shift_assignments')
    .select('shift_id, status')
    .in('shift_id', shiftIds)
    .in('status', [...ACTIVE_ASSIGNMENT_STATUSES]);

  const filledByShift = new Map<string, number>();
  for (const row of assignmentRows ?? []) {
    filledByShift.set(row.shift_id, (filledByShift.get(row.shift_id) ?? 0) + 1);
  }

  // Workers cannot read locations/wards via RLS. Use the security-definer
  // details RPC so marketplace cards can show location (same source as detail).
  const detailRows = await Promise.all(
    data.map(async (shift) => {
      const result = await getWorkerShiftDetails(shift.id);
      return [shift.id, result.data] as const;
    }),
  );
  const detailsById = new Map(detailRows);

  const enriched = data.map((shift) => {
    const filled = filledByShift.get(shift.id) ?? 0;
    const required = shift.required_positions ?? 1;
    const detail = detailsById.get(shift.id);
    return {
      ...shift,
      location_name: detail?.location_name?.trim() || null,
      ward_name: detail?.ward_name?.trim() || null,
      organization_name: detail?.organization_name?.trim() || null,
      filled_positions: filled,
      open_positions:
        typeof detail?.open_positions === 'number'
          ? detail.open_positions
          : remainingOpenPositions(required, filled),
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
  > | null;
};

export async function getMyAssignments(workerId: string) {
  // Keep nested shift columns compatible with deployed schemas that may not
  // yet have multi-position fields (e.g. required_positions).
  const { data, error } = await supabase
    .from('shift_assignments')
    .select(
      '*, shifts ( id, title, starts_at, ends_at, rate_minor, currency, required_role, status, break_minutes )',
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

/** @deprecated Direct assignment status writes are locked. Use submitTimesheetRpc. */
export async function updateAssignmentStatus(
  _assignmentId: string,
  _patch: Partial<Pick<ShiftAssignment, 'status' | 'check_in_at' | 'check_out_at' | 'cancellation_reason'>>,
) {
  return {
    data: null as ShiftAssignment | null,
    error:
      'Direct assignment updates are blocked. Use submit_timesheet RPC after the shift ends.',
  };
}

/** @deprecated Direct timesheet writes are locked. Use submitTimesheetRpc. */
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
