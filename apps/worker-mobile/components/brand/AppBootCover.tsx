import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** White canvas for the launch cover. */
export const APP_BOOT_BG = '#FFFFFF';

/** @deprecated Prefer APP_BOOT_BG — kept for leftover imports. */
export const APP_BOOT_NAVY = APP_BOOT_BG;

/** Website marketing navy (`--m-navy`) for Bridge Hive wordmark. */
export const BRIDGE_HIVE_TEXT = '#0B2032';

/** Minimum time the launch cover stays visible. */
export const APP_BOOT_MIN_MS = 3800;

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
 * White launch cover — official icon + website-navy wordmark, both breathing.
 * System fonts keep every glyph visible even before custom fonts load.
 */
export function AppBootCover() {
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [breath, reducedMotion]);

  const logoMotion = useAnimatedStyle(() => {
    const t = breath.value;
    return {
      transform: [{ scale: interpolate(t, [0, 1], [1, 1.1]) }],
    };
  });

  const textMotion = useAnimatedStyle(() => {
    const t = breath.value;
    return {
      transform: [{ scale: interpolate(t, [0, 1], [1, 1.035]) }],
      opacity: interpolate(t, [0, 1], [0.9, 1]),
    };
  });

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel="Welcome to Bridge Hive"
    >
      <Animated.View style={[styles.logoWrap, logoMotion]}>
        <BridgeHiveMark size={140} />
      </Animated.View>

      <Animated.View style={[styles.copy, textMotion]}>
        <Text style={styles.welcome} allowFontScaling={false}>
          {'Welcome to'}
        </Text>
        <Text style={styles.brand} allowFontScaling={false}>
          {'Bridge Hive'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_BOOT_BG,
    paddingHorizontal: 24,
    overflow: 'visible',
  },
  logoWrap: {
    marginBottom: 40,
    padding: 16,
    overflow: 'visible',
  },
  copy: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'visible',
  },
  welcome: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '500' as const },
      android: { fontFamily: 'sans-serif-medium', fontWeight: '500' as const },
      default: { fontWeight: '500' as const },
    }),
    fontSize: 20,
    lineHeight: 32,
    color: '#5F6F79',
    textAlign: 'center',
    width: '100%',
  },
  brand: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '700' as const },
      android: { fontFamily: 'sans-serif-medium', fontWeight: '700' as const },
      default: { fontWeight: '700' as const },
    }),
    fontSize: 32,
    lineHeight: 44,
    color: BRIDGE_HIVE_TEXT,
    textAlign: 'center',
    width: '100%',
    marginTop: 4,
  },
});
