import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type TabAccent = {
  solid: string;
  soft: string;
  gradient: [string, string, string];
  indicator: string;
};

const ACTIVE = colors.white;
const INACTIVE = '#8FA9C4';
const INDICATOR = '#F5B21A';
const WELL_GRADIENT: [string, string, string] = [colors.navy, '#0C3E56', colors.tealStrong];
const WELL_IDLE = 'rgba(255, 255, 255, 0.06)';

/** Bar-wide accent: the active tab always reads navy with a honey indicator. */
const BAR_ACCENT: TabAccent = {
  solid: ACTIVE,
  soft: 'rgba(11, 42, 67, 0.08)',
  gradient: [colors.navy, '#0C3E56', colors.tealStrong],
  indicator: INDICATOR,
};

export const TAB_ACCENTS = {
  home: BAR_ACCENT,
  shifts: BAR_ACCENT,
  work: BAR_ACCENT,
  finances: BAR_ACCENT,
  more: BAR_ACCENT,
} as const;

const SPRING = { damping: 18, stiffness: 280, mass: 0.75 };
const TAB_COUNT = 5;
const GLYPH_BOX = 24;
const HIGHLIGHT_PAD = 6;
const TOP_RADIUS = 20;
const SHADOW_BLEED = 6;
const ICON_COL_GAP = 2;
const INDICATOR_HEIGHT = 3;
const INDICATOR_MARGIN_TOP = 2;
const INDICATOR_BLOCK = INDICATOR_HEIGHT + INDICATOR_MARGIN_TOP;
const SIDE_TAB_GAP = 3;
const LABEL_MARGIN_TOP = 1;

type Density = 'narrow' | 'regular' | 'wide';

type TabMetrics = {
  density: Density;
  width: number;
  slotWidth: number;
  topPad: number;
  bottomPad: number;
  contentHeight: number;
  barHeight: number;
  buttonMinHeight: number;
  iconGlyph: number;
  labelSize: number;
  labelLine: number;
  gap: number;
  highlightWidth: number;
  highlightHeight: number;
  fabSize: number;
  fabGlyph: number;
  /** Center of the floating action button, measured from the top of the bar. */
  fabCenterY: number;
  /** translateY that moves the FAB from the slot's center to fabCenterY. */
  fabLift: number;
  notchRadius: number;
  useShortLabels: boolean;
  focusedLabelOnly: boolean;
};

function useTabMetrics(): TabMetrics {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const slotWidth = width / TAB_COUNT;
    const density: Density =
      slotWidth < 70 ? 'narrow' : slotWidth < 84 ? 'regular' : 'wide';

    // Compact navy strip; honey FAB intentionally taller than the chrome.
    const topPad = 6;
    const bottomPad = Math.max(insets.bottom, 8);
    const labelSize = density === 'narrow' ? 10 : 11;
    const labelLine = labelSize + 2;
    const gap = 1;
    const highlightWidth = Math.min(slotWidth - 16, density === 'narrow' ? 36 : 40);
    const wellSize = Math.max(highlightWidth, GLYPH_BOX + HIGHLIGHT_PAD + 2);
    // Side tab column: well + iconCol gap + indicator (+margin) + column gap + label (+margin).
    const contentHeight =
      wellSize + ICON_COL_GAP + INDICATOR_BLOCK + SIDE_TAB_GAP + labelLine + LABEL_MARGIN_TOP;
    const fabSize = density === 'narrow' ? 78 : density === 'regular' ? 88 : 92;
    // Sit the disc mostly above the slim navy strip (not buried in the bar).
    const fabCenterY = Math.max(16, Math.round(fabSize * 0.28));

    return {
      density,
      width,
      slotWidth,
      topPad,
      bottomPad,
      contentHeight,
      barHeight: topPad + contentHeight + bottomPad,
      buttonMinHeight: contentHeight,
      iconGlyph: density === 'narrow' ? 19 : 21,
      labelSize,
      labelLine,
      gap,
      highlightWidth,
      // Icon plate only — never extend into the label row (avoids line/text overlap).
      highlightHeight: GLYPH_BOX + HIGHLIGHT_PAD,
      fabSize,
      fabCenterY,
      fabLift: -(topPad + contentHeight / 2 - fabCenterY),
      // Tight cradle — avoid a navy ring reading as a second button behind the FAB.
      notchRadius: fabSize / 2 + 1.5,
      fabGlyph: density === 'narrow' ? 34 : 40,
      useShortLabels: slotWidth < 82,
      focusedLabelOnly: slotWidth < 62,
    };
  }, [insets.bottom, width]);
}

