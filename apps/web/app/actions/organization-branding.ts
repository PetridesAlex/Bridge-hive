'use server';

import {
  normalizeOrganizationDisplayName,
  isOwnedOrganizationLogoPath,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';

import { rpcErrorMessage } from '@/lib/admin/auth';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type BrandingActionResult = {
  error?: string;
  success?: boolean;
  displayName?: string;
  logoPath?: string | null;
};

export async function updateOrganizationDisplayNameAction(params: {
  slug: string;
  displayName: string;
}): Promise<BrandingActionResult> {
  const ctx = await requireOrgMembership(params.slug);
  if (ctx.membership.role !== 'org_admin') {
    return { error: 'Only Organization Admins can change the display name.' };
  }

  const normalized = normalizeOrganizationDisplayName(params.displayName);
  if (!normalized.ok) {
    return { error: normalized.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_organization_display_name', {
    p_organization_id: ctx.org.id,
    p_display_name: normalized.value,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const row = data as { display_name?: string } | null;
  revalidatePath(`/org/${params.slug}`);
  revalidatePath('/dashboard');
  return {
    success: true,
    displayName: row?.display_name ?? normalized.value,
  };
}

export async function setOrganizationLogoPathAction(params: {
  slug: string;
  path: string | null;
}): Promise<BrandingActionResult> {
  const ctx = await requireOrgMembership(params.slug);
  if (ctx.membership.role !== 'org_admin') {
    return { error: 'Only Organization Admins can manage the organization logo.' };
  }

  if (
    params.path != null &&
    !isOwnedOrganizationLogoPath(ctx.org.id, params.path)
  ) {
    return { error: 'Invalid logo path.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_organization_logo_path', {
    p_organization_id: ctx.org.id,
    p_path: params.path as unknown as string,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidatePath(`/org/${params.slug}`);
  return {
    success: true,
    logoPath: (data as string | null) ?? null,
  };
}
