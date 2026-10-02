import { useWindowDimensions } from 'react-native';

export type ContentKind = 'auth' | 'detail' | 'list';

export const layout = {
  /** Default / list screens */
  contentMaxWidth: 680,
  authMaxWidth: 440,
  detailMaxWidth: 600,
  listMaxWidth: 680,
  sheetMaxWidth: 480,
  breakpoints: {
    compact: 375,
    phone: 600,
    tablet: 900,
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

export function maxWidthForKind(kind: ContentKind = 'list'): number {
  if (kind === 'auth') return layout.authMaxWidth;
  if (kind === 'detail') return layout.detailMaxWidth;
  return layout.listMaxWidth;
}

export function useLayout(contentKind: ContentKind = 'list'): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const isCompact = width < layout.breakpoints.compact;
  const isTablet = width >= layout.breakpoints.tablet;
  const isWide = width >= layout.breakpoints.phone;

  let gutter = 20;
  if (width < 375) gutter = 16;
  else if (width < 600) gutter = 20;
  else gutter = 24;

  return {
    width,
    height,
    gutter,
    contentMaxWidth: maxWidthForKind(contentKind),
    isCompact,
    isTablet,
    isWide,
    columns: isTablet ? 2 : 1,
  };
}

/** Usable content width inside AppScreen (after gutters + maxWidth). */
export function useContentWidth(padded = true, contentKind: ContentKind = 'list'): number {
  const { width, gutter, contentMaxWidth } = useLayout(contentKind);
  const capped = Math.min(width, contentMaxWidth);
  return padded ? Math.max(0, capped - gutter * 2) : capped;
}