/** Adaptive tab bar chrome metrics for Expo Router Tabs `tabBarStyle`. */
export function useAdaptiveTabBarStyle() {
  const metrics = useTabMetrics();

  return useMemo(
    () => ({
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      borderTopColor: 'transparent',
      borderColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
      shadowColor: 'transparent',
      height: metrics.barHeight,
      paddingBottom: metrics.bottomPad,
      paddingTop: metrics.topPad,
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'visible' as const,
      // Keep bar above transformed list rows without changing chrome.
      zIndex: 100,
    }),
    [metrics],
  );
}

/** Extra scroll/list padding so content clears the floating absolute tab bar. */
export function useTabBarScrollInset(extra: number = spacing.lg): number {
  const tabBarStyle = useAdaptiveTabBarStyle();
  const height = typeof tabBarStyle.height === 'number' ? tabBarStyle.height : 88;
  return height + extra;
}

/** Pointy-top honeycomb path — Bridge Hive FAB silhouette (not a disc). */
function honeycombPath(size: number, inset = 1.5): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = ((Math.PI / 180) * (60 * i - 30));
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return `M${pts[0].x} ${pts[0].y} ${pts
    .slice(1)
    .map((p) => `L${p.x} ${p.y}`)
    .join(' ')} Z`;
}

/** Bar outline with a rounded U-shaped notch that cradles the center button. */
function barPath(
  w: number,
  h: number,
  cx: number,
  cy: number,
  nr: number,
  dy: number,
): string {
  const r = TOP_RADIUS;
  const shoulder = 18;
  const rise = 14;
  const top = dy;
  return [
    `M0 ${h + dy}`,
    `L0 ${r + top}`,
    `Q0 ${top} ${r} ${top}`,
    `L${cx - nr - shoulder} ${top}`,
    `C${cx - nr - shoulder * 0.5} ${top} ${cx - nr} ${cy - rise + top} ${cx - nr} ${cy + top}`,
    `A${nr} ${nr} 0 0 0 ${cx + nr} ${cy + top}`,
    `C${cx + nr} ${cy - rise + top} ${cx + nr + shoulder * 0.5} ${top} ${cx + nr + shoulder} ${top}`,
    `L${w - r} ${top}`,
    `Q${w} ${top} ${w} ${r + top}`,
    `L${w} ${h + dy}`,
    'Z',
  ].join(' ');
}

export function TabBarBackground() {
  const m = useTabMetrics();
  const cx = m.width / 2;

  const fill = useMemo(
    () => barPath(m.width, m.barHeight, cx, m.fabCenterY, m.notchRadius, SHADOW_BLEED),
    [cx, m.barHeight, m.fabCenterY, m.notchRadius, m.width],
  );
  return (
    <View
      pointerEvents="none"
      style={[styles.bgRoot, { top: -SHADOW_BLEED, height: m.barHeight + SHADOW_BLEED }]}
    >
      <Svg width={m.width} height={m.barHeight + SHADOW_BLEED}>
        <Defs>
          <SvgGradient id="tabBarFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#123A5C" />
            <Stop offset="1" stopColor="#0B2A43" />
          </SvgGradient>
        </Defs>
        <Path d={fill} fill="url(#tabBarFill)" />
        <Path d={fill} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth={1} />
      </Svg>
    </View>
  );
}

type AnimatedTabIconProps = {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  accent?: TabAccent;
  /** `fab` renders the raised honey button that sits in the bar notch. */
  variant?: 'default' | 'fab';
  /** Bump to trigger a one-shot spin on the FAB disc. */
  spinTick?: number;
};

