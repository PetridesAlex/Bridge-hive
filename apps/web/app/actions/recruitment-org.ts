'use server';

import { revalidatePath } from 'next/cache';

import { requireOrgMembership } from '@/lib/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

export async function updateRecruitmentPipelineAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '');
  const candidateId = String(formData.get('candidateId') ?? '');
  const status = String(formData.get('status') ?? '');
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageRecruitmentPipeline) {
    throw new Error('Not authorized');
  }

  const supabase = asUntypedDb(await createClient());
  const { error } = await supabase.rpc('upsert_recruitment_org_pipeline', {
    p_organization_id: ctx.org.id,
    p_candidate_id: candidateId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/org/${slug}/recruitment`);
  revalidatePath(`/org/${slug}/recruitment/${candidateId}`);
}

export async function addRecruitmentNoteAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '');
  const candidateId = String(formData.get('candidateId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageRecruitmentPipeline) {
    throw new Error('Not authorized');
  }
  if (!body) throw new Error('Note required');

  const supabase = asUntypedDb(await createClient());
  const { error } = await supabase.rpc('add_recruitment_org_note', {
    p_organization_id: ctx.org.id,
    p_candidate_id: candidateId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/org/${slug}/recruitment/${candidateId}`);
}
