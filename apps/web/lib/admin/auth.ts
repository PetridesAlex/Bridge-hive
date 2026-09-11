import type { PlatformAdminRole } from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import {
  capabilitiesForPlatformRole,
  type PlatformCapabilities,
} from '@/lib/admin/capabilities';
import { createClient } from '@/lib/supabase/server';

export type { PlatformCapabilities };
export { capabilitiesForPlatformRole, rpcErrorMessage } from '@/lib/admin/capabilities';

export type Profile = Tables<'profiles'>;

export type PlatformAdminContext = {
  user: User;
  profile: Profile | null;
  adminRole: PlatformAdminRole;
  capabilities: PlatformCapabilities;
};

export async function getPlatformAdminRole(
  userId: string,
): Promise<PlatformAdminRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_admin_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  return (data?.role as PlatformAdminRole | undefined) ?? null;
}

export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminRole = await getPlatformAdminRole(user.id);
  if (!adminRole) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile,
    adminRole,
    capabilities: capabilitiesForPlatformRole(adminRole),
  };
}

export async function requirePlatformAdmin(
  requiredRole?: PlatformAdminRole,
): Promise<PlatformAdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  const adminRole = await getPlatformAdminRole(user.id);
  if (!adminRole) {
    redirect('/dashboard');
  }

  if (requiredRole) {
    const allowed =
      adminRole === requiredRole || adminRole === 'platform_super_admin';
    if (!allowed) {
      redirect('/admin');
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile,
    adminRole,
    capabilities: capabilitiesForPlatformRole(adminRole),
  };
}
