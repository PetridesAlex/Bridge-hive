/**
 * Motion tokens — short, purposeful transitions.
 * Essential information must never depend on animation.
 */

export const motion = {
  duration: {
    instant: 0,
    fast: 120,
    normal: 180,
    slow: 220,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

/** Prefer this when checking reduced-motion preferences. */
export const REDUCED_MOTION_DURATION = 0;

export type Motion = typeof motion;
