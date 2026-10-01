/**
 * Bridge Hive Phase 7A color tokens (dynamic premium refinement).
 * Platform-neutral primitives — no React Native or DOM imports.
 *
 * Personality: clinical confidence with human warmth.
 * White-dominant; navy for trust actions; teal for interaction; honey signature.
 * Target balance ~70% neutrals / 20% navy / 7% teal / 3% honey.
 */

export const palette = {
  brandInk: '#0B2A43',
  brandInkStrong: '#071D30',
  brandTeal: '#16A6B6',
  brandTealStrong: '#087F8C',
  brandTealSoft: '#E4F7F9',
  brandHoney: '#E0AA18',
  brandHoneyStrong: '#B97900',
  brandHoneySoft: '#FFF5D6',
  canvas: '#F5F7F8',
  surface: '#FFFFFF',
  surfaceSubdued: '#EDF2F4',
  border: '#E1E7EA',
  borderStrong: '#CBD3DA',
  textPrimary: '#102331',
  textSecondary: '#5F6F79',
  textMuted: '#7D8A92',
  textInverse: '#FFFFFF',
  success: '#198754',
  successSoft: '#E7F6ED',
  warning: '#A56800',
  warningSoft: '#FFF2CC',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  info: '#1769AA',
  infoSoft: '#E8F2FC',
  focusRing: '#16A6B6',
  overlay: 'rgba(11, 42, 67, 0.55)',
  black: '#000000',
  white: '#FFFFFF',
} as const;

/** Semantic aliases for product UI. Prefer these over raw palette in screens. */
export const semantic = {
  background: {
    canvas: palette.canvas,
    surface: palette.surface,
    subtle: palette.surfaceSubdued,
    inverse: palette.brandInk,
    inverseSoft: '#123A5C',
    tealSoft: palette.brandTealSoft,
  },
  text: {
    primary: palette.textPrimary,
    secondary: palette.textSecondary,
    muted: palette.textMuted,
    inverse: palette.textInverse,
    link: palette.brandTealStrong,
  },
  border: {
    default: palette.border,
    strong: palette.borderStrong,
    focus: palette.focusRing,
  },
  action: {
    primary: palette.brandInk,
    primaryPressed: palette.brandInkStrong,
    primaryForeground: palette.textInverse,
    secondary: palette.surface,
    secondaryForeground: palette.brandInk,
    interactive: palette.brandTeal,
    interactivePressed: palette.brandTealStrong,
    interactiveSoft: palette.brandTealSoft,
    accent: palette.brandHoney,
    accentForeground: palette.brandInk,
    accentSoft: palette.brandHoneySoft,
    destructive: palette.danger,
    destructiveSoft: palette.dangerSoft,
    ghost: 'transparent',
  },
  status: {
    success: palette.success,
    successSoft: palette.successSoft,
    warning: palette.warning,
    warningSoft: palette.warningSoft,
    danger: palette.danger,
    dangerSoft: palette.dangerSoft,
    info: palette.info,
    infoSoft: palette.infoSoft,
  },
  focus: {
    ring: palette.focusRing,
  },
  /**
   * Organization web workspace aliases (Phase 7B).
   * Additive only — does not rename mobile-facing semantic keys.
   */
  org: {
    sidebar: palette.brandInkStrong,
    sidebarRaised: palette.brandInk,
    sidebarHover: '#103B58',
    sidebarText: '#DCE8EE',
    sidebarMuted: '#91A8B5',
    canvas: '#F4F7F9',
    surface: palette.surface,
    subtle: '#EDF3F5',
    border: '#DCE5E9',
    borderStrong: '#C8D5DB',
  },
} as const;

export type Palette = typeof palette;
export type SemanticColors = typeof semantic;
