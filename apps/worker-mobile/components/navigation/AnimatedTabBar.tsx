import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type TabAccent = {
  solid: string;
  soft: string;
  gradient: [string, string, string];
  indicator: string;
};

export const TAB_ACCENTS = {
  home: {
    solid: colors.navy,
    soft: 'rgba(11, 42, 67, 0.08)',
    gradient: [colors.navy, '#0C3E56', colors.tealStrong] as [string, string, string],
    indicator: colors.yellow,
  },
  shifts: {
    solid: colors.tealStrong,
    soft: 'rgba(20, 169, 181, 0.12)',
    gradient: ['#0E6670', colors.tealStrong, '#14A9B5'] as [string, string, string],
    indicator: colors.tealStrong,
  },
  work: {
    solid: colors.honeyStrong,
    soft: 'rgba(212, 148, 36, 0.14)',
    gradient: ['#A86B10', colors.honeyStrong, '#E0B24A'] as [string, string, string],
    indicator: colors.honeyStrong,
  },
  finances: {
    solid: colors.success,
    soft: 'rgba(25, 135, 84, 0.12)',
    gradient: ['#0F5132', '#146C43', colors.success] as [string, string, string],
    indicator: colors.success,
  },
  more: {
    solid: colors.navyLift,
    soft: 'rgba(18, 58, 92, 0.1)',
    gradient: [colors.navyLift, '#1B4F72', colors.teal] as [string, string, string],
    indicator: colors.navy,
  },
} as const;

const INACTIVE = '#455A6A';
const SPRING = { damping: 18, stiffness: 280, mass: 0.75 };
const TAB_COUNT = 5;

type Density = 'narrow' | 'regular' | 'wide';

type TabMetrics = {
  density: Density;
  sideInset: number;
  radius: number;
  barHeight: number;
  topPad: number;
  bottomPad: number;
  marginBottom: number;
  slotWidth: number;
  iconSize: number;
  iconGlyph: number;
  iconGlyphFocus: number;
  iconRadius: number;
  lift: number;
  labelSize: number;
  labelLine: number;
  gap: number;
  /** Prefer short labels when slots are tight. */
  useShortLabels: boolean;
  /** Hide inactive labels; show label only on the focused tab. */
  focusedLabelOnly: boolean;
  buttonMinHeight: number;
};

function useTabMetrics(): TabMetrics {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const sideInset = width < 360 ? 6 : width < 400 ? 8 : width < 440 ? 10 : 14;
    const slotWidth = (width - sideInset * 2) / TAB_COUNT;
    const density: Density =
      slotWidth < 70 ? 'narrow' : slotWidth < 84 ? 'regular' : 'wide';

    const bottomPad = Math.max(insets.bottom, density === 'narrow' ? 6 : 8);
    const topPad = density === 'wide' ? 10 : density === 'regular' ? 8 : 6;
    const contentHeight = density === 'narrow' ? 58 : density === 'regular' ? 64 : 72;

    const iconSize = density === 'narrow' ? 30 : density === 'regular' ? 34 : 40;
    const labelSize = density === 'narrow' ? 10 : density === 'regular' ? 11 : 12;

    return {
      density,
      sideInset,
      radius: density === 'narrow' ? 18 : density === 'regular' ? 22 : 26,
      barHeight: contentHeight + topPad + bottomPad,
      topPad,
      bottomPad,
      marginBottom: insets.bottom > 0 ? 0 : density === 'wide' ? 10 : 8,
      slotWidth,
      iconSize,
      iconGlyph: density === 'narrow' ? 16 : density === 'regular' ? 17 : 20,
      iconGlyphFocus: density === 'narrow' ? 17 : density === 'regular' ? 18 : 21,
      iconRadius: Math.round(iconSize * 0.3),
      lift: density === 'narrow' ? -2 : density === 'regular' ? -3 : -4,
      labelSize,
      labelLine: labelSize + 2,
      gap: density === 'narrow' ? 2 : 3,
      useShortLabels: slotWidth < 82,
      focusedLabelOnly: slotWidth < 68,
      buttonMinHeight: contentHeight - 2,
    };
  }, [insets.bottom, width]);
}

/** Adaptive tab bar chrome metrics for Expo Router Tabs `tabBarStyle`. */
export function useAdaptiveTabBarStyle() {
  const metrics = useTabMetrics();

  return useMemo(
    () => ({
      backgroundColor: colors.white,
      borderTopWidth: 0,
      borderTopColor: 'transparent',
      borderColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
      shadowColor: 'transparent',
      height: metrics.barHeight,
      paddingBottom: metrics.bottomPad,
      paddingTop: metrics.topPad,
      marginHorizontal: metrics.sideInset,
      marginBottom: metrics.marginBottom,
      borderRadius: metrics.radius,
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden' as const,
    }),
    [metrics],
  );
}

