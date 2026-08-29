import { colors } from '@/constants/theme';

/**
 * Surface tokens aligned to Home earnings card:
 * navy gradient (#071A2F → #0E2A47 → #123A5C) + yellow accent.
 */
export const clinical = {
  teal: colors.navyLift,
  tealMid: colors.navySoft,
  mint: colors.blueLight,
  mintDeep: '#D5DEE8',
  mist: colors.background,
  border: 'rgba(7,26,47,0.12)',
  borderStrong: 'rgba(7,26,47,0.22)',
  ink: colors.navy,
  accent: colors.yellow,
} as const;
