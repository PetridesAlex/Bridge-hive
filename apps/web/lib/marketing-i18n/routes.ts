import { DEFAULT_LOCALE, type MarketingLocale } from './locales';

export const SITE_ORIGIN = 'https://bridgehive.app';

/** Canonical English marketing paths (no locale prefix). */
export const MARKETING_ROUTE_TABLE = {
  home: { path: '/', indexable: true },
  organizations: { path: '/organizations', indexable: true },
  professionals: { path: '/professionals', indexable: true },
  recruitment: { path: '/recruitment', indexable: true },
  recruitmentApply: { path: '/recruitment/apply', indexable: false },
  howItWorks: { path: '/how-it-works', indexable: true },
  about: { path: '/about', indexable: true },
  contact: { path: '/contact', indexable: true },
} as const;

export type MarketingRouteKey = keyof typeof MARKETING_ROUTE_TABLE;

export const MARKETING_NAV_KEYS = [
  'organizations',
  'professionals',
  'recruitment',
  'howItWorks',
  'about',
  'contact',
] as const satisfies readonly MarketingRouteKey[];

/** Paths that must never receive an `/el` prefix. */
const NON_LOCALIZED_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/admin',
  '/auth',
  '/org',
  '/organisation',
  '/dashboard',
  '/activate-organization-account',
  '/organization-invitations',
  '/api',
] as const;

const KNOWN_HASHES = new Set(['#support', '#partnerships']);

export function englishPath(routeKey: MarketingRouteKey): string {
  return MARKETING_ROUTE_TABLE[routeKey].path;
}

export function localizePath(
  pathOrKey: string | MarketingRouteKey,
  locale: MarketingLocale,
): string {
  const english =
    pathOrKey in MARKETING_ROUTE_TABLE
      ? MARKETING_ROUTE_TABLE[pathOrKey as MarketingRouteKey].path
      : pathOrKey;

  const [pathname, hash = ''] = splitHash(english);

  if (shouldNotLocalize(pathname)) {
    return english;
  }

  const localized =
    locale === DEFAULT_LOCALE
      ? pathname === '/'
        ? '/'
        : pathname
      : pathname === '/'
        ? '/el'
        : `/el${pathname}`;

  return `${localized}${hash}`;
}

export function absoluteUrl(path: string): string {
  if (path === '/' || path === '') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/el') return '/';
  if (pathname.startsWith('/el/')) return pathname.slice(3) || '/';
  return pathname;
}

export function localeFromPathname(pathname: string): MarketingLocale {
  if (pathname === '/el' || pathname.startsWith('/el/')) return 'el';
  return 'en';
}

export function matchMarketingRoute(
  pathname: string,
): MarketingRouteKey | null {
  const bare = stripLocalePrefix(pathname);
  for (const [key, entry] of Object.entries(MARKETING_ROUTE_TABLE) as Array<
    [MarketingRouteKey, (typeof MARKETING_ROUTE_TABLE)[MarketingRouteKey]]
  >) {
    if (entry.path === bare) return key;
  }
  return null;
}

/**
 * Map an English or Greek marketing pathname (+ optional hash) to the
 * equivalent path in `target` locale. Unknown marketing paths fall back to home.
 */
export function switchLocaleHref(
  pathname: string,
  hash: string,
  target: MarketingLocale,
): string {
  const bare = stripLocalePrefix(pathname);
  const routeKey = matchMarketingRoute(bare);
  const safeHash = KNOWN_HASHES.has(hash) ? hash : '';

  if (!routeKey) {
    return localizePath('home', target) + safeHash;
  }

  return localizePath(routeKey, target) + safeHash;
}

export function indexableMarketingPaths(
  locale: MarketingLocale,
): string[] {
  return (
    Object.keys(MARKETING_ROUTE_TABLE) as MarketingRouteKey[]
  )
    .filter((key) => MARKETING_ROUTE_TABLE[key].indexable)
    .map((key) => localizePath(key, locale));
}

function shouldNotLocalize(pathname: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`),
  );
}

function splitHash(value: string): [string, string] {
  const idx = value.indexOf('#');
  if (idx === -1) return [value, ''];
  return [value.slice(0, idx) || '/', value.slice(idx)];
}