export function AnimatedTabIcon({
  focused,
  icon,
  iconFocused,
  variant = 'default',
  spinTick = 0,
}: AnimatedTabIconProps) {
  const reduced = useReducedMotion();
  const m = useTabMetrics();
  const progress = useSharedValue(focused ? 1 : 0);
  const shine = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    progress.value = reduced
      ? focused
        ? 1
        : 0
      : withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress, reduced]);

  useEffect(() => {
    if (variant !== 'fab' || reduced) {
      shine.value = 0;
      return;
    }
    shine.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [reduced, shine, variant]);

  useEffect(() => {
    if (variant !== 'fab' || reduced || spinTick <= 0) return;
    spin.value = 0;
    spin.value = withTiming(360, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    });
  }, [reduced, spin, spinTick, variant]);

  const bounce = useSharedValue(1);
  const idleBreath = useSharedValue(reduced ? 0.5 : 0);

  useEffect(() => {
    if (variant === 'fab' || reduced || !focused) return;
    bounce.value = withSequence(
      withSpring(1.16, { damping: 10, stiffness: 420 }),
      withSpring(1, { damping: 14, stiffness: 260 }),
    );
  }, [bounce, focused, reduced, variant]);

  useEffect(() => {
    if (variant === 'fab' || reduced) {
      idleBreath.value = 0.5;
      return;
    }
    if (focused) {
      idleBreath.value = withTiming(0.5, { duration: 200 });
      return;
    }
    idleBreath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [focused, idleBreath, reduced, variant]);

  const wellStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale:
          bounce.value *
          interpolate(progress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP),
      },
    ],
  }));
  const wellGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.55], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.7, 1.08], Extrapolation.CLAMP) },
    ],
  }));
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.15, 1], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [4, 0], Extrapolation.CLAMP) },
    ],
  }));
  const outlineGlyphStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          idleBreath.value,
          [0, 1],
          [0.6, -0.6],
          Extrapolation.CLAMP,
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [1, 0.86], Extrapolation.CLAMP) },
    ],
  }));
  const filledGlyphStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [3, 0], Extrapolation.CLAMP) },
      {
        scale:
          bounce.value *
          interpolate(progress.value, [0, 1], [0.82, 1], Extrapolation.CLAMP),
      },
    ],
  }));
  const fabShellStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(progress.value, [0, 1], [0.36, 0.52], Extrapolation.CLAMP),
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.2, 0.8, 1], [0, 0.35, 0.35, 0]),
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-34, 60]) },
      { rotate: '20deg' },
    ],
  }));
  if (variant === 'fab') {
    // Logo-forward honeycomb — brand mark sits on a hex shell, not a honey disc.
    const markSize = Math.round(m.fabSize * 0.62);
    const hexOuter = honeycombPath(m.fabSize, 1);
    const hexInner = honeycombPath(m.fabSize, 6);
    const hexCore = honeycombPath(m.fabSize, 11);
    return (
      <View
        style={{ width: m.fabSize, height: m.fabSize, transform: [{ translateY: m.fabLift }] }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            styles.fabShadow,
            { width: m.fabSize, height: m.fabSize },
            fabShellStyle,
          ]}
        >
          <Svg width={m.fabSize} height={m.fabSize} style={StyleSheet.absoluteFillObject}>
            <Defs>
              <SvgGradient id="fabHoney" x1="0.15" y1="0" x2="0.85" y2="1">
                <Stop offset="0" stopColor="#FFE08A" />
                <Stop offset="0.45" stopColor="#FFCB45" />
                <Stop offset="1" stopColor="#F59E0B" />
              </SvgGradient>
              <SvgGradient id="fabHoneyEdge" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="rgba(255,255,255,0.55)" />
                <Stop offset="1" stopColor="rgba(180, 100, 0, 0.35)" />
              </SvgGradient>
            </Defs>
            <Path d={hexOuter} fill="url(#fabHoney)" />
            <Path d={hexCore} fill="rgba(255,255,255,0.16)" />
            <Path
              d={hexOuter}
              fill="none"
              stroke="url(#fabHoneyEdge)"
              strokeWidth={2}
            />
            <Path
              d={hexInner}
              fill="none"
              stroke="rgba(11, 42, 67, 0.16)"
              strokeWidth={1.25}
            />
          </Svg>
          <View style={styles.fabMarkWrap}>
            <BridgeHiveMark variant="boot" size={markSize} style={styles.fabMark} />
          </View>
          {!reduced ? (
            <Animated.View pointerEvents="none" style={[styles.fabShine, shineStyle]} />
          ) : null}
        </Animated.View>
      </View>
    );
  }

  const wellSize = Math.max(m.highlightWidth, GLYPH_BOX + HIGHLIGHT_PAD + 2);

  return (
    <View
      style={styles.iconCol}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.iconBox, { width: wellSize, height: wellSize }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wellGlow,
            {
              width: wellSize + 10,
              height: wellSize + 10,
              borderRadius: (wellSize + 10) * 0.34,
            },
            wellGlowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.iconWell,
            {
              width: wellSize,
              height: wellSize,
              borderRadius: wellSize * 0.34,
            },
            wellStyle,
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={focused ? WELL_GRADIENT : [WELL_IDLE, WELL_IDLE]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: wellSize * 0.34 }]}
          />
          {!focused ? (
            <View
              pointerEvents="none"
              style={[
                styles.wellIdleRing,
                { borderRadius: wellSize * 0.34 },
              ]}
            />
          ) : null}
          <View style={styles.glyphStack}>
            <Animated.View style={[styles.glyphLayer, outlineGlyphStyle]}>
              <Ionicons name={icon} size={m.iconGlyph} color={INACTIVE} />
            </Animated.View>
            <Animated.View style={[styles.glyphLayer, filledGlyphStyle]}>
              <Ionicons name={iconFocused} size={m.iconGlyph} color={ACTIVE} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <LinearGradient
          colors={['#FFE08A', INDICATOR, '#F59E0B']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

export function AnimatedTabLabel({
  focused,
  children,
  compactLabel,
}: {
  focused: boolean;
  children: string;
  accent?: TabAccent;
  /** Shorter label used when tab slots are tight. */
  compactLabel?: string;
}) {
  const reduced = useReducedMotion();
  const m = useTabMetrics();
  const label = m.useShortLabels && compactLabel ? compactLabel : children;
  const hidden = m.focusedLabelOnly && !focused;
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = reduced
      ? focused
        ? 1
        : 0
      : withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress, reduced]);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.72, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [2, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) },
    ],
  }));

  if (hidden) {
    return <View style={{ height: 0 }} />;
  }

  return (
    <Animated.Text
      style={[
        styles.label,
        labelStyle,
        {
          color: focused ? ACTIVE : INACTIVE,
          fontSize: m.labelSize,
          lineHeight: m.labelLine,
          maxWidth: Math.max(m.slotWidth - 10, 44),
          fontFamily: focused ? typography.fonts.displaySemibold : typography.fonts.semibold,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      allowFontScaling={false}
    >
      {label}
    </Animated.Text>
  );
}

type SideTabChrome = {
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

/** Map tab href → single icon pair (avoids Navigation stacking outline+filled glyphs). */
function resolveSideTabChrome(href: BottomTabBarButtonProps['href']): SideTabChrome | null {
  if (typeof href !== 'string') return null;
  if (/(?:^|\/)shifts(?:\/|$|\?)/.test(href)) {
    return { icon: 'calendar-clear-outline', iconFocused: 'calendar' };
  }
  if (/(?:^|\/)payments(?:\/|$|\?)/.test(href)) {
    return { icon: 'cash-outline', iconFocused: 'cash' };
  }
  if (/(?:^|\/)profile(?:\/|$|\?)/.test(href)) {
    return { icon: 'apps-outline', iconFocused: 'apps' };
  }
  // Home is the tabs index: "/", "/(tabs)", "/(tabs)/", etc. — not other named routes.
  if (
    href === '/' ||
    href === '/(tabs)' ||
    href === '/(tabs)/' ||
    /(?:^|\/)\(tabs\)\/?$/.test(href) ||
    /(?:^|\/)index(?:\/|$|\?)/.test(href)
  ) {
    return { icon: 'home-outline', iconFocused: 'home' };
  }
  return null;
}

function isFabTabHref(href: BottomTabBarButtonProps['href']): boolean {
  if (typeof href !== 'string') return false;
  return /(?:^|\/)work(?:\/|$|\?)/.test(href);
}

export function AnimatedTabButton({
  children,
  onPress,
  onLongPress,
  style,
  href,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  ...rest
}: BottomTabBarButtonProps) {
  const reduced = useReducedMotion();
  const m = useTabMetrics();
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const isFab = isFabTabHref(href);
  const focused = Boolean(accessibilityState?.selected);
  const sideChrome = !isFab ? resolveSideTabChrome(href) : null;
  const [fabSpinTick, setFabSpinTick] = useState(0);
  const labelText =
    typeof accessibilityLabel === 'string' && accessibilityLabel.trim().length > 0
      ? accessibilityLabel
      : null;

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  return (
    <PlatformPressable
      {...rest}
      href={href}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      onPressIn={() => {
        if (reduced) return;
        if (isFab) {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 480 });
          lift.value = withSpring(2, { damping: 16, stiffness: 420 });
          return;
        }
        scale.value = withSpring(0.92, { damping: 16, stiffness: 480 });
        lift.value = withSpring(1.5, { damping: 16, stiffness: 420 });
      }}
      onPressOut={() => {
        if (isFab) {
          scale.value = withSequence(
            withSpring(1.04, { damping: 12, stiffness: 360 }),
            withSpring(1, SPRING),
          );
          lift.value = withSpring(0, SPRING);
          return;
        }
        scale.value = withSequence(
          withSpring(1.06, { damping: 12, stiffness: 380 }),
          withSpring(1, SPRING),
        );
        lift.value = withSpring(0, SPRING);
      }}
      onPress={(e) => {
        if (isFab && !reduced) {
          setFabSpinTick((tick) => tick + 1);
        }
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => undefined);
        }
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      // FAB slot: kill the default tab plate so only the honey disc reads as the control.
      style={[style, isFab ? styles.fabPressable : null]}
      pressOpacity={1}
      pressColor="transparent"
    >
      <Animated.View
        style={[
          styles.tabButtonInner,
          { minHeight: m.buttonMinHeight },
          isFab ? styles.fabSlotInner : styles.sideTabInner,
          pressStyle,
        ]}
      >
        {isFab ? (
          // One FAB only — skip Navigation’s stacked focused+unfocused icon children.
          <AnimatedTabIcon
            variant="fab"
            focused={focused}
            spinTick={fabSpinTick}
            icon="briefcase-outline"
            iconFocused="briefcase"
          />
        ) : sideChrome && labelText ? (
          // One icon + one label column — no stacked glyphs, no indicator/text overlap.
          <>
            <AnimatedTabIcon
              focused={focused}
              icon={sideChrome.icon}
              iconFocused={sideChrome.iconFocused}
            />
            <AnimatedTabLabel focused={focused}>{labelText}</AnimatedTabLabel>
          </>
        ) : (
          children
        )}
      </Animated.View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  iconCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: ICON_COL_GAP,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 169, 181, 0.35)',
  },
  iconWell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  wellIdleRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(143, 169, 196, 0.28)',
  },
  glyphStack: {
    width: GLYPH_BOX,
    height: GLYPH_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 16,
    height: INDICATOR_HEIGHT,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: INDICATOR_MARGIN_TOP,
  },
  fabShadow: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 10,
  },
  fabMarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMark: {
    // Keep the official mark shape — do not force a circular crop over the logo.
  },
  fabShine: {
    position: 'absolute',
    top: -14,
    bottom: -14,
    width: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  label: {
    letterSpacing: 0.1,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: LABEL_MARGIN_TOP,
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
  sideTabInner: {
    flexDirection: 'column',
    gap: SIDE_TAB_GAP,
    overflow: 'visible',
  },
  fabPressable: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    // No filled hit-plate behind the floating disc (esp. on web focus/selected).
    borderRadius: 0,
  },
  fabSlotInner: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
});
