/**
 * Gate for optional analytics and advertising on the public website.
 *
 * No provider is configured. The gate stays denied. Do not load tags,
 * pixels, or beacons from here. A future provider needs its own review
 * and must call this function before any loader or event.
 */

export const OPTIONAL_TRACKING_CONFIG_VERSION = 1;

export type OptionalTrackingCategory = 'analytics' | 'advertising';

export type OptionalTrackingDecision = {
  analytics: false;
  advertising: false;
  configVersion: typeof OPTIONAL_TRACKING_CONFIG_VERSION;
};

export function optionalTrackingDecision(): OptionalTrackingDecision {
  return {
    analytics: false,
    advertising: false,
    configVersion: OPTIONAL_TRACKING_CONFIG_VERSION,
  };
}

const CONFIGURED_OPTIONAL_TRACKING: Record<OptionalTrackingCategory, false> = {
  analytics: false,
  advertising: false,
};

/** Absent or unconfigured optional tracking is denied. */
export function mayLoadOptionalTracking(
  category: OptionalTrackingCategory,
): boolean {
  return CONFIGURED_OPTIONAL_TRACKING[category];
}
