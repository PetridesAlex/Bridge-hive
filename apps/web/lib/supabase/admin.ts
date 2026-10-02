import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bridge-hive/supabase-types';

import {
  buildActivationRedirectTo,
  describeActivationRedirectTo,
  isAllowlistedRedirectOrigin,
  isLoopbackAppOrigin,
  mapAuthInviteErrorCategory,
  normalizeAdminEmail,
  type DeliveryErrorCategory,
} from '@bridge-hive/domain';
import { headers } from 'next/headers';

import {
  getSupabaseEnv,
  getSupabaseServiceRoleEnv,
  resolveAppPublicUrl,
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
  | {
      ok: true;
      mode: 'invite' | 'recovery';
      /** Non-secret Auth redirectTo that must match Supabase Redirect URLs. */
      redirectTo: string;
    }
  | {
      ok: false;
      category: DeliveryErrorCategory;
      message: string;
      redirectTo?: string;
    };

/**
 * Safe diagnostic for Preview invite redirect configuration.
 * Never includes emails, tokens, or keys.
 */
export async function diagnoseOrganizationActivationRedirect(): Promise<{
  redirectTo: string;
  origin: string;
  pathname: string;
  search: string;
  isLoopback: boolean;
  source: string;
  onVercel: boolean;
}> {
  const h = await headers();
  const resolved = resolveAppPublicUrl({
    requestHost: h.get('x-forwarded-host') ?? h.get('host'),
    requestProto: h.get('x-forwarded-proto'),
  });
  const redirectTo = buildActivationRedirectTo(resolved.origin);
  const described = describeActivationRedirectTo(redirectTo);
  return {
    ...described,
    source: resolved.source,
    onVercel: process.env.VERCEL === '1' || process.env.VERCEL === 'true',
  };
}

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

  let appPublicUrl: string;
  let redirectTo: string;
  try {
    const h = await headers();
    const resolved = resolveAppPublicUrl({
      requestHost: h.get('x-forwarded-host') ?? h.get('host'),
      requestProto: h.get('x-forwarded-proto'),
    });
    appPublicUrl = resolved.origin;
    redirectTo = buildActivationRedirectTo(appPublicUrl);
  } catch (err) {
    return {
      ok: false,
      category: 'unknown',
      message:
        err instanceof Error
          ? err.message
          : 'Activation redirect origin is not configured for this host.',
    };
  }

  const redirectOrigin = new URL(redirectTo).origin;

  if (isLoopbackAppOrigin(redirectOrigin) && (process.env.VERCEL === '1' || process.env.VERCEL === 'true')) {
    return {
      ok: false,
      category: 'unknown',
      message:
        'Refusing to send activation email: redirectTo resolved to localhost on Vercel. Set APP_PUBLIC_URL to the Preview branch origin and redeploy.',
      redirectTo,
    };
  }

  if (!isAllowlistedRedirectOrigin(redirectOrigin, appPublicUrl)) {
    return {
      ok: false,
      category: 'unknown',
      message: 'Activation redirect is not allow-listed.',
      redirectTo,
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
    return { ok: true, mode: 'invite', redirectTo };
  }

  const inviteMsg = inviteError.message ?? '';
  const alreadyRegistered = /already|registered|exists|duplicate/i.test(inviteMsg);

  if (!alreadyRegistered) {
    return {
      ok: false,
      category: mapAuthInviteErrorCategory(inviteMsg),
      message: 'Unable to send activation email.',
      redirectTo,
    };
  }

  // Existing Auth account: preserve UUID, attach invitation context, one recovery email.
  const userId = await findAuthUserIdByEmail(admin, email);
  if (!userId) {
    return {
      ok: false,
      category: 'auth_error',
      message: 'Unable to send activation email.',
      redirectTo,
    };
  }

  const { data: existing, error: getError } =
    await admin.auth.admin.getUserById(userId);
  if (getError || !existing?.user) {
    return {
      ok: false,
      category: 'auth_error',
      message: 'Unable to send activation email.',
      redirectTo,
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
      redirectTo,
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
      redirectTo,
    };
  }

  return { ok: true, mode: 'recovery', redirectTo };
}
