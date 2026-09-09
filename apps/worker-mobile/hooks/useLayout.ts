import { useWindowDimensions } from 'react-native';

export const layout = {
  contentMaxWidth: 720,
  sheetMaxWidth: 480,
  breakpoints: {
    compact: 380,
    phone: 480,
    tablet: 768,
  },
} as const;

export type LayoutInfo = {
  width: number;
  height: number;
  gutter: number;
  contentMaxWidth: number;
  isCompact: boolean;
  isTablet: boolean;
  isWide: boolean;
  columns: 1 | 2;
};

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const isCompact = width < layout.breakpoints.compact;
  const isTablet = width >= layout.breakpoints.tablet;
  const isWide = width >= layout.breakpoints.phone;

  let gutter = 16;
  if (isCompact) gutter = 12;
  else if (isTablet) gutter = 24;

  return {
    width,
    height,
    gutter,
    contentMaxWidth: layout.contentMaxWidth,
    isCompact,
    isTablet,
    isWide,
    columns: isTablet ? 2 : 1,
  };
}

/** Usable content width inside AppScreen (after gutters + maxWidth). */
export function useContentWidth(padded = true): number {
  const { width, gutter, contentMaxWidth } = useLayout();
  const capped = Math.min(width, contentMaxWidth);
  return padded ? Math.max(0, capped - gutter * 2) : capped;
}
