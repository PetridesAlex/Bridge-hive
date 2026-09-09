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

export async function getPublishedShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'published')
    .order('starts_at', { ascending: true });

  return { data: (data ?? []) as Shift[], error: error?.message };
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

export async function getMyAssignments(workerId: string) {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('*')
    .eq('worker_id', workerId)
    .order('accepted_at', { ascending: false });

  return { data: (data ?? []) as ShiftAssignment[], error: error?.message };
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

export async function updateAssignmentStatus(
  assignmentId: string,
  patch: Partial<Pick<ShiftAssignment, 'status' | 'check_in_at' | 'check_out_at' | 'cancellation_reason'>>,
) {
  const { data, error } = await supabase
    .from('shift_assignments')
    .update(patch)
    .eq('id', assignmentId)
    .select('*')
    .single();

  return { data: data as ShiftAssignment | null, error: error?.message };
}

export async function submitTimesheet(params: {
  assignmentId: string;
  submittedMinutes: number;
  breakMinutes: number;
}) {
  const existing = await getTimesheetForAssignment(params.assignmentId);
  if (existing.error) return { data: null, error: existing.error };

  if (existing.data) {
    const { data, error } = await supabase
      .from('timesheets')
      .update({
        submitted_minutes: params.submittedMinutes,
        break_minutes: params.breakMinutes,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id)
      .select('*')
      .single();
    return { data: data as Timesheet | null, error: error?.message };
  }

  const { data, error } = await supabase
    .from('timesheets')
    .insert({
      assignment_id: params.assignmentId,
      submitted_minutes: params.submittedMinutes,
      break_minutes: params.breakMinutes,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  return { data: data as Timesheet | null, error: error?.message };
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
