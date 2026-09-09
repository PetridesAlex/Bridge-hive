/** Bridge Hive design tokens (navy + yellow brand system). */

export const colors = {
  navy: '#071A2F',
  navySoft: '#0E2A47',
  navyLift: '#123A5C',
  yellow: '#F5B000',
  yellowLight: '#FEF6E6',
  blue: '#123A5C',
  blueLight: '#E8EEF4',
  text: '#071A2F',
  textSecondary: '#4A5B6E',
  textMuted: '#7A8A9C',
  background: '#F4F6F9',
  card: '#FFFFFF',
  border: '#D9E0E8',
  success: '#12805C',
  successLight: '#E6F4EF',
  error: '#B42318',
  errorLight: '#FEF3F2',
  warning: '#F5B000',
  warningLight: '#FEF6E6',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(7, 26, 47, 0.55)',
} as const;

export const brandGradient = ['#071A2F', '#0E2A47', '#123A5C'] as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

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
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  lineHeight: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 40,
    display: 48,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#071A2F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#071A2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#071A2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export type StatusStyle = {
  label: string;
  fg: string;
  bg: string;
  icon: string;
};

export const shiftStatusStyles: Record<string, StatusStyle> = {
  published: { label: 'Open', fg: colors.navyLift, bg: colors.blueLight, icon: 'radio-button-on' },
  filled: { label: 'Filled', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  in_progress: { label: 'In Progress', fg: colors.navyLift, bg: colors.blueLight, icon: 'time' },
  awaiting_approval: { label: 'Awaiting Approval', fg: colors.navy, bg: colors.yellowLight, icon: 'hourglass' },
  completed: { label: 'Completed', fg: colors.textSecondary, bg: colors.background, icon: 'checkmark-done' },
  cancelled: { label: 'Cancelled', fg: colors.error, bg: colors.errorLight, icon: 'close-circle' },
  disputed: { label: 'Disputed', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
  draft: { label: 'Draft', fg: colors.textSecondary, bg: colors.background, icon: 'create' },
};

export const credentialStatusStyles: Record<string, StatusStyle> = {
  verified: { label: 'Verified', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  pending: { label: 'Pending', fg: colors.navyLift, bg: colors.blueLight, icon: 'time' },
  under_review: { label: 'Under Review', fg: colors.navyLift, bg: colors.blueLight, icon: 'time' },
  expired: { label: 'Expired', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
  rejected: { label: 'Rejected', fg: colors.error, bg: colors.errorLight, icon: 'close-circle' },
  suspended: { label: 'Suspended', fg: colors.error, bg: colors.errorLight, icon: 'ban' },
};

export const payoutStatusStyles: Record<string, StatusStyle> = {
  paid: { label: 'Paid', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle' },
  processing: { label: 'Processing', fg: colors.navyLift, bg: colors.blueLight, icon: 'time' },
  issue: { label: 'Issue', fg: colors.error, bg: colors.errorLight, icon: 'alert-circle' },
};

export const touchTarget = 44;
