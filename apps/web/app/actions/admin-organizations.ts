'use server';

import {
  approveOrganizationSchema,
  createOrganizationInvitationSchema,
  createOrganizationWithAdminInviteSchema,
  reactivateOrganizationSchema,
  rejectOrganizationSchema,
  revokeOrganizationInvitationSchema,
  suspendOrganizationSchema,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin, rpcErrorMessage } from '@/lib/admin/auth';
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

export async function createOrganizationWithAdminInviteAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return { error: 'You do not have permission to manage organizations.' };
  }

  const parsed = createOrganizationWithAdminInviteSchema.safeParse({
    legalName: String(formData.get('legalName') ?? ''),
    displayName: String(formData.get('displayName') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    organizationType: String(formData.get('organizationType') ?? ''),
    timezone: String(formData.get('timezone') ?? 'Europe/Nicosia'),
    addressLine1: String(formData.get('addressLine1') ?? '') || undefined,
    addressLine2: String(formData.get('addressLine2') ?? '') || undefined,
    city: String(formData.get('city') ?? '') || undefined,
    postalCode: String(formData.get('postalCode') ?? '') || undefined,
    countryCode: String(formData.get('countryCode') ?? 'CY'),
    taxVat: String(formData.get('taxVat') ?? '') || undefined,
    billingEmail: String(formData.get('billingEmail') ?? '') || undefined,
    contactPhone: String(formData.get('contactPhone') ?? '') || undefined,
    adminEmail: String(formData.get('adminEmail') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
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
    ...(parsed.data.addressLine1 ? { p_address_line1: parsed.data.addressLine1 } : {}),
    ...(parsed.data.addressLine2 ? { p_address_line2: parsed.data.addressLine2 } : {}),
    ...(parsed.data.city ? { p_city: parsed.data.city } : {}),
    ...(parsed.data.postalCode ? { p_postal_code: parsed.data.postalCode } : {}),
    ...(parsed.data.taxVat ? { p_tax_vat_number: parsed.data.taxVat } : {}),
    ...(parsed.data.billingEmail ? { p_billing_email: parsed.data.billingEmail } : {}),
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const result = data as { organization_id: string; raw_token: string } | null;
  if (!result) {
    return { error: 'Failed to create organization.' };
  }

  revalidateOrganizationAdmin(result.organization_id);
  return { success: true, data: result };
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
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? ''),
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

  const result = data as { invitation_id: string; raw_token: string } | null;
  if (!result) {
    return { error: 'Failed to create invitation.' };
  }

  revalidateOrganizationAdmin(parsed.data.organizationId);
  return { success: true, data: result };
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
