export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return { url, anonKey };
}

/** Server-only. Never import from client components. */
export function getSupabaseServiceRoleEnv() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  if (serviceRoleKey.startsWith('eyJ') === false && serviceRoleKey.length < 20) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY appears invalid');
  }

  return { url, serviceRoleKey };
}

/**
 * Public web origin for Auth redirectTo / activation emails.
 * Prefer explicit APP_PUBLIC_URL. On Vercel, fall back to https://$VERCEL_URL
 * so preview deploys never silently email localhost:3000.
 */
export function getAppPublicUrl(): string {
  const vercelHost = process.env.VERCEL_URL?.replace(/^https?:\/\//, '').trim();
  const raw =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (vercelHost ? `https://${vercelHost}` : '') ||
    'http://localhost:3000';
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    throw new Error('APP_PUBLIC_URL is not a valid URL');
  }
}

export function allowLocalInviteLinkCopy(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ALLOW_LOCAL_INVITE_LINK_COPY === 'true'
  );
}
