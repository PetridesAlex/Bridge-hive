'use server';

import {
  approveReviewedCredentialsSchema,
  markCredentialsUnderReviewSchema,
  reactivateWorkerAccountSchema,
  reviewCredentialSchema,
  reviewPayoutAccountSchema,
  setWorkerVerificationSchema,
  submitCredentialForReviewSchema,
  suspendWorkerAccountSchema,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  getPlatformAdminContext,
  rpcErrorMessage,
} from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

export type AdminActionResult = {
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

function revalidateWorkerApplication(workerId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${workerId}`);
  revalidatePath('/admin/workers');
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath('/admin/credentials');
  revalidatePath('/admin/payouts');
  revalidatePath('/admin/audit');
}

export async function signInPlatformAdminAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? 'Sign in failed.' };
  }

  const { data: adminRole } = await supabase
    .from('platform_admin_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!adminRole) {
    await supabase.auth.signOut();
    return {
      error: 'This account is not authorized for platform administration.',
    };
  }

  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function suspendWorkerAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canSuspendAccounts) {
    return { error: 'You do not have permission to suspend accounts.' };
  }

  const parsed = suspendWorkerAccountSchema.safeParse({
    workerId: String(formData.get('workerId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('suspend_worker_account', {
    p_worker_id: parsed.data.workerId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateWorkerApplication(parsed.data.workerId);
  return { success: true };
}

export async function reactivateWorkerAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canSuspendAccounts) {
    return { error: 'You do not have permission to reactivate accounts.' };
  }

  const parsed = reactivateWorkerAccountSchema.safeParse({
    workerId: String(formData.get('workerId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('reactivate_worker_account', {
    p_worker_id: parsed.data.workerId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateWorkerApplication(parsed.data.workerId);
  return { success: true };
}

export async function setWorkerVerificationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canVerifyWorkers) {
    return { error: 'You do not have permission to verify workers.' };
  }

  const parsed = setWorkerVerificationSchema.safeParse({
    workerId: String(formData.get('workerId') ?? ''),
    status: String(formData.get('status') ?? ''),
    reason: String(formData.get('reason') ?? '') || undefined,
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_worker_verification', {
    p_worker_id: parsed.data.workerId,
    p_status: parsed.data.status,
    ...(parsed.data.reason ? { p_reason: parsed.data.reason } : {}),
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateWorkerApplication(parsed.data.workerId);
  return { success: true };
}

export async function submitCredentialReviewAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canReviewCredentials) {
    return { error: 'You do not have permission to review credentials.' };
  }

  const parsed = submitCredentialForReviewSchema.safeParse({
    credentialId: String(formData.get('credentialId') ?? ''),
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_credential_for_review', {
    p_credential_id: parsed.data.credentialId,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidatePath('/admin/credentials');
  revalidatePath(`/admin/credentials/${parsed.data.credentialId}`);
  revalidatePath('/admin/applications');
  revalidatePath('/admin');
  revalidatePath('/admin/audit');
  return { success: true };
}

export async function reviewCredentialAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canReviewCredentials) {
    return { error: 'You do not have permission to review credentials.' };
  }

  const parsed = reviewCredentialSchema.safeParse({
    credentialId: String(formData.get('credentialId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    rejectionReason: String(formData.get('reason') ?? '') || undefined,
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  if (parsed.data.decision === 'reject' && !parsed.data.rejectionReason) {
    return { error: 'A rejection reason is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('verify_credential', {
    p_credential_id: parsed.data.credentialId,
    p_decision: parsed.data.decision,
    ...(parsed.data.rejectionReason
      ? { p_rejection_reason: parsed.data.rejectionReason }
      : {}),
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidatePath('/admin/credentials');
  revalidatePath(`/admin/credentials/${parsed.data.credentialId}`);
  revalidatePath('/admin/applications');
  revalidatePath('/admin');
  revalidatePath('/admin/audit');
  return { success: true };
}

export async function approveReviewedCredentialsAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canReviewCredentials) {
    return { error: 'You do not have permission to review credentials.' };
  }

  const idsRaw = String(formData.get('credentialIds') ?? '');
  const credentialIds = idsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const parsed = approveReviewedCredentialsSchema.safeParse({
    workerId: String(formData.get('workerId') ?? ''),
    credentialIds,
    confirmReviewed: formData.get('confirmReviewed') === 'true' ? true : false,
    expectedLastActivity:
      String(formData.get('expectedLastActivity') ?? '') || undefined,
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_reviewed_worker_credentials', {
    p_worker_id: parsed.data.workerId,
    p_credential_ids: parsed.data.credentialIds,
    p_confirm_reviewed: parsed.data.confirmReviewed,
    ...(parsed.data.expectedLastActivity
      ? { p_expected_last_activity: parsed.data.expectedLastActivity }
      : {}),
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateWorkerApplication(parsed.data.workerId);
  return { success: true };
}

export async function markCredentialsUnderReviewAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canReviewCredentials) {
    return { error: 'You do not have permission to review credentials.' };
  }

  const idsRaw = String(formData.get('credentialIds') ?? '');
  const credentialIds = idsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const parsed = markCredentialsUnderReviewSchema.safeParse({
    workerId: String(formData.get('workerId') ?? ''),
    credentialIds,
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('mark_credentials_under_review', {
    p_worker_id: parsed.data.workerId,
    p_credential_ids: parsed.data.credentialIds,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateWorkerApplication(parsed.data.workerId);
  return { success: true };
}

export async function reviewPayoutAccountAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canApprovePayoutAccounts) {
    return { error: 'You do not have permission to approve payout accounts.' };
  }

  const parsed = reviewPayoutAccountSchema.safeParse({
    payoutAccountId: String(formData.get('payoutAccountId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('verify_payout_account', {
    p_payout_account_id: parsed.data.payoutAccountId,
    p_decision: parsed.data.decision,
    p_reason_code: parsed.data.reason,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const workerId =
    data && typeof data === 'object' && 'worker_id' in data
      ? String((data as { worker_id: string }).worker_id)
      : null;

  revalidatePath('/admin');
  revalidatePath('/admin/workers');
  revalidatePath('/admin/applications');
  revalidatePath('/admin/payouts');
  revalidatePath('/admin/finance');
  revalidatePath('/admin/audit');
  if (workerId) {
    revalidatePath(`/admin/workers/${workerId}`);
    revalidatePath(`/admin/applications/${workerId}`);
  }
  return { success: true };
}

export async function getCredentialDocumentUrl(
  credentialId: string,
): Promise<{ url?: string; error?: string }> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canViewCredentialDocuments) {
    return { error: 'You do not have permission to view credential documents.' };
  }

  const supabase = await createClient();

  const { data: cred, error: credError } = await supabase
    .from('credentials')
    .select('id, storage_path, storage_paths')
    .eq('id', credentialId)
    .maybeSingle();

  if (credError || !cred) {
    return { error: 'Credential document not found.' };
  }

  const paths = Array.isArray(cred.storage_paths)
    ? (cred.storage_paths as string[])
    : [];
  const storagePath =
    cred.storage_path ??
    (typeof paths[0] === 'string' ? paths[0] : null);

  if (!storagePath) {
    return { error: 'Credential document not found.' };
  }

  // 2. Create audit event before generating URL
  const { error: auditError } = await supabase.rpc(
    'audit_credential_document_view',
    { p_credential_id: cred.id },
  );

  if (auditError) {
    console.error('Audit logging failed for credential document view:', auditError);
    return { error: 'Failed to log document access.' };
  }

  // 3. Generate signed URL (60 second expiry)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('credentials')
    .createSignedUrl(storagePath, 60);

  if (urlError || !urlData?.signedUrl) {
    return { error: 'Failed to generate document URL.' };
  }

  return { url: urlData.signedUrl };
}

export async function getPayoutProofDocumentUrl(
  payoutAccountId: string,
): Promise<{ url?: string; error?: string }> {
  const ctx = await getPlatformAdminContext();
  if (!ctx?.capabilities.canViewPayoutProof) {
    return { error: 'You do not have permission to view payout proof documents.' };
  }

  const supabase = await createClient();

  const { data: account, error: accountError } = await supabase
    .from('payout_accounts')
    .select('id, proof_storage_path')
    .eq('id', payoutAccountId)
    .maybeSingle();

  if (accountError || !account?.proof_storage_path) {
    return { error: 'Payout proof document not found.' };
  }

  const { error: auditError } = await supabase.rpc(
    'audit_payout_proof_document_view',
    { p_payout_account_id: account.id },
  );

  if (auditError) {
    return { error: 'Failed to log document access.' };
  }

  const { data: urlData, error: urlError } = await supabase.storage
    .from('payout-proofs')
    .createSignedUrl(account.proof_storage_path, 60);

  if (urlError || !urlData?.signedUrl) {
    return { error: 'Failed to generate document URL.' };
  }

  return { url: urlData.signedUrl };
}
