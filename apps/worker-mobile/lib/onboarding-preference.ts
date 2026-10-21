import AsyncStorage from '@react-native-async-storage/async-storage';

/** Non-sensitive UI preference — never store auth tokens here. */
export const WORKER_ONBOARDING_STORAGE_KEY =
  'bridgehive.worker.onboarding.version';

/** Bump when first-launch Welcome content must be shown again. */
export const WORKER_ONBOARDING_VERSION = 1;

export async function getOnboardingVersion(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(WORKER_ONBOARDING_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function hasCompletedOnboarding(
  currentVersion: number = WORKER_ONBOARDING_VERSION,
): Promise<boolean> {
  const stored = await getOnboardingVersion();
  return stored >= currentVersion;
}

export async function markOnboardingSeen(
  version: number = WORKER_ONBOARDING_VERSION,
): Promise<void> {
  try {
    await AsyncStorage.setItem(WORKER_ONBOARDING_STORAGE_KEY, String(version));
  } catch {
    // Preference write failures must not block navigation.
  }
}
