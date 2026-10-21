import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  WORKER_ONBOARDING_STORAGE_KEY,
  WORKER_ONBOARDING_VERSION,
  getOnboardingVersion,
  hasCompletedOnboarding,
  markOnboardingSeen,
} from '../onboarding-preference';

describe('onboarding preference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('treats a fresh install as incomplete onboarding', async () => {
    expect(await getOnboardingVersion()).toBe(0);
    expect(await hasCompletedOnboarding()).toBe(false);
  });

  it('marks Welcome as seen so future signed-out opens skip it', async () => {
    await markOnboardingSeen();
    expect(await getOnboardingVersion()).toBe(WORKER_ONBOARDING_VERSION);
    expect(await hasCompletedOnboarding()).toBe(true);
    const stored = await AsyncStorage.getItem(WORKER_ONBOARDING_STORAGE_KEY);
    expect(stored).toBe(String(WORKER_ONBOARDING_VERSION));
  });
});
