export const MARKETING_LOCALES = ['en', 'el'] as const;

export type MarketingLocale = (typeof MARKETING_LOCALES)[number];

export const DEFAULT_LOCALE: MarketingLocale = 'en';

export const OG_LOCALE: Record<MarketingLocale, string> = {
  en: 'en_GB',
  el: 'el_CY',
};

export function isMarketingLocale(value: string): value is MarketingLocale {
  return (MARKETING_LOCALES as readonly string[]).includes(value);
}
