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

function originFromHost(hostHeader: string | null | undefined, protoHint?: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(',')[0]?.trim();
  if (!host || host.includes('://')) return null;
  // Only trust Vercel preview/production hosts from the request (not arbitrary Host).
  if (!/\.vercel\.app$/i.test(host)) return null;
  const proto = (protoHint ?? 'https').split(',')[0]?.trim() || 'https';
  const scheme = proto === 'http' ? 'http' : 'https';
  try {
    return new URL(`${scheme}://${host}`).origin;
  } catch {
    return null;
  }
}

export type AppPublicUrlResolution = {
  origin: string;
  /** Which input produced the origin (for safe admin diagnostics). */
  source:
    | 'APP_PUBLIC_URL'
    | 'NEXT_PUBLIC_APP_URL'
    | 'request_host'
    | 'VERCEL_BRANCH_URL'
    | 'VERCEL_URL'
    | 'localhost_fallback';
};

/**
 * Public web origin for Auth redirectTo / activation emails.
 * Prefer explicit APP_PUBLIC_URL. On Vercel Preview, prefer the request Host
 * (branch alias) and VERCEL_BRANCH_URL over the per-deployment VERCEL_URL.
 * Never silently use localhost when running on Vercel — that becomes Site URL
 * fallback in {{ .RedirectTo }} when the allowlist rejects the redirectTo.
 */
export function resolveAppPublicUrl(options?: {
  requestHost?: string | null;
  requestProto?: string | null;
}): AppPublicUrlResolution {
  const onVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const branchHost = process.env.VERCEL_BRANCH_URL?.replace(/^https?:\/\//, '').trim();
  const deployHost = process.env.VERCEL_URL?.replace(/^https?:\/\//, '').trim();
  const requestOrigin = originFromHost(options?.requestHost, options?.requestProto);

  const candidates: Array<{ raw: string; source: AppPublicUrlResolution['source'] }> = [];

  const appPublic = process.env.APP_PUBLIC_URL?.trim();
  if (appPublic) candidates.push({ raw: appPublic, source: 'APP_PUBLIC_URL' });

  const nextPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (nextPublic) candidates.push({ raw: nextPublic, source: 'NEXT_PUBLIC_APP_URL' });

  // Prefer the stable Git branch alias over the request Host / per-deployment URL
  // so allowlisted Redirect URLs stay byte-stable across Preview redeploys.
  if (branchHost) candidates.push({ raw: `https://${branchHost}`, source: 'VERCEL_BRANCH_URL' });
  if (requestOrigin) candidates.push({ raw: requestOrigin, source: 'request_host' });
  if (deployHost) candidates.push({ raw: `https://${deployHost}`, source: 'VERCEL_URL' });

  for (const candidate of candidates) {
    try {
      const origin = new URL(
        /^https?:\/\//i.test(candidate.raw) ? candidate.raw : `https://${candidate.raw}`,
      ).origin;
      const host = new URL(origin).hostname.toLowerCase();
      const isLoopback =
        host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
      if (onVercel && isLoopback) {
        // Skip misconfigured APP_PUBLIC_URL=localhost on Preview; keep searching.
        continue;
      }
      return { origin, source: candidate.source };
    } catch {
      continue;
    }
  }

  if (onVercel) {
    throw new Error(
      'APP_PUBLIC_URL is missing or loopback on Vercel. Set Preview APP_PUBLIC_URL to the stable branch host and redeploy.',
    );
  }

  return { origin: 'http://localhost:3000', source: 'localhost_fallback' };
}

export function getAppPublicUrl(options?: {
  requestHost?: string | null;
  requestProto?: string | null;
}): string {
  return resolveAppPublicUrl(options).origin;
}

export function allowLocalInviteLinkCopy(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ALLOW_LOCAL_INVITE_LINK_COPY === 'true'
  );
}