/** Extra scroll/list padding so content clears the floating absolute tab bar. */
export function useTabBarScrollInset(extra: number = spacing.lg): number {
  const tabBarStyle = useAdaptiveTabBarStyle();
  const height = typeof tabBarStyle.height === 'number' ? tabBarStyle.height : 88;
  const marginBottom =
    typeof tabBarStyle.marginBottom === 'number' ? tabBarStyle.marginBottom : 0;
  return height + marginBottom + extra;
}

export function TabBarBackground() {
  const reduced = useReducedMotion();
  const metrics = useTabMetrics();
  const sheen = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      sheen.value = 0.4;
      glow.value = 0.5;
      return;
    }
    sheen.value = withRepeat(
      withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [glow, reduced, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-140, 300]) }],
    opacity: 0.4,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.18, 0.4]),
  }));

  return (
    <View
      style={[styles.bgRoot, { borderRadius: metrics.radius }, shadows.md]}
      pointerEvents="none"
    >
      <View style={[StyleSheet.absoluteFill, styles.solidFill]} />
      <LinearGradient
        colors={['#FFFFFF', '#F7FBFD']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.ambientGlow, glowStyle]}>
        <LinearGradient
          colors={['rgba(20, 169, 181, 0.1)', 'transparent']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.65)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

type AnimatedTabIconProps = {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  accent: TabAccent;
};

export function AnimatedTabIcon({
  focused,
  icon,
  iconFocused,
  accent,
}: AnimatedTabIconProps) {
  const reduced = useReducedMotion();
  const metrics = useTabMetrics();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = reduced
      ? focused
        ? 1
        : 0
      : withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [1, 1.06], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(progress.value, [0, 1], [0, metrics.lift], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View
      style={[styles.tabItem, { gap: metrics.gap }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={shellStyle}>
        {focused ? (
          <LinearGradient
            colors={accent.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.iconShell,
              styles.iconShellFocused,
              {
                width: metrics.iconSize,
                height: metrics.iconSize,
                borderRadius: metrics.iconRadius,
              },
            ]}
          >
            <Ionicons
              name={iconFocused}
              size={metrics.iconGlyphFocus}
              color={colors.white}
            />
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.iconShell,
              {
                width: metrics.iconSize,
                height: metrics.iconSize,
                borderRadius: metrics.iconRadius,
                backgroundColor: accent.soft,
              },
            ]}
          >
            <Ionicons name={icon} size={metrics.iconGlyph} color={accent.solid} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export function AnimatedTabLabel({
  focused,
  children,
  accent,
  compactLabel,
}: {
  focused: boolean;
  children: string;
  accent: TabAccent;
  /** Shorter label used when tab slots are tight. */
  compactLabel?: string;
}) {
  const metrics = useTabMetrics();
  const reduced = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  const label =
    metrics.useShortLabels && compactLabel ? compactLabel : children;
  const hidden = metrics.focusedLabelOnly && !focused;

  useEffect(() => {
    progress.value = reduced
      ? focused
        ? 1
        : 0
      : withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress, reduced]);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: hidden ? 0 : 1,
    height: hidden ? 0 : metrics.labelLine,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0.5, 0], Extrapolation.CLAMP) },
    ],
  }));

  if (hidden) {
    return <Animated.View style={labelStyle} />;
  }

  return (
    <Animated.Text
      style={[
        styles.label,
        labelStyle,
        {
          color: focused ? accent.solid : INACTIVE,
          fontSize: metrics.labelSize,
          lineHeight: metrics.labelLine,
          maxWidth: Math.max(metrics.slotWidth - 6, 48),
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
  const metrics = useTabMetrics();
  const focused = Boolean(accessibilityState?.selected);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    scale.value = withSpring(focused ? 1.015 : 1, SPRING);
  }, [focused, reduced, scale]);

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
        scale.value = withSpring(0.94, { damping: 16, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(focused ? 1.015 : 1, SPRING);
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
        style={[
          styles.tabButtonInner,
          { minHeight: metrics.buttonMinHeight },
          pressStyle,
        ]}
      >
        {children}
      </Animated.View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 0,
  },
  solidFill: {
    backgroundColor: colors.white,
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  sheen: {
    position: 'absolute',
    top: -24,
    width: 100,
    height: 120,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShell: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellFocused: {
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    letterSpacing: 0.1,
    textAlign: 'center',
    alignSelf: 'center',
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
});
