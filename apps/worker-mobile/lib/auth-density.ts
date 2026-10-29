/**
 * Height-aware vertical density for first-launch and authentication screens.
 *
 * Density is derived from the *usable* height (window minus safe-area insets),
 * divided by the system font scale so large Dynamic Type settings fall into a
 * tighter tier instead of overflowing. It never hides content; it only picks
 * spacing and artwork sizes. Screens still scroll when content genuinely does
 * not fit (keyboard open, very small phones, accessibility text sizes).
 */
export type AuthDensity = 'compact' | 'regular' | 'roomy';

/** Effective usable heights (pt) where each tier starts. */
export const AUTH_DENSITY_BREAKPOINTS = {
  /** Below this: iPhone SE / mini-class heights or large text. */
  regular: 650,
  /** At or above this: iPhone 12-17 class heights and taller. */
  roomy: 745,
} as const;

export type AuthDensityInput = {
  height: number;
  insetTop: number;
  insetBottom: number;
  fontScale: number;
};

export function resolveAuthDensity({
  height,
  insetTop,
  insetBottom,
  fontScale,
}: AuthDensityInput): AuthDensity {
  const usable = Math.max(0, height - insetTop - insetBottom);
  const effective = usable / Math.max(1, fontScale);
  if (effective >= AUTH_DENSITY_BREAKPOINTS.roomy) return 'roomy';
  if (effective >= AUTH_DENSITY_BREAKPOINTS.regular) return 'regular';
  return 'compact';
}

/** Spacing + artwork sizes shared by AuthShell. */
export type AuthShellMetrics = {
  /** Space between the back button row and scroll content. */
  backTop: number;
  backBottom: number;
  scrollTop: number;
  scrollTopNoBack: number;
  /** Official mark sizes (px). */
  landingMark: number;
  formMark: number;
  lightMark: number;
  markPad: number;
  heroGap: number;
  landingHeroBottom: number;
  formHeroBottom: number;
  lightHeroBottom: number;
  title: { size: number; line: number };
  lightTitle: { size: number; line: number };
  subtitle: { size: number; line: number };
  cardPad: number;
  cardGap: number;
  footerTop: number;
};

const SHELL: Record<AuthDensity, AuthShellMetrics> = {
  roomy: {
    backTop: 8,
    backBottom: 4,
    scrollTop: 8,
    scrollTopNoBack: 20,
    landingMark: 112,
    formMark: 72,
    lightMark: 76,
    markPad: 20,
    heroGap: 8,
    landingHeroBottom: 20,
    formHeroBottom: 16,
    lightHeroBottom: 20,
    title: { size: 26, line: 32 },
    lightTitle: { size: 28, line: 34 },
    subtitle: { size: 15, line: 21 },
    cardPad: 18,
    cardGap: 12,
    footerTop: 12,
  },
  regular: {
    backTop: 4,
    backBottom: 2,
    scrollTop: 4,
    scrollTopNoBack: 14,
    landingMark: 96,
    formMark: 64,
    lightMark: 68,
    markPad: 16,
    heroGap: 6,
    landingHeroBottom: 16,
    formHeroBottom: 14,
    lightHeroBottom: 16,
    title: { size: 24, line: 30 },
    lightTitle: { size: 26, line: 32 },
    subtitle: { size: 14, line: 20 },
    cardPad: 16,
    cardGap: 12,
    footerTop: 10,
  },
  compact: {
    backTop: 2,
    backBottom: 0,
    scrollTop: 2,
    scrollTopNoBack: 8,
    landingMark: 76,
    formMark: 56,
    lightMark: 60,
    markPad: 12,
    heroGap: 4,
    landingHeroBottom: 12,
    formHeroBottom: 10,
    lightHeroBottom: 12,
    title: { size: 22, line: 28 },
    lightTitle: { size: 24, line: 30 },
    subtitle: { size: 14, line: 20 },
    cardPad: 14,
    cardGap: 10,
    footerTop: 8,
  },
};

export function authShellMetrics(density: AuthDensity): AuthShellMetrics {
  return SHELL[density];
}

/** Welcome (first-launch) screen rhythm. */
export type WelcomeMetrics = {
  top: number;
  mark: number;
  heroGap: number;
  title: { size: number; line: number; tracking: number };
  subtitle: { size: number; line: number };
  cuesTop: number;
  cueGap: number;
  cuePadV: number;
  cueIcon: number;
  cueLabel: { size: number; line: number };
  actionsTop: number;
  actionGap: number;
  bottom: number;
};

const WELCOME: Record<AuthDensity, WelcomeMetrics> = {
  roomy: {
    top: 16,
    mark: 104,
    heroGap: 14,
    title: { size: 36, line: 42, tracking: -1 },
    subtitle: { size: 18, line: 26 },
    cuesTop: 8,
    cueGap: 10,
    cuePadV: 10,
    cueIcon: 34,
    cueLabel: { size: 15, line: 20 },
    actionsTop: 20,
    actionGap: 12,
    bottom: 8,
  },
  regular: {
    top: 10,
    mark: 88,
    heroGap: 12,
    title: { size: 32, line: 38, tracking: -0.8 },
    subtitle: { size: 17, line: 24 },
    cuesTop: 6,
    cueGap: 8,
    cuePadV: 8,
    cueIcon: 32,
    cueLabel: { size: 15, line: 20 },
    actionsTop: 16,
    actionGap: 10,
    bottom: 8,
  },
  compact: {
    top: 4,
    mark: 72,
    heroGap: 10,
    title: { size: 28, line: 34, tracking: -0.6 },
    subtitle: { size: 15, line: 22 },
    cuesTop: 4,
    cueGap: 8,
    cuePadV: 8,
    cueIcon: 30,
    cueLabel: { size: 14, line: 19 },
    actionsTop: 12,
    actionGap: 10,
    bottom: 6,
  },
};

export function welcomeMetrics(density: AuthDensity): WelcomeMetrics {
  return WELCOME[density];
}
