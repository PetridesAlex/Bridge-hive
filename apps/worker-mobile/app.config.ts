import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Wraps app.json. Workplace maps use the platform default provider:
 * Apple Maps on iOS (no key) and Google Maps on Android (key required).
 * react-native-maps 1.20.1 ships no config plugin — Expo's built-in
 * `android.config.googleMaps.apiKey` support writes the manifest metadata.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() || undefined;

  return {
    ...config,
    name: config.name ?? 'BridgeHive App',
    slug: config.slug ?? 'bridge-hive-worker',
    android: {
      ...config.android,
      ...(androidMapsKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: androidMapsKey,
              },
            },
          }
        : null),
    },
    extra: {
      ...config.extra,
      nativeMaps: {
        androidGoogleMapsKeyConfigured: Boolean(androidMapsKey),
      },
    },
  };
};
