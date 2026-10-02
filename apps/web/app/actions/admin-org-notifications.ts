'use server';

import { revalidatePath } from 'next/cache';

import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Marks org_submitted notices as read for the signed-in platform admin.
 * Does not approve any organization.
 */
export async function markOrgSubmittedNotificationsReadAction(): Promise<void> {
  await requirePlatformAdmin('platform_super_admin');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('type', 'org_submitted')
    .is('read_at', null);

  revalidatePath('/admin');
}
