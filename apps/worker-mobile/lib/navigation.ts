import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Pop when Expo has history; otherwise land on a known screen.
 * On web, `router.back()` can no-op even when the browser history looks non-empty
 * (Expo Router stack ≠ `window.history`), so we fall through to `replace`.
 */
export function navigateBack(fallback: Href = '/(tabs)') {
  const before =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : null;

  if (router.canGoBack()) {
    router.back();
    if (before) {
      requestAnimationFrame(() => {
        const after = `${window.location.pathname}${window.location.search}`;
        if (after === before) {
          router.replace(fallback);
        }
      });
    }
    return;
  }

  router.replace(fallback);
}
