/**
 * 8-point spacing rhythm with 4-point exceptions.
 * Values: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48
 */

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
  massive: 48,
} as const;

export type Spacing = typeof spacing;
