import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
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

/** Navy canvas matching the native splash — no white flash. */
export const APP_BOOT_BG = '#071A2F';

/** @deprecated Prefer APP_BOOT_BG — kept for leftover imports. */
export const APP_BOOT_NAVY = APP_BOOT_BG;

/** Short minimum so the cover does not flash without holding the user artificially. */
export const APP_BOOT_MIN_MS = 800;

/** Show a quiet indicator only when session restore is slow. */
export const APP_BOOT_SLOW_MS = 2500;

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

type AppBootCoverProps = {
  /** When true, show a quiet spinner after APP_BOOT_SLOW_MS. */
  showSlowIndicator?: boolean;
};

/**
 * Navy launch cover — official mark + preparing copy, subtle breathing.
 * System fonts keep every glyph visible even before custom fonts load.
 */
export function AppBootCover({ showSlowIndicator = false }: AppBootCoverProps) {
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!showSlowIndicator) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), APP_BOOT_SLOW_MS);
    return () => clearTimeout(timer);
  }, [showSlowIndicator]);

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
    if (reducedMotion) {
      return { transform: [{ scale: 1 }], opacity: 1 };
    }
    const t = breath.value;
    return {
      transform: [{ scale: interpolate(t, [0, 1], [1, 1.06]) }],
      opacity: interpolate(t, [0, 1], [0.92, 1]),
    };
  });

  const glowMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.22 };
    }
    const t = breath.value;
    return {
      opacity: interpolate(t, [0, 1], [0.16, 0.32]),
      transform: [{ scale: interpolate(t, [0, 1], [0.92, 1.08]) }],
    };
  });

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel="Preparing your workspace"
    >
      <Animated.View pointerEvents="none" style={[styles.glowBlue, glowMotion]} />
      <Animated.View pointerEvents="none" style={[styles.glowGold, glowMotion]} />

      <Animated.View style={[styles.logoWrap, logoMotion]}>
        <BridgeHiveMark size={128} />
      </Animated.View>

      <Text style={styles.copy} allowFontScaling={false}>
        Preparing your workspace
      </Text>

      {slow ? (
        <ActivityIndicator
          style={styles.slow}
          color="rgba(228, 179, 52, 0.85)"
          accessibilityLabel="Still restoring your session"
        />
      ) : null}
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
    overflow: 'hidden',
  },
  glowBlue: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(20, 169, 181, 0.22)',
    top: '28%',
  },
  glowGold: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(228, 179, 52, 0.14)',
    top: '36%',
    left: '18%',
  },
  logoWrap: {
    marginBottom: 28,
    padding: 12,
    overflow: 'visible',
  },
  copy: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '500' as const },
      android: { fontFamily: 'sans-serif-medium', fontWeight: '500' as const },
      default: { fontWeight: '500' as const },
    }),
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: 'rgba(247, 251, 253, 0.88)',
    textAlign: 'center',
    width: '100%',
  },
  slow: {
    marginTop: 28,
  },
});
