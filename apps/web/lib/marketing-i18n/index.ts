export type { MarketingLocale } from './locales';
export {
  DEFAULT_LOCALE,
  MARKETING_LOCALES,
  OG_LOCALE,
  isMarketingLocale,
} from './locales';
export type { MarketingDictionary } from './dictionaries';
export {
  SITE_ORIGIN,
  MARKETING_ROUTE_TABLE,
  MARKETING_NAV_KEYS,
  absoluteUrl,
  englishPath,
  indexableMarketingPaths,
  localeFromPathname,
  localizePath,
  matchMarketingRoute,
  stripLocalePrefix,
  switchLocaleHref,
  type MarketingRouteKey,
} from './routes';
