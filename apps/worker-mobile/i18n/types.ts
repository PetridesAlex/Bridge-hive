export type AppLanguage = 'en' | 'el';

export type IntlLocaleTag = 'en-CY' | 'el-CY';

export const APP_LANGUAGES: readonly AppLanguage[] = ['en', 'el'] as const;

export const INTL_LOCALE_BY_LANGUAGE: Record<AppLanguage, IntlLocaleTag> = {
  en: 'en-CY',
  el: 'el-CY',
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'el';
}
