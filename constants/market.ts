import type { Market } from '@/types';

export const CY_MARKET: Market = {
  id: 'mkt_cy',
  code: 'CY',
  countryCode: 'CY',
  name: 'Cyprus',
  currency: 'EUR',
  timezone: 'Europe/Nicosia',
  locale: 'en-CY',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'el'],
  status: 'active',
};

/** Present for multi-market readiness. Do not activate in Phase 1. */
export const GR_MARKET: Market = {
  id: 'mkt_gr',
  code: 'GR',
  countryCode: 'GR',
  name: 'Greece',
  currency: 'EUR',
  timezone: 'Europe/Athens',
  locale: 'el-GR',
  defaultLanguage: 'el',
  supportedLanguages: ['el', 'en'],
  status: 'inactive',
};

export const MARKETS: Record<string, Market> = {
  [CY_MARKET.id]: CY_MARKET,
  [GR_MARKET.id]: GR_MARKET,
};

export const ACTIVE_MARKET = CY_MARKET;

export const CYPRUS_CITIES = [
  'Limassol',
  'Nicosia',
  'Larnaca',
  'Paphos',
  'Famagusta',
] as const;

export type CyprusCity = (typeof CYPRUS_CITIES)[number];
