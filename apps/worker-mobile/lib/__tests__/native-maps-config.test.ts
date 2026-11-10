import { execFileSync } from 'node:child_process';
import path from 'node:path';

import type { ExpoConfig } from '@expo/config';
import { resolveConfigPluginFunction } from '@expo/config-plugins/build/utils/plugin-resolver';

import { canRenderNativeMap, readAndroidGoogleMapsKeyConfigured } from '@/lib/native-maps';

const projectRoot = path.resolve(__dirname, '../..');
const ENV_KEY = 'GOOGLE_MAPS_ANDROID_API_KEY';
const FAKE_KEY = 'test-only-not-a-real-key';

/** Fresh process per call: @expo/config memoizes evaluated dynamic configs in-process. */
function loadConfig(androidKey?: string): {
  exp: ExpoConfig;
  dynamicConfigPath: string | null;
  staticConfigPath: string | null;
} {
  const env = { ...process.env };
  delete env[ENV_KEY];
  if (androidKey !== undefined) env[ENV_KEY] = androidKey;
  const script = `
    const { getConfig } = require('@expo/config');
    const c = getConfig(process.cwd(), { skipSDKVersionRequirement: true });
    process.stdout.write(JSON.stringify({
      exp: c.exp,
      dynamicConfigPath: c.dynamicConfigPath,
      staticConfigPath: c.staticConfigPath,
    }));
  `;
  const out = execFileSync(process.execPath, ['-e', script], { cwd: projectRoot, env });
  return JSON.parse(out.toString('utf8'));
}

function pluginName(entry: unknown): string {
  return Array.isArray(entry) ? String(entry[0]) : String(entry);
}

describe('native map Expo config', () => {
  it('loads app.config.ts on top of app.json', () => {
    const { dynamicConfigPath, staticConfigPath } = loadConfig();
    expect(dynamicConfigPath).toMatch(/app\.config\.ts$/);
    expect(staticConfigPath).toMatch(/app\.json$/);
  });

  it('resolves every plugin and never lists react-native-maps', () => {
    const { exp } = loadConfig();
    const names = (exp.plugins ?? []).map(pluginName);
    expect(names).not.toContain('react-native-maps');
    expect(new Set(names).size).toBe(names.length);
    for (const entry of exp.plugins ?? []) {
      expect(() => resolveConfigPluginFunction(projectRoot, pluginName(entry))).not.toThrow();
    }
  });

  it('keeps identity, payments, notifications, calendar and locales intact', () => {
    const { exp } = loadConfig(FAKE_KEY);
    expect(exp.name).toBe('BridgeHive App');
    expect(exp.ios?.bundleIdentifier).toBe('com.bridgehive.worker');
    expect(exp.android?.package).toBe('com.bridgehive.worker');
    expect(exp.ios?.config?.usesNonExemptEncryption).toBe(false);
    expect(exp.extra?.eas?.projectId).toBe('3e5c5adc-d6a0-4877-ab04-2e3eb8cf3802');

    const byName = new Map((exp.plugins ?? []).map((p) => [pluginName(p), p]));
    expect(byName.get('@stripe/stripe-react-native')).toEqual([
      '@stripe/stripe-react-native',
      { merchantIdentifier: 'merchant.com.bridgehive.worker', enableGooglePay: true },
    ]);
    expect(byName.has('expo-notifications')).toBe(true);
    expect(byName.has('expo-calendar')).toBe(true);
    expect(byName.has('expo-localization')).toBe(true);
    expect(byName.has('expo-router')).toBe(true);
  });

  it('wires the Android Google Maps key only from the build-time env var', () => {
    const withKey = loadConfig(FAKE_KEY).exp;
    expect(withKey.android?.config?.googleMaps?.apiKey).toBe(FAKE_KEY);
    expect(readAndroidGoogleMapsKeyConfigured(withKey.extra)).toBe(true);

    const withoutKey = loadConfig().exp;
    expect(withoutKey.android?.config?.googleMaps?.apiKey).toBeUndefined();
    expect(readAndroidGoogleMapsKeyConfigured(withoutKey.extra)).toBe(false);
  });

  it('keeps iOS on Apple Maps (no Google Maps key or pods)', () => {
    const { exp } = loadConfig(FAKE_KEY);
    expect(exp.ios?.config?.googleMapsApiKey).toBeUndefined();
  });

  it('does not request location permissions for the workplace pin', () => {
    const { exp } = loadConfig(FAKE_KEY);
    const perms = exp.android?.permissions ?? [];
    expect(perms.some((p) => /LOCATION/i.test(p))).toBe(false);
    const info = exp.ios?.infoPlist ?? {};
    expect(Object.keys(info).some((k) => /Location/i.test(k))).toBe(false);
    expect(exp.ios?.infoPlist?.UIBackgroundModes ?? []).not.toContain('location');
  });
});

describe('canRenderNativeMap', () => {
  it('always renders Apple Maps on iOS', () => {
    expect(
      canRenderNativeMap({ platform: 'ios', isExpoGo: false, androidGoogleMapsKeyConfigured: false }),
    ).toBe(true);
  });

  it('falls back on Android standalone builds without a key', () => {
    expect(
      canRenderNativeMap({ platform: 'android', isExpoGo: false, androidGoogleMapsKeyConfigured: false }),
    ).toBe(false);
    expect(
      canRenderNativeMap({ platform: 'android', isExpoGo: false, androidGoogleMapsKeyConfigured: true }),
    ).toBe(true);
    expect(
      canRenderNativeMap({ platform: 'android', isExpoGo: true, androidGoogleMapsKeyConfigured: false }),
    ).toBe(true);
  });

  it('never renders native maps on web', () => {
    expect(
      canRenderNativeMap({ platform: 'web', isExpoGo: false, androidGoogleMapsKeyConfigured: true }),
    ).toBe(false);
  });
});
