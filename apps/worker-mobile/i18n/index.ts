import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import { INTL_LOCALE_BY_LANGUAGE, type AppLanguage, type IntlLocaleTag } from '@/i18n/types';
import { el } from '@/i18n/translations/el';
import { en } from '@/i18n/translations/en';

export const i18n = new I18n({
  en,
  el,
});

i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;
i18n.missingBehavior = 'guess';

/** Active Intl tag used by formatters — updated when language changes. */
let activeIntlLocale: IntlLocaleTag = 'en-CY';

export function getActiveIntlLocale(): IntlLocaleTag {
  return activeIntlLocale;
}

export function applyAppLanguage(language: AppLanguage): void {
  i18n.locale = language;
  activeIntlLocale = INTL_LOCALE_BY_LANGUAGE[language];
}

export function resolveDeviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (code === 'el') return 'el';
  } catch {
    // Device locale unavailable — fall through to English.
  }
  return 'en';
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export type { AppLanguage, IntlLocaleTag };
export { INTL_LOCALE_BY_LANGUAGE, isAppLanguage } from '@/i18n/types';
export { en } from '@/i18n/translations/en';
export { el } from '@/i18n/translations/el';
