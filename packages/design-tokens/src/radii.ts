/** Corner radii — routine controls tighter; emphasis cards larger. */

export const radii = {
  small: 10,
  medium: 12,
  large: 16,
  xlarge: 20,
  pill: 999,
} as const;

/** Short aliases matching common mobile usage. */
export const radiiAliases = {
  sm: radii.small,
  md: radii.medium,
  lg: radii.large,
  xl: radii.xlarge,
  full: radii.pill,
} as const;

export type Radii = typeof radii;
