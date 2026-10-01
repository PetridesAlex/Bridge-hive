/**
 * @bridge-hive/design-tokens
 *
 * Platform-neutral visual primitives for Bridge Hive.
 * Mobile (React Native) and web (Next.js) may import these values
 * without importing each other's UI runtimes.
 *
 * Do not put React or React Native components in this package.
 */

export { palette, semantic } from './colors';
export type { Palette, SemanticColors } from './colors';

export { spacing } from './spacing';
export type { Spacing } from './spacing';

export { radii, radiiAliases } from './radii';
export type { Radii } from './radii';

export { fontWeight, typeScale, fontSize, lineHeight } from './typography';
export type { TypeScale } from './typography';

export { shadows } from './shadows';
export type { Shadows } from './shadows';

export { motion, REDUCED_MOTION_DURATION } from './motion';
export type { Motion } from './motion';

/** Minimum practical touch target (points / CSS px). */
export const touchTarget = 44;
