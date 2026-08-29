import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
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

import { colors, radii, typography } from '@/constants/theme';

export type TabAccent = {
  solid: string;
  soft: string;
  indicator: string;
};

/** Accents tuned for the dark navy tab surface — navy + yellow only */
export const TAB_ACCENTS = {
  home: { solid: colors.yellow, soft: 'rgba(245,176,0,0.16)', indicator: colors.yellow },
  shifts: { solid: '#E8EEF6', soft: 'rgba(255,255,255,0.1)', indicator: colors.yellow },
  community: { solid: colors.yellow, soft: 'rgba(245,176,0,0.14)', indicator: colors.yellow },
  finances: { solid: '#E8EEF6', soft: 'rgba(255,255,255,0.1)', indicator: colors.yellow },
  profile: { solid: '#E8EEF6', soft: 'rgba(255,255,255,0.1)', indicator: colors.yellow },
} as const;

const INACTIVE = 'rgba(255,255,255,0.42)';

type AnimatedTabIconProps = {
  focused: boolean;
  title: string;
  shortTitle: string;
  compact: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  accent: TabAccent;
};

const FOCUS_TIMING = { duration: 180, easing: Easing.out(Easing.cubic) };

export function TabBarBackground() {
  return (
    <View style={styles.bgRoot} pointerEvents="none">
      <LinearGradient
        colors={['#071A2F', '#0E2A47', '#123A5C']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft wash */}
      <LinearGradient
        colors={['rgba(245,176,0,0.12)', 'rgba(18,58,92,0)', 'rgba(245,176,0,0.08)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Premium hairline + gold accent edge */}
      <View style={styles.topEdge}>
        <LinearGradient
          colors={['transparent', 'rgba(245,176,0,0.55)', 'rgba(255,255,255,0.2)', 'rgba(245,176,0,0.45)', 'transparent']}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goldLine}
        />
      </View>
      <View style={styles.innerSheen} />
    </View>
  );
}

export function AnimatedTabIcon({
  focused,
  title,
  shortTitle,
  compact,
  icon,
  iconFocused,
  accent,
}: AnimatedTabIconProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, FOCUS_TIMING);
  }, [focused, progress]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.04], Extrapolation.CLAMP) }],
    backgroundColor: focused ? accent.soft : 'transparent',
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.tabItem, compact && styles.tabItemCompact]}>
      <Animated.View style={[styles.iconShell, compact && styles.iconShellCompact, shellStyle]}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={compact ? 18 : 20}
          color={focused ? accent.solid : INACTIVE}
        />
      </Animated.View>
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          { color: focused ? accent.solid : INACTIVE },
          focused && styles.labelActive,
        ]}
        numberOfLines={1}
      >
        {compact ? shortTitle : title}
      </Text>
      <Animated.View
        style={[styles.indicator, { backgroundColor: accent.indicator }, indicatorStyle]}
      />
    </View>
  );
}

export function AnimatedTabButton({
  children,
  onPress,
  onLongPress,
  style,
  href,
  ...rest
}: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...rest}
      href={href}
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
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  goldLine: {
    flex: 1,
  },
  innerSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 96,
    gap: 3,
  },
  tabItemCompact: {
    maxWidth: 76,
    gap: 2,
  },
  iconShell: {
    width: 44,
    height: 30,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellCompact: {
    width: 36,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 9,
  },
  labelActive: {
    fontFamily: typography.fonts.semibold,
  },
  indicator: {
    height: 3,
    width: 16,
    borderRadius: 2,
    marginTop: 1,
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
