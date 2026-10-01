/**
 * Typography scales — restrained mobile hierarchy.
 * Consumers map fontFamily to Inter / Plus Jakarta Sans (or system fonts).
 */

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const typeScale = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold },
  heroAction: { fontSize: 22, lineHeight: 28, fontWeight: fontWeight.bold },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: fontWeight.semibold },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: fontWeight.semibold },
  body: { fontSize: 15, lineHeight: 22, fontWeight: fontWeight.regular },
  bodyMedium: { fontSize: 16, lineHeight: 22, fontWeight: fontWeight.medium },
  supporting: { fontSize: 13, lineHeight: 19, fontWeight: fontWeight.regular },
  label: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.semibold },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: fontWeight.medium },
  largeAmount: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold },
} as const;

/** Legacy numeric size map for incremental migration. */
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 16,
  xl: 17,
  xxl: 22,
  xxxl: 28,
  display: 28,
} as const;

export const lineHeight = {
  xs: 17,
  sm: 19,
  md: 22,
  lg: 21,
  xl: 22,
  xxl: 28,
  xxxl: 34,
  display: 34,
} as const;

export type TypeScale = typeof typeScale;
