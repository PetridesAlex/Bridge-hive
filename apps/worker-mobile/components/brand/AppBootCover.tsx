import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Native splash–matched navy canvas for the launch cover. */
export const APP_BOOT_BG = '#071A2F';

/** @deprecated Prefer APP_BOOT_BG — kept for leftover imports. */
export const APP_BOOT_NAVY = APP_BOOT_BG;

/** Primary title color on navy. */
export const BRIDGE_HIVE_TEXT = '#FFFFFF';

/** Soft-blue subtitle — readable on `#071A2F` (contrast ≥ 4.5:1). */
export const BRIDGE_HIVE_SUBTITLE = '#A8C4E0';

/** Subtle gold rule accent. */
export const BRIDGE_HIVE_GOLD = '#D4A84B';

/** Minimum time the launch cover stays visible. */
export const APP_BOOT_MIN_MS = 800;

/**
 * Holds the launch cover until `ready` and the minimum boot duration have both elapsed.
 */
export function useLaunchGate(ready: boolean, minMs: number = APP_BOOT_MIN_MS): boolean {
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), minMs);
    return () => clearTimeout(timer);
  }, [minMs]);

  return ready && minElapsed;
}

/**
 * Navy launch cover — official mark + BridgeHive App lockup.
 * Continues the native splash without a white flash. One short entrance only.
 * System fonts keep every glyph visible even before custom fonts load.
 */
export function AppBootCover() {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reducedMotion]);

  const lockupMotion = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t,
      transform: [{ scale: 0.96 + 0.04 * t }],
    };
  });

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 24) + 48,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="BridgeHive App"
    >
      <StatusBar style="light" />
      <Animated.View style={[styles.lockup, lockupMotion]}>
        <View style={styles.logoWrap}>
          <BridgeHiveMark size={148} />
        </View>

        <Text style={styles.title} allowFontScaling={false}>
          {'BridgeHive App'}
        </Text>

        <View style={styles.goldRule} accessibilityElementsHidden importantForAccessibility="no" />

        <Text style={styles.subtitle} allowFontScaling={false}>
          {'Healthcare staffing, structured'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: APP_BOOT_BG,
    paddingHorizontal: 28,
  },
  lockup: {
    width: '100%',
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: 28,
  },
  title: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '700' as const },
      android: { fontFamily: 'sans-serif-medium', fontWeight: '700' as const },
      default: { fontWeight: '700' as const },
    }),
    fontSize: 28,
    lineHeight: 36,
    color: BRIDGE_HIVE_TEXT,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  goldRule: {
    width: 40,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: BRIDGE_HIVE_GOLD,
    opacity: 0.85,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 1,
  },
  subtitle: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '500' as const },
      android: { fontFamily: 'sans-serif', fontWeight: '500' as const },
      default: { fontWeight: '500' as const },
    }),
    fontSize: 16,
    lineHeight: 24,
    color: BRIDGE_HIVE_SUBTITLE,
    textAlign: 'center',
    maxWidth: 280,
  },
});
