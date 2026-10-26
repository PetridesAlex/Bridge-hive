import {
  MARKETING_NAV_KEYS,
  MARKETING_ROUTE_TABLE,
  SITE_ORIGIN as MARKETING_SITE_ORIGIN,
  type MarketingRouteKey,
} from '@/lib/marketing-i18n/routes';

/**
 * Marketing nav entries. English `href` stays here so sitemap / legacy consumers
 * keep working; the human-readable label now lives in dictionary.nav[key] and
 * MarketingNav localizes the href via `localizePath` at render time.
 */
export type MarketingNavItem = {
  key: (typeof MARKETING_NAV_KEYS)[number];
  href: string;
};

export const MARKETING_NAV: readonly MarketingNavItem[] = MARKETING_NAV_KEYS.map(
  (key) => ({ key, href: MARKETING_ROUTE_TABLE[key].path }),
);

export const SITE_ORIGIN = MARKETING_SITE_ORIGIN;

/**
 * Canonical English-language public marketing paths — used by sitemap/robots.
 * Greek mirrors are composed separately via `indexableMarketingPaths('el')`.
 */
export const PUBLIC_MARKETING_PATHS = [
  '/',
  '/organizations',
  '/professionals',
  '/recruitment',
  '/recruitment/apply',
  '/how-it-works',
  '/about',
  '/contact',
] as const;

export type MarketingNavKey = MarketingRouteKey;
