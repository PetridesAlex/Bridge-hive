import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAppLanguage, type AppLanguage } from '@/i18n/types';

/** Non-sensitive UI preference — never store auth tokens here. */
export const WORKER_LOCALE_STORAGE_KEY = 'bridgehive.worker.locale';

export async function getStoredLocale(): Promise<AppLanguage | null> {
  try {
    const raw = await AsyncStorage.getItem(WORKER_LOCALE_STORAGE_KEY);
    if (isAppLanguage(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

export async function setStoredLocale(language: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(WORKER_LOCALE_STORAGE_KEY, language);
  } catch {
    // Preference write failures must not block navigation.
  }
}
