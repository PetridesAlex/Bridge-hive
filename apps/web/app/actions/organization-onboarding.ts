'use server';

import {
  acceptOrganizationInvitationSchema,
  formatOrgProfileIncompleteMessage,
  missingOrgProfileRequiredLabels,
  submitOrganizationForReviewSchema,
  updateOrganizationProfileSchema,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { rpcErrorMessage } from '@/lib/admin/auth';
import { requireAuthBundle } from '@/lib/auth';
import {
  parseOrganizationProfileFormData,
  profileRpcArgs,
} from '@/lib/organization-profile';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
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

export async function acceptOrganizationInvitationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuthBundle();

  const parsed = acceptOrganizationInvitationSchema.safeParse({
    rawToken: String(formData.get('rawToken') ?? ''),
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_organization_invitation', {
    p_raw_token: parsed.data.rawToken,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  const result = data as { slug: string } | null;
  if (!result?.slug) {
    return { error: 'Failed to accept invitation.' };
  }

  revalidatePath('/dashboard');
  redirect(`/org/${result.slug}/dashboard`);
}

export async function updateOrganizationProfileAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuthBundle();

  const payload = parseOrganizationProfileFormData(formData);
  const parsed = updateOrganizationProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'update_organization_profile',
    profileRpcArgs(parsed.data),
  );
  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidatePath('/org');
  return { success: true };
}

export async function submitOrganizationForReviewAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuthBundle();

  const payload = parseOrganizationProfileFormData(formData);
  const parsed = submitOrganizationForReviewSchema.safeParse(payload);

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const missing = missingOrgProfileRequiredLabels({
    legalName: parsed.data.legalName,
    displayName: parsed.data.displayName,
    primaryContactName: parsed.data.primaryContactName,
    primaryContactEmail: parsed.data.primaryContactEmail,
  });
  if (missing.length > 0) {
    return { error: formatOrgProfileIncompleteMessage(missing) };
  }

  const supabase = await createClient();

  // Save current form values first so unsaved edits are never omitted.
  const { error: updateError } = await supabase.rpc(
    'update_organization_profile',
    profileRpcArgs(parsed.data),
  );
  if (updateError) {
    return { error: rpcErrorMessage(updateError) };
  }

  const { error: submitError } = await supabase.rpc(
    'submit_organization_for_review',
    {
      p_organization_id: parsed.data.organizationId,
    },
  );

  if (submitError) {
    return { error: rpcErrorMessage(submitError) };
  }

  revalidatePath('/org');
  revalidatePath('/admin');
  revalidatePath('/admin/organizations');
  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  return { success: true };
}
