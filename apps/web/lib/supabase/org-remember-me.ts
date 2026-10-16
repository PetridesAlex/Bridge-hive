import type { CookieOptions } from '@supabase/ssr';

/** Preference cookie: `1` = keep org session across browser restarts. */
export const ORG_REMEMBER_ME_COOKIE = 'bh_org_remember';

/** How long to keep the Remember me preference itself. */
export const ORG_REMEMBER_ME_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Auth cookie lifetime when Remember me is enabled. */
export const ORG_REMEMBERED_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function isOrgRememberMeEnabled(
  value: string | undefined | null,
): boolean {
  // Absent cookie keeps prior long-lived Supabase cookies working.
  return value !== '0';
}

export function withOrgRememberMeCookieOptions(
  options: CookieOptions,
  remember: boolean,
): CookieOptions {
  if (remember) {
    return {
      ...options,
      maxAge: ORG_REMEMBERED_SESSION_MAX_AGE_SEC,
    };
  }

  const next: CookieOptions = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next;
}
