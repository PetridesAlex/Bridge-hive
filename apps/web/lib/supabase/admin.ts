import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bridge-hive/supabase-types';

import {
  buildActivationRedirectTo,
  isAllowlistedRedirectOrigin,
  mapAuthInviteErrorCategory,
  normalizeAdminEmail,
  type DeliveryErrorCategory,
} from '@bridge-hive/domain';

import {
  getAppPublicUrl,
  getSupabaseEnv,
  getSupabaseServiceRoleEnv,
} from '@/lib/supabase/env';

export function createServiceRoleClient() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type InviteOrRecoverResult =
  | { ok: true; mode: 'invite' | 'recovery' }
  | { ok: false; category: DeliveryErrorCategory; message: string };

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;
    const found = data.users.find(
      (u) => (u.email ?? '').toLowerCase() === email,
    );
    if (found) return found.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}

/**
 * Send one Auth activation email through hosted Supabase (Resend SMTP).
 * - New email → inviteUserByEmail (redirectTo = /auth/confirm?next=activation;
 *   Invite template must append token_hash + type=invite)
 * - Existing Auth user → metadata merge + resetPasswordForEmail once
 *   (Reset Password template must append token_hash + type=recovery)
 * Never returns links or tokens.
 */
export async function inviteOrRecoverOrganizationAdmin(params: {
  email: string;
  invitationId: string;
  organizationId: string;
  fullName?: string | null;
}): Promise<InviteOrRecoverResult> {
  const email = normalizeAdminEmail(params.email);
  const appPublicUrl = getAppPublicUrl();
  const redirectTo = buildActivationRedirectTo(appPublicUrl);
  const redirectOrigin = new URL(redirectTo).origin;

  if (!isAllowlistedRedirectOrigin(redirectOrigin, appPublicUrl)) {
    return {
      ok: false,
      category: 'unknown',
      message: 'Activation redirect is not allow-listed.',
    };
  }

  const admin = createServiceRoleClient();
  const meta = {
    invitation_id: params.invitationId,
    organization_id: params.organizationId,
    ...(params.fullName ? { full_name: params.fullName } : {}),
  };

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: meta,
  });

  if (!inviteError) {
    return { ok: true, mode: 'invite' };
  }

  const inviteMsg = inviteError.message ?? '';
  const alreadyRegistered = /already|registered|exists|duplicate/i.test(inviteMsg);

  if (!alreadyRegistered) {
    return {
      ok: false,
      category: mapAuthInviteErrorCategory(inviteMsg),
      message: 'Unable to send activation email.',
    };
  }

  // Existing Auth account: preserve UUID, attach invitation context, one recovery email.
  const userId = await findAuthUserIdByEmail(admin, email);
  if (!userId) {
    return {
      ok: false,
      category: 'auth_error',
      message: 'Unable to send activation email.',
    };
  }

  const { data: existing, error: getError } =
    await admin.auth.admin.getUserById(userId);
  if (getError || !existing?.user) {
    return {
      ok: false,
      category: 'auth_error',
      message: 'Unable to send activation email.',
    };
  }

  const mergedMetadata = {
    ...(existing.user.user_metadata ?? {}),
    ...meta,
  };

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: mergedMetadata,
  });
  if (updateError) {
    return {
      ok: false,
      category: mapAuthInviteErrorCategory(updateError.message),
      message: 'Unable to send activation email.',
    };
  }

  const { url, anonKey } = getSupabaseEnv();
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: recoverError } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (recoverError) {
    return {
      ok: false,
      category: mapAuthInviteErrorCategory(recoverError.message),
      message: 'Unable to send activation email.',
    };
  }

  return { ok: true, mode: 'recovery' };
}
