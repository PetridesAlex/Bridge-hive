import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, typography } from '@/constants/theme';

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

const FOCUS_TIMING = {
  duration: motion.duration.normal,
  easing: Easing.out(Easing.cubic),
};

export function TabBarBackground() {
  return (
    <View style={styles.bgRoot} pointerEvents="none">
      <View style={styles.bgFill} />
      <View style={styles.topEdge} />
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
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, FOCUS_TIMING);
  }, [focused, progress]);

  const shellStyle = useAnimatedStyle(() => ({
    backgroundColor: focused ? accent.soft : 'transparent',
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View
      style={styles.tabItem}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.iconShell, shellStyle]}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={20}
          color={focused ? accent.solid : INACTIVE}
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
        { color: focused ? accent.solid : INACTIVE },
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
  return (
    <PlatformPressable
      {...rest}
      href={href}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => undefined);
        }
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      style={style}
      pressOpacity={0.85}
      pressColor="transparent"
    >
      <View style={styles.tabButtonInner}>{children}</View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    minHeight: 26,
  },
  iconShell: {
    width: 36,
    height: 24,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    marginTop: 1,
  },
  labelActive: {
    fontFamily: typography.fonts.semibold,
  },
  indicator: {
    height: 2,
    width: 14,
    borderRadius: 1,
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 48,
  },
});
