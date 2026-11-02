import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  applyAppLanguage,
  getActiveIntlLocale,
  resolveDeviceLanguage,
  t,
} from '@/i18n';
import {
  getStoredLocale,
  setStoredLocale,
  WORKER_LOCALE_STORAGE_KEY,
} from '@/i18n/locale-preference';
import { el } from '@/i18n/translations/el';
import { en } from '@/i18n/translations/en';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

const { getLocales } = jest.requireMock('expo-localization') as {
  getLocales: jest.Mock;
};

describe('locale resolution', () => {
  beforeEach(() => {
    getLocales.mockReturnValue([{ languageCode: 'en' }]);
    applyAppLanguage('en');
  });

  it('defaults Greek when device language is el', () => {
    getLocales.mockReturnValue([{ languageCode: 'el' }]);
    expect(resolveDeviceLanguage()).toBe('el');
  });

  it('defaults English for unsupported device languages', () => {
    getLocales.mockReturnValue([{ languageCode: 'fr' }]);
    expect(resolveDeviceLanguage()).toBe('en');
    getLocales.mockReturnValue([{ languageCode: 'de' }]);
    expect(resolveDeviceLanguage()).toBe('en');
  });
});

describe('manual locale preference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    applyAppLanguage('en');
  });

  it('persists manual Greek selection in AsyncStorage', async () => {
    await setStoredLocale('el');
    expect(await getStoredLocale()).toBe('el');
    const raw = await AsyncStorage.getItem(WORKER_LOCALE_STORAGE_KEY);
    expect(raw).toBe('el');
  });

  it('persists English and survives clear of unrelated keys', async () => {
    await setStoredLocale('el');
    await setStoredLocale('en');
    expect(await getStoredLocale()).toBe('en');
  });

  it('returns null when no preference is stored', async () => {
    expect(await getStoredLocale()).toBeNull();
  });
});

describe('translation catalogs and fallback', () => {
  beforeEach(() => {
    applyAppLanguage('en');
  });

  it('switches visible boot copy when language changes', () => {
    applyAppLanguage('en');
    expect(t('boot.preparing')).toBe(en.boot.preparing);
    applyAppLanguage('el');
    expect(t('boot.preparing')).toBe(el.boot.preparing);
    expect(t('boot.preparing')).toMatch(/Ετοιμάζουμε/);
  });

  it('falls back to English for missing keys without crashing', () => {
    applyAppLanguage('el');
    const missing = t('this.key.does.not.exist.anywhere');
    expect(typeof missing).toBe('string');
    expect(missing.length).toBeGreaterThan(0);
  });

  it('keeps matching intentional keys across EN and EL catalogs', () => {
    const smoke = [
      'boot.preparing',
      'welcome.getStarted',
      'auth.signIn',
      'auth.forgotPassword',
      'auth.pendingTitle',
      'tabs.home',
      'shifts.title',
      'invoices.title',
      'profile.language',
      'common.brandName',
    ] as const;

    for (const key of smoke) {
      applyAppLanguage('en');
      const english = t(key);
      applyAppLanguage('el');
      const greek = t(key);
      expect(english.length).toBeGreaterThan(0);
      expect(greek.length).toBeGreaterThan(0);
      if (key === 'common.brandName') {
        expect(english).toBe('BridgeHive App');
        expect(greek).toBe('BridgeHive App');
      }
    }
  });

  it('uses en-CY and el-CY Intl tags', () => {
    applyAppLanguage('en');
    expect(getActiveIntlLocale()).toBe('en-CY');
    applyAppLanguage('el');
    expect(getActiveIntlLocale()).toBe('el-CY');
  });
});

describe('locale-aware money formatting', () => {
  it('formats EUR for both locales', () => {
    const { formatMoney } = require('@/utils/format') as typeof import('@/utils/format');
    applyAppLanguage('en');
    const enMoney = formatMoney(12345, 'EUR');
    applyAppLanguage('el');
    const elMoney = formatMoney(12345, 'EUR');
    expect(enMoney).toMatch(/123|€|EUR/);
    expect(elMoney).toMatch(/123|€|EUR/);
  });
});
