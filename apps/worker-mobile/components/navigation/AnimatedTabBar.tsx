import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type TabAccent = {
  solid: string;
  soft: string;
  indicator: string;
};

/** Selected = teal icon/text + small honey/navy indicator (not color alone). */
const TEAL_ACCENT: TabAccent = {
  solid: colors.tealStrong,
  soft: colors.tealSoft,
  indicator: colors.yellow,
};

export const TAB_ACCENTS = {
  home: TEAL_ACCENT,
  shifts: TEAL_ACCENT,
  work: TEAL_ACCENT,
  finances: TEAL_ACCENT,
  more: TEAL_ACCENT,
} as const;

const INACTIVE = colors.textMuted;

type AnimatedTabIconProps = {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  accent: TabAccent;
};

const SPRING = { damping: 16, stiffness: 260 };

export function TabBarBackground() {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      drift.value = 0.35;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [drift, reduced]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.55,
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-120, 280]) },
      { rotate: '-18deg' },
    ],
  }));

  return (
    <View style={styles.bgRoot} pointerEvents="none">
      <LinearGradient
        colors={['#F3F8FC', '#FFFFFF', '#E7F4F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(22,166,182,0.18)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <LinearGradient
        colors={[colors.navy, colors.tealStrong, colors.yellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topEdge}
      />
    </View>
  );
}

/** Icon + indicator — labels use tabBarLabel so RN allocates width correctly. */
export function AnimatedTabIcon({
  focused,
  icon,
  iconFocused,
  accent,
}: AnimatedTabIconProps) {
  const reduced = useReducedMotion();
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
      { scale: interpolate(progress.value, [0, 1], [1, 1.06], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [0, -1], Extrapolation.CLAMP) },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.3, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View
      style={styles.tabItem}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.iconShell, shellStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
          <LinearGradient
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={18}
          color={focused ? colors.white : INACTIVE}
        />
      </Animated.View>
      <Animated.View
        style={[styles.indicator, { backgroundColor: accent.indicator }, indicatorStyle]}
      />
    </View>
  );
}

export function AnimatedTabLabel({
  focused,
  children,
  accent,
}: {
  focused: boolean;
  children: string;
  accent: TabAccent;
}) {
  return (
    <Text
      style={[
        styles.label,
        { color: focused ? colors.navy : INACTIVE },
        focused && styles.labelActive,
      ]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {children}
    </Text>
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
  const focused = Boolean(accessibilityState?.selected);
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
        scale.value = withSpring(0.92, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(focused ? 1.02 : 1, SPRING);
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
      <Animated.View style={[styles.tabButtonInner, pressStyle]}>{children}</Animated.View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#F7FBFE',
  },
  sheen: {
    position: 'absolute',
    top: -20,
    width: 90,
    height: 110,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 28,
  },
  iconShell: {
    width: 40,
    height: 28,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 1,
  },
  labelActive: {
    fontFamily: typography.fonts.displaySemibold,
  },
  indicator: {
    height: 3,
    width: 16,
    borderRadius: 2,
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 48,
  },
});
