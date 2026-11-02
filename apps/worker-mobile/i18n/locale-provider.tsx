import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  applyAppLanguage,
  resolveDeviceLanguage,
  t as translate,
  type AppLanguage,
  type IntlLocaleTag,
  INTL_LOCALE_BY_LANGUAGE,
} from '@/i18n';
import { getStoredLocale, setStoredLocale } from '@/i18n/locale-preference';

type LocaleContextValue = {
  language: AppLanguage;
  intlLocale: IntlLocaleTag;
  ready: boolean;
  setLocale: (language: AppLanguage) => Promise<void>;
  t: typeof translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await getStoredLocale();
      const next = stored ?? resolveDeviceLanguage();
      if (!alive) return;
      applyAppLanguage(next);
      setLanguage(next);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLanguage) => {
    applyAppLanguage(next);
    setLanguage(next);
    await setStoredLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      intlLocale: INTL_LOCALE_BY_LANGUAGE[language],
      ready,
      setLocale,
      t: translate,
    }),
    [language, ready, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useAppLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useAppLocale must be used within LocaleProvider');
  }
  return ctx;
}

export function useTranslation() {
  const { t, language, intlLocale, setLocale, ready } = useAppLocale();
  return { t, language, intlLocale, setLocale, ready };
}
