/**
 * Bridge Hive worker-mobile theme (dynamic premium refinement).
 * Maps shared @bridge-hive/design-tokens into React Native-friendly exports.
 */

import {
  fontSize as tokenFontSize,
  lineHeight as tokenLineHeight,
  motion as tokenMotion,
  palette,
  radiiAliases,
  semantic,
  shadows as tokenShadows,
  spacing as tokenSpacing,
  touchTarget as tokenTouchTarget,
  typeScale,
} from '@bridge-hive/design-tokens';

/** Flat color map kept for incremental migration of existing screens. */
export const colors = {
  navy: palette.brandInk,
  navySoft: palette.brandInkStrong,
  navyLift: '#123A5C',
  teal: palette.brandTeal,
  tealStrong: palette.brandTealStrong,
  tealSoft: palette.brandTealSoft,
  yellow: palette.brandHoney,
  yellowLight: palette.brandHoneySoft,
  blue: palette.info,
  blueLight: semantic.status.infoSoft,
  text: semantic.text.primary,
  textSecondary: semantic.text.secondary,
  textMuted: semantic.text.muted,
  background: semantic.background.canvas,
  card: semantic.background.surface,
  surfaceSubdued: semantic.background.subtle,
  border: semantic.border.default,
  borderStrong: semantic.border.strong,
  success: semantic.status.success,
  successLight: semantic.status.successSoft,
  error: semantic.status.danger,
  errorLight: semantic.status.dangerSoft,
  warning: semantic.status.warning,
  warningLight: semantic.status.warningSoft,
  info: semantic.status.info,
  infoLight: semantic.status.infoSoft,
  white: palette.white,
  black: palette.black,
  overlay: palette.overlay,
  honeyStrong: palette.brandHoneyStrong,
} as const;

/** Reserved for intentional auth/hero moments — not routine screen chrome. */
export const brandGradient = [
  palette.brandInkStrong,
  palette.brandInk,
  '#123A5C',
] as const;

/** Soft navy→teal for next-action emphasis cards only. */
export const actionGradient = [palette.brandInk, '#0E4A5C', palette.brandTealStrong] as const;

export const spacing = {
  ...tokenSpacing,
  /** Comfortable horizontal page padding on normal phones (~20). */
  screen: 20,
} as const;

export const radii = radiiAliases;
export const shadows = {
  ...tokenShadows,
  /** Single subtle elevation for sticky/floating elements only. */
  sticky: {
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
};
export const motion = tokenMotion;
export const touchTarget = tokenTouchTarget;

export const typography = {
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    display: 'PlusJakartaSans_700Bold',
    displaySemibold: 'PlusJakartaSans_600SemiBold',
    displayExtra: 'PlusJakartaSans_800ExtraBold',
  },
  size: {
    xs: tokenFontSize.xs,
    sm: tokenFontSize.sm,
    md: tokenFontSize.md,
    lg: tokenFontSize.lg,
    xl: tokenFontSize.xl,
    xxl: tokenFontSize.xxl,
    xxxl: tokenFontSize.xxxl,
    display: tokenFontSize.display,
  },
  lineHeight: tokenLineHeight,
  scale: typeScale,
} as const;

export { semantic, palette, typeScale };

export type StatusStyle = {
  label: string;
  fg: string;
  bg: string;
  icon: string;
};

export const shiftStatusStyles: Record<string, StatusStyle> = {
  published: { label: 'Open', fg: colors.tealStrong, bg: colors.tealSoft, icon: 'radio-button-on' },
  filled: { label: 'Filled', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  in_progress: { label: 'In Progress', fg: colors.info, bg: colors.infoLight, icon: 'time' },
  awaiting_approval: {
    label: 'Awaiting Approval',
    fg: colors.warning,
    bg: colors.warningLight,
    icon: 'hourglass',
  },
  completed: {
    label: 'Completed',
    fg: colors.textSecondary,
    bg: colors.surfaceSubdued,
    icon: 'checkmark-done',
  },
  cancelled: { label: 'Cancelled', fg: colors.error, bg: colors.errorLight, icon: 'close-circle' },
  disputed: { label: 'Disputed', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
  draft: { label: 'Draft', fg: colors.textSecondary, bg: colors.surfaceSubdued, icon: 'create' },
};

export const credentialStatusStyles: Record<string, StatusStyle> = {
  verified: { label: 'Verified', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  pending: { label: 'Pending', fg: colors.info, bg: colors.infoLight, icon: 'time' },
  under_review: { label: 'Under Review', fg: colors.info, bg: colors.infoLight, icon: 'time' },
  expired: { label: 'Expired', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
  rejected: { label: 'Rejected', fg: colors.error, bg: colors.errorLight, icon: 'close-circle' },
  suspended: { label: 'Suspended', fg: colors.error, bg: colors.errorLight, icon: 'ban' },
};

export const payoutStatusStyles: Record<string, StatusStyle> = {
  paid: { label: 'Paid', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  processing: { label: 'Processing', fg: colors.info, bg: colors.infoLight, icon: 'time' },
  issue: { label: 'Issue', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
};

export const invoiceStatusStyles: Record<string, StatusStyle> = {
  open: { label: 'Open', fg: colors.info, bg: colors.infoLight, icon: 'document-text' },
  past_due: { label: 'Past due', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
  paid: { label: 'Paid', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  payment_processing: {
    label: 'Payment processing',
    fg: colors.warning,
    bg: colors.warningLight,
    icon: 'time',
  },
  void: { label: 'Void', fg: colors.textSecondary, bg: colors.surfaceSubdued, icon: 'close-circle' },
  uncollectible: {
    label: 'Uncollectible',
    fg: colors.textSecondary,
    bg: colors.surfaceSubdued,
    icon: 'close-circle',
  },
};
