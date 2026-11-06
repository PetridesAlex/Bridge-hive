import type { Tables } from '@bridge-hive/supabase-types';

import { getWorkerShiftDetails } from '@/lib/rpcs';
import {
  AVAILABILITY_UNAVAILABLE,
  availabilityFromOpenPositions,
  parseRequiredPositions,
} from '@/lib/shift-availability';
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
  /** Authoritative open count from get_worker_shift_details; null when unknown. */
  open_positions: number | null;
  filled_positions: number | null;
  /** False when details RPC did not return capacity — never display as "0 available". */
  availability_known: boolean;
  availability_error: string | null;
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

  // Workers cannot read locations/wards or other workers' assignments via RLS.
  // Use security-definer get_worker_shift_details for location labels AND
  // authoritative open_positions (shift_open_positions). Never recount
  // shift_assignments under the worker JWT — that undercounts peers and
  // overstates remaining seats on multi-position shifts.
  const detailRows = await Promise.all(
    data.map(async (shift) => {
      const result = await getWorkerShiftDetails(shift.id);
      return [shift.id, result] as const;
    }),
  );
  const detailsById = new Map(detailRows);

  const enriched = data.map((shift) => {
    const required = parseRequiredPositions(shift.required_positions);
    const result = detailsById.get(shift.id);
    const detail = result?.data;
    const availability = detail?.availability_known
      ? availabilityFromOpenPositions(detail.open_positions, detail.required_positions)
      : availabilityFromOpenPositions(null, required, {
          error:
            detail?.availability_error ??
            result?.error ??
            AVAILABILITY_UNAVAILABLE,
        });

    return {
      ...shift,
      location_name: detail?.location_name?.trim() || null,
      ward_name: detail?.ward_name?.trim() || null,
      organization_name: detail?.organization_name?.trim() || null,
      required_positions: detail?.required_positions ?? required,
      filled_positions: availability.filled_positions,
      open_positions: availability.open_positions,
      availability_known: availability.availability_known,
      availability_error: availability.availability_error,
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

/** Nested shift summary on assignment lists (Work/Home). */
export type AssignmentShiftSummary = Pick<
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
> & {
  /** Optional display labels when enriched separately (not on shifts row). */
  location_name?: string | null;
  ward_name?: string | null;
  organization_name?: string | null;
};

/** Assignment row with optional nested shift fields for Work/Home lists. */
export type AssignmentWithShift = ShiftAssignment & {
  shifts: AssignmentShiftSummary | null;
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
