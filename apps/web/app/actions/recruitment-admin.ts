'use server';

import { revalidatePath } from 'next/cache';

import { requirePlatformAdmin } from '@/lib/admin/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

export async function setRecruitmentPlatformStatusAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canReviewRecruitment) {
    throw new Error('Not authorized');
  }
  const candidateId = String(formData.get('candidateId') ?? '');
  const status = String(formData.get('status') ?? '');
  const reviewNote = String(formData.get('reviewNote') ?? '');

  const supabase = asUntypedDb(await createClient());
  const { error } = await supabase.rpc('set_recruitment_candidate_platform_status', {
    p_candidate_id: candidateId,
    p_status: status,
    p_review_note: reviewNote || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/recruitment');
  revalidatePath(`/admin/recruitment/${candidateId}`);
}

export async function setOrganizationRecruitmentEnabledAction(formData: FormData) {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageRecruitmentAccess) {
    throw new Error('Not authorized');
  }
  const organizationId = String(formData.get('organizationId') ?? '');
  const enabled = formData.get('enabled') === 'true';

  const supabase = asUntypedDb(await createClient());
  const { error } = await supabase.rpc('set_organization_recruitment_enabled', {
    p_organization_id: organizationId,
    p_enabled: enabled,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath('/admin/recruitment');
}
