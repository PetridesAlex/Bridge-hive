/**
 * Android Google Maps aborts natively when `com.google.android.geo.API_KEY`
 * is missing, so the MapView must only mount when the build embedded a key.
 * iOS uses Apple Maps (no key). Expo Go ships its own Google Maps key.
 */
export function canRenderNativeMap(input: {
  platform: string;
  isExpoGo: boolean;
  androidGoogleMapsKeyConfigured: boolean;
}): boolean {
  if (input.platform === 'ios') return true;
  if (input.platform !== 'android') return false;
  return input.isExpoGo || input.androidGoogleMapsKeyConfigured;
}

export function readAndroidGoogleMapsKeyConfigured(extra: unknown): boolean {
  if (!extra || typeof extra !== 'object') return false;
  const nativeMaps = (extra as { nativeMaps?: unknown }).nativeMaps;
  if (!nativeMaps || typeof nativeMaps !== 'object') return false;
  return (nativeMaps as { androidGoogleMapsKeyConfigured?: unknown })
    .androidGoogleMapsKeyConfigured === true;
}
