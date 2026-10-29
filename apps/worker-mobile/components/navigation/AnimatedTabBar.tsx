import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
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
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

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
const FAB_GRADIENT: [string, string] = ['#FFCB45', '#F59E0B'];
const HIGHLIGHT_GRADIENT: [string, string] = ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.09)'];

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
const GLYPH_BOX = 26;
const HIGHLIGHT_PAD = 9;
const TOP_RADIUS = 30;
const SHADOW_BLEED = 6;
const CAPTION_WIDTH = 80;

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

    const topPad = 8;
    const contentHeight = density === 'narrow' ? 58 : 64;
    const bottomPad = Math.max(insets.bottom, 10);
    const labelSize = density === 'narrow' ? 11 : 12;
    const labelLine = labelSize + 3;
    const gap = 3;
    const fabSize = density === 'narrow' ? 46 : density === 'regular' ? 50 : 52;
    const fabCenterY = fabSize / 2 + 3;

    return {
      density,
      width,
      slotWidth,
      topPad,
      bottomPad,
      contentHeight,
      barHeight: topPad + contentHeight + bottomPad,
      buttonMinHeight: contentHeight,
      iconGlyph: density === 'narrow' ? 21 : 24,
      labelSize,
      labelLine,
      gap,
      highlightWidth: Math.min(slotWidth - 6, 70),
      highlightHeight: GLYPH_BOX + gap + labelLine + HIGHLIGHT_PAD * 2,
      fabSize,
      fabCenterY,
      fabLift: -(topPad + contentHeight / 2 - fabCenterY),
      notchRadius: fabSize / 2 + 5,
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
  const shoulder = 26;
  const rise = 20;
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
};

export function AnimatedTabIcon({
  focused,
  icon,
  iconFocused,
  variant = 'default',
}: AnimatedTabIconProps) {
  const reduced = useReducedMotion();
  const m = useTabMetrics();
  const progress = useSharedValue(focused ? 1 : 0);
  const glow = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    progress.value = reduced
      ? focused
        ? 1
        : 0
      : withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress, reduced]);

  useEffect(() => {
    if (variant !== 'fab' || reduced || !focused) {
      glow.value = 0;
      return;
    }
    glow.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    shine.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [focused, glow, reduced, shine, variant]);

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP) }],
  }));
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.3, 1], Extrapolation.CLAMP) }],
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -1], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.04], Extrapolation.CLAMP) },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) }],
  }));
  const fabScaleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.08], Extrapolation.CLAMP) },
    ],
    shadowOpacity: interpolate(progress.value, [0, 1], [0.4, 0.62], Extrapolation.CLAMP),
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.2, 0.8, 1], [0, 0.85, 0.85, 0]),
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-34, 60]) },
      { rotate: '20deg' },
    ],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-4, 0], Extrapolation.CLAMP) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.5]) }],
  }));

  if (variant === 'fab') {
    const disc = m.notchRadius * 2;
    return (
      <View
        style={{ width: m.fabSize, height: m.fabSize, transform: [{ translateY: m.fabLift }] }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fabBackdrop,
            {
              width: disc,
              height: disc,
              borderRadius: disc / 2,
              left: (m.fabSize - disc) / 2,
              top: (m.fabSize - disc) / 2,
            },
            backdropStyle,
          ]}
        >
          <LinearGradient
            colors={['#FFF4D6', '#FFE2A0']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {focused && !reduced ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fabRing,
              { width: m.fabSize, height: m.fabSize, borderRadius: m.fabSize / 2 },
              ringStyle,
            ]}
          />
        ) : null}
        <Animated.View
          style={[styles.fabShadow, { borderRadius: m.fabSize / 2 }, glyphStyle, fabScaleStyle]}
        >
          <LinearGradient
            colors={focused ? ['#FFD25A', '#F08C00'] : FAB_GRADIENT}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[
              styles.fab,
              { width: m.fabSize, height: m.fabSize, borderRadius: m.fabSize / 2 },
            ]}
          >
            <Ionicons name={focused ? iconFocused : icon} size={24} color={colors.white} />
            {!reduced ? (
              <Animated.View pointerEvents="none" style={[styles.fabShine, shineStyle]} />
            ) : null}
          </LinearGradient>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fabCaptionWrap,
            { top: m.fabSize + 8, left: -(CAPTION_WIDTH - m.fabSize) / 2 },
            captionStyle,
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[styles.fabCaption, { fontSize: m.labelSize }]}
          >
            My shifts
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={styles.iconBox}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            width: m.highlightWidth,
            height: m.highlightHeight,
            left: (GLYPH_BOX - m.highlightWidth) / 2,
            top: -HIGHLIGHT_PAD,
          },
          highlightStyle,
        ]}
      >
        <LinearGradient
          colors={HIGHLIGHT_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      </Animated.View>
      <Animated.View style={glyphStyle}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={m.iconGlyph}
          color={focused ? ACTIVE : INACTIVE}
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
  const m = useTabMetrics();
  const label = m.useShortLabels && compactLabel ? compactLabel : children;
  const hidden = m.focusedLabelOnly && !focused;

  if (hidden) {
    return <View style={{ height: 0 }} />;
  }

  return (
    <Animated.Text
      style={[
        styles.label,
        {
          color: focused ? ACTIVE : INACTIVE,
          fontSize: m.labelSize,
          lineHeight: m.labelLine,
          maxWidth: Math.max(m.slotWidth - 6, 48),
          fontFamily: focused ? typography.fonts.displaySemibold : typography.fonts.semibold,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      allowFontScaling={false}
    >
      {label}
    </Animated.Text>
  );
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

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
        scale.value = withSpring(0.93, { damping: 16, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => undefined);
        }
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      style={style}
      pressOpacity={1}
      pressColor="transparent"
    >
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(240)}
        style={[styles.tabButtonInner, { minHeight: m.buttonMinHeight }, pressStyle]}
      >
        {children}
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
  iconBox: {
    width: GLYPH_BOX,
    height: GLYPH_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  indicator: {
    width: 26,
    height: 3,
    borderRadius: 2,
    marginBottom: 5,
    backgroundColor: INDICATOR,
  },
  fabShadow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBackdrop: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: '#F5B21A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  fabShine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  fabCaptionWrap: {
    position: 'absolute',
    width: CAPTION_WIDTH,
    alignItems: 'center',
  },
  fabCaption: {
    textAlign: 'center',
    fontFamily: typography.fonts.displaySemibold,
    letterSpacing: 0.1,
    color: ACTIVE,
  },
  fabRing: {
    position: 'absolute',
    backgroundColor: '#F59E0B',
  },
  label: {
    letterSpacing: 0.1,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 3,
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
});
