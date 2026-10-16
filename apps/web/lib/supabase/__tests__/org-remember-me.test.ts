import {
  isOrgRememberMeEnabled,
  ORG_REMEMBERED_SESSION_MAX_AGE_SEC,
  withOrgRememberMeCookieOptions,
} from '../org-remember-me';

describe('org remember-me cookie helpers', () => {
  it('treats missing preference as remembered for existing sessions', () => {
    expect(isOrgRememberMeEnabled(undefined)).toBe(true);
    expect(isOrgRememberMeEnabled(null)).toBe(true);
    expect(isOrgRememberMeEnabled('1')).toBe(true);
    expect(isOrgRememberMeEnabled('0')).toBe(false);
  });

  it('applies a long maxAge when remembered and session cookies when not', () => {
    const base = { path: '/', sameSite: 'lax' as const, httpOnly: false };

    expect(withOrgRememberMeCookieOptions(base, true)).toEqual({
      ...base,
      maxAge: ORG_REMEMBERED_SESSION_MAX_AGE_SEC,
    });

    expect(
      withOrgRememberMeCookieOptions(
        { ...base, maxAge: 400 * 24 * 60 * 60, expires: new Date('2099-01-01') },
        false,
      ),
    ).toEqual(base);
  });
});
