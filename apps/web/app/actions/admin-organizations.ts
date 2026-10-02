'use server';

import {
  approveOrganizationSchema,
  createOrganizationInvitationSchema,
  createOrganizationWithAdminInviteSchema,
  friendlyInvitationError,
  normalizeAdminEmail,
  reactivateOrganizationSchema,
  rejectOrganizationSchema,
  revokeOrganizationInvitationSchema,
  slugifyOrganizationName,
  suspendOrganizationSchema,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';

import { requirePlatformAdmin, rpcErrorMessage } from '@/lib/admin/auth';
import {
  diagnoseOrganizationActivationRedirect,
  inviteOrRecoverOrganizationAdmin,
} from '@/lib/supabase/admin';
import { allowLocalInviteLinkCopy } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type AdminActionResult = {
  error?: string;
  success?: boolean;
  data?: unknown;
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

function revalidateOrganizationAdmin(organizationId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/organizations');
  if (organizationId) {
    revalidatePath(`/admin/organizations/${organizationId}`);
  }
}

type CreateRpcResult = {
  organization_id: string;
  invitation_id: string;
  raw_token: string;
  expires_at?: string;
  slug?: string;
};

async function sendActivationAndMark(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    invitationId: string;
    organizationId: string;
    email: string;
    fullName?: string | null;
  },
): Promise<{
  deliveryStatus: 'sent' | 'failed';
  error?: string;
  redirectTo?: string;
  mode?: 'invite' | 'recovery';
}> {
  const send = await inviteOrRecoverOrganizationAdmin({
    email: params.email,
    invitationId: params.invitationId,
    organizationId: params.organizationId,
    fullName: params.fullName,
  });

  if (send.ok) {
    const { error } = await supabase.rpc('mark_organization_invitation_delivery', {
      p_invitation_id: params.invitationId,
      p_delivery_status: 'sent',
      p_error_category: null,
    });
    if (error) {
      return {
        deliveryStatus: 'failed',
        error: 'Activation email may have been sent but status could not be recorded.',
        redirectTo: send.redirectTo,
        mode: send.mode,
      };
    }
    return {
      deliveryStatus: 'sent',
      redirectTo: send.redirectTo,
      mode: send.mode,
    };
  }

  await supabase.rpc('mark_organization_invitation_delivery', {
    p_invitation_id: params.invitationId,
    p_delivery_status: 'failed',
    p_error_category: send.category,
  });

  return {
    deliveryStatus: 'failed',
    error:
      send.message ||
      'Organization was created, but the activation email could not be sent. Use Retry on the organization page.',
    redirectTo: send.redirectTo,
  };
}

/** Non-secret Preview diagnostic: what redirectTo invite emails will use. */
export async function diagnoseOrganizationActivationRedirectAction(): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  try {
    const diagnosis = await diagnoseOrganizationActivationRedirect();
    if (diagnosis.isLoopback) {
      return {
        error:
          'Activation redirectTo is localhost. Set Preview APP_PUBLIC_URL to the branch host and redeploy before sending invites.',
        data: diagnosis,
      };
    }
    return { success: true, data: diagnosis };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Could not resolve activation redirect origin.',
    };
  }
}

export async function createOrganizationWithAdminInviteAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const displayName = String(formData.get('displayName') ?? '');
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const parsed = createOrganizationWithAdminInviteSchema.safeParse({
    legalName: String(formData.get('legalName') ?? ''),
    displayName,
    slug: slugRaw || slugifyOrganizationName(displayName),
    organizationType: String(formData.get('organizationType') ?? ''),
    timezone: String(formData.get('timezone') ?? 'Europe/Nicosia'),
    billingEmail: String(formData.get('billingEmail') ?? '') || undefined,
    adminEmail: normalizeAdminEmail(String(formData.get('adminEmail') ?? '')),
    adminFullName: String(formData.get('adminFullName') ?? '') || undefined,
    countryCode: String(formData.get('countryCode') ?? 'CY') || 'CY',
    requestKey: String(formData.get('requestKey') ?? '') || undefined,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  if (!parsed.data.slug) {
    return { error: 'Organization slug is required.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_organization_with_admin_invite', {
    p_legal_name: parsed.data.legalName,
    p_display_name: parsed.data.displayName,
    p_slug: parsed.data.slug,
    p_organization_type: parsed.data.organizationType,
    p_timezone: parsed.data.timezone,
    p_admin_email: parsed.data.adminEmail,
    p_country_code: parsed.data.countryCode,
    ...(parsed.data.billingEmail ? { p_billing_email: parsed.data.billingEmail } : {}),
    ...(parsed.data.adminFullName
      ? { p_primary_contact_name: parsed.data.adminFullName }
      : {}),
    ...(parsed.data.adminEmail
      ? { p_primary_contact_email: parsed.data.adminEmail }
      : {}),
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const result = data as CreateRpcResult | null;
  if (!result?.organization_id || !result.invitation_id) {
    return { error: 'Failed to create organization.' };
  }

  const delivery = await sendActivationAndMark(supabase, {
    invitationId: result.invitation_id,
    organizationId: result.organization_id,
    email: parsed.data.adminEmail,
    fullName: parsed.data.adminFullName,
  });

  revalidateOrganizationAdmin(result.organization_id);

  const safeData: Record<string, unknown> = {
    organization_id: result.organization_id,
    invitation_id: result.invitation_id,
    slug: result.slug,
    delivery_status: delivery.deliveryStatus,
    expires_at: result.expires_at,
    ...(delivery.redirectTo ? { activation_redirect_to: delivery.redirectTo } : {}),
    ...(delivery.mode ? { activation_email_mode: delivery.mode } : {}),
  };

  if (allowLocalInviteLinkCopy() && result.raw_token) {
    safeData.raw_token = result.raw_token;
    safeData.local_dev_link_only = true;
  }

  return {
    success: true,
    data: safeData,
    ...(delivery.deliveryStatus === 'failed' ? { error: delivery.error } : {}),
  };
}

export async function resendOrganizationActivationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const invitationId = String(formData.get('invitationId') ?? '');
  const organizationId = String(formData.get('organizationId') ?? '');
  if (!invitationId) {
    return { error: 'Invitation is required.' };
  }

  const supabase = await createClient();
  const { data: allowed, error: allowError } = await supabase.rpc(
    'assert_invitation_resend_allowed',
    { p_invitation_id: invitationId },
  );

  if (allowError) {
    return { error: friendlyInvitationError(allowError.message) };
  }

  const inv = allowed as {
    id: string;
    organization_id: string;
    email_normalized: string;
  } | null;

  if (!inv) {
    return { error: 'Invitation not found.' };
  }

  const delivery = await sendActivationAndMark(supabase, {
    invitationId: inv.id,
    organizationId: inv.organization_id,
    email: inv.email_normalized,
  });

  revalidateOrganizationAdmin(organizationId || inv.organization_id);

  if (delivery.deliveryStatus === 'failed') {
    return {
      error: delivery.error ?? 'Activation email could not be sent.',
      data: {
        ...(delivery.redirectTo ? { activation_redirect_to: delivery.redirectTo } : {}),
      },
    };
  }

  return {
    success: true,
    data: {
      delivery_status: 'sent',
      invitation_id: inv.id,
      ...(delivery.redirectTo ? { activation_redirect_to: delivery.redirectTo } : {}),
      ...(delivery.mode ? { activation_email_mode: delivery.mode } : {}),
    },
  };
}

export async function replaceOrganizationAdminInviteAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const organizationId = String(formData.get('organizationId') ?? '');
  const previousInvitationId = String(formData.get('invitationId') ?? '');
  const email = normalizeAdminEmail(String(formData.get('email') ?? ''));
  const fullName = String(formData.get('adminFullName') ?? '') || undefined;

  if (!organizationId || !email) {
    return { error: 'Organization and administrator email are required.' };
  }

  const supabase = await createClient();

  if (previousInvitationId) {
    await supabase.rpc('revoke_organization_invitation', {
      p_invitation_id: previousInvitationId,
    });
  }

  const { data, error } = await supabase.rpc('create_organization_invitation', {
    p_organization_id: organizationId,
    p_email: email,
    p_role: 'org_admin',
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const created = data as { invitation_id: string; raw_token?: string } | null;
  if (!created?.invitation_id) {
    return { error: 'Failed to create a replacement invitation.' };
  }

  const delivery = await sendActivationAndMark(supabase, {
    invitationId: created.invitation_id,
    organizationId,
    email,
    fullName,
  });

  revalidateOrganizationAdmin(organizationId);

  const safeData: Record<string, unknown> = {
    invitation_id: created.invitation_id,
    delivery_status: delivery.deliveryStatus,
    ...(delivery.redirectTo ? { activation_redirect_to: delivery.redirectTo } : {}),
    ...(delivery.mode ? { activation_email_mode: delivery.mode } : {}),
  };
  if (allowLocalInviteLinkCopy() && created.raw_token) {
    safeData.raw_token = created.raw_token;
    safeData.local_dev_link_only = true;
  }

  return {
    success: delivery.deliveryStatus === 'sent',
    data: safeData,
    ...(delivery.deliveryStatus === 'failed'
      ? { error: delivery.error }
      : {}),
  };
}

export async function createOrganizationInvitationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = createOrganizationInvitationSchema.safeParse({
    organizationId: String(formData.get('organizationId') ?? ''),
    email: normalizeAdminEmail(String(formData.get('email') ?? '')),
    role: String(formData.get('role') ?? 'org_admin'),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_organization_invitation', {
    p_organization_id: parsed.data.organizationId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const result = data as { invitation_id: string; raw_token?: string } | null;
  if (!result?.invitation_id) {
    return { error: 'Failed to create invitation.' };
  }

  const delivery = await sendActivationAndMark(supabase, {
    invitationId: result.invitation_id,
    organizationId: parsed.data.organizationId,
    email: parsed.data.email,
  });

  revalidateOrganizationAdmin(parsed.data.organizationId);

  const safeData: Record<string, unknown> = {
    invitation_id: result.invitation_id,
    delivery_status: delivery.deliveryStatus,
    ...(delivery.redirectTo ? { activation_redirect_to: delivery.redirectTo } : {}),
    ...(delivery.mode ? { activation_email_mode: delivery.mode } : {}),
  };
  if (allowLocalInviteLinkCopy() && result.raw_token) {
    safeData.raw_token = result.raw_token;
    safeData.local_dev_link_only = true;
  }

  return {
    success: true,
    data: safeData,
    ...(delivery.deliveryStatus === 'failed' ? { error: delivery.error } : {}),
  };
}

export async function revokeOrganizationInvitationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = revokeOrganizationInvitationSchema.safeParse({
    invitationId: String(formData.get('invitationId') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_organization_invitation', {
    p_invitation_id: parsed.data.invitationId,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateOrganizationAdmin();
  return { success: true };
}

export async function approveOrganizationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = approveOrganizationSchema.safeParse({
    organizationId: String(formData.get('organizationId') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_organization', {
    p_organization_id: parsed.data.organizationId,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateOrganizationAdmin(parsed.data.organizationId);
  return { success: true };
}

export async function rejectOrganizationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = rejectOrganizationSchema.safeParse({
    organizationId: String(formData.get('organizationId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('reject_organization', {
    p_organization_id: parsed.data.organizationId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateOrganizationAdmin(parsed.data.organizationId);
  return { success: true };
}

export async function suspendOrganizationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = suspendOrganizationSchema.safeParse({
    organizationId: String(formData.get('organizationId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('suspend_organization', {
    p_organization_id: parsed.data.organizationId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateOrganizationAdmin(parsed.data.organizationId);
  return { success: true };
}

export async function reactivateOrganizationAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = reactivateOrganizationSchema.safeParse({
    organizationId: String(formData.get('organizationId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('reactivate_organization', {
    p_organization_id: parsed.data.organizationId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidateOrganizationAdmin(parsed.data.organizationId);
  return { success: true };
}
