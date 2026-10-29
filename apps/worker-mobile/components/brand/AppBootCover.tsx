import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  APP_BOOT_MIN_MS,
  canDismissWorkspacePreparation,
  WORKSPACE_PREPARATION_MINIMUM_MS,
} from '@/lib/workspace-preparation';

/** Navy canvas matching the native splash — no white flash. */
export const APP_BOOT_BG = '#071A2F';

/** @deprecated Prefer APP_BOOT_BG — kept for leftover imports. */
export const APP_BOOT_NAVY = APP_BOOT_BG;

/**
 * Mark width matching app.json expo-splash-screen imageWidth so the
 * native splash → JS cover handoff does not shrink the icon.
 */
export const APP_BOOT_MARK_SIZE = 220;

export {
  APP_BOOT_MIN_MS,
  WORKSPACE_PREPARATION_MINIMUM_MS,
  canDismissWorkspacePreparation,
};

/** Show refined progress after this delay when bootstrap is still running. */
export const APP_BOOT_SLOW_MS = 1800;

/**
 * Holds the launch cover until `ready` and the minimum boot duration have both elapsed.
 */
export function useLaunchGate(ready: boolean, minMs: number = APP_BOOT_MIN_MS): boolean {
  const [minElapsed, setMinElapsed] = useState(minMs <= 0);

  useEffect(() => {
    if (minMs <= 0) {
      setMinElapsed(true);
      return;
    }
    setMinElapsed(false);
    const timer = setTimeout(() => setMinElapsed(true), minMs);
    return () => clearTimeout(timer);
  }, [minMs]);

  return canDismissWorkspacePreparation({ ready, minElapsed });
}

type AppBootCoverProps = {
  /** When true, keep the progress treatment visible (bootstrap still running). */
  showSlowIndicator?: boolean;
  /** Non-sensitive bootstrap failure — show Retry without leaking session details. */
  bootstrapError?: boolean;
  onRetryBootstrap?: () => void;
};

function PreparationProgress({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const pulse = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion || !active) {
      pulse.value = reducedMotion ? 1 : 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, pulse, reducedMotion]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.45 : interpolate(pulse.value, [0, 1], [0.25, 0.85]),
    transform: [{ scaleX: reducedMotion ? 1 : interpolate(pulse.value, [0, 1], [0.55, 1]) }],
  }));

  const dotA = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.7 : interpolate(pulse.value, [0, 1], [0.35, 1]),
  }));
  const dotB = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? 0.55
      : interpolate(pulse.value, [0, 0.5, 1], [0.25, 1, 0.35]),
  }));
  const dotC = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.4 : interpolate(pulse.value, [0, 1], [1, 0.3]),
  }));

  if (!active) return null;

  return (
    <View style={styles.progressBlock} accessibilityElementsHidden>
      <Animated.View style={[styles.progressLine, lineStyle]} />
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, dotA]} />
        <Animated.View style={[styles.dot, dotB]} />
        <Animated.View style={[styles.dot, dotC]} />
      </View>
    </View>
  );
}

/**
 * Navy launch cover — official mark + preparing copy, subtle breathing.
 * System fonts keep every glyph visible even before custom fonts load.
 * Mark size matches the native splash imageWidth for a seamless handoff.
 */
export function AppBootCover({
  showSlowIndicator = false,
  bootstrapError = false,
  onRetryBootstrap,
}: AppBootCoverProps) {
  const reducedMotion = useReducedMotion();
  const settle = useSharedValue(reducedMotion ? 1 : 0);
  const breath = useSharedValue(0);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (bootstrapError) {
      setShowProgress(false);
      return;
    }
    // Show refined progress during the preparation stage (not spinner-only).
    const delay = showSlowIndicator ? APP_BOOT_SLOW_MS : 400;
    const timer = setTimeout(() => setShowProgress(true), delay);
    return () => clearTimeout(timer);
  }, [bootstrapError, showSlowIndicator]);

  useEffect(() => {
    if (reducedMotion) {
      settle.value = 1;
      breath.value = 1;
      return;
    }
    // Soft settle from splash scale → calm rest, then breathe.
    settle.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    breath.value = withDelay(
      720,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [breath, reducedMotion, settle]);

  const logoMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [{ scale: 1 }], opacity: 1 };
    }
    const settledScale = interpolate(settle.value, [0, 1], [1, 0.82]);
    const breathScale = interpolate(breath.value, [0, 1], [1, 1.035]);
    return {
      transform: [{ scale: settledScale * breathScale }],
      opacity: interpolate(settle.value, [0, 1], [0.96, 1]),
    };
  });

  const glowMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.22 };
    }
    const t = Math.max(settle.value * 0.5, breath.value);
    return {
      opacity: interpolate(t, [0, 1], [0.14, 0.3]),
      transform: [{ scale: interpolate(t, [0, 1], [0.92, 1.06]) }],
    };
  });

  const copyMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 1 };
    }
    return {
      opacity: interpolate(settle.value, [0, 1], [0, 1]),
      transform: [{ translateY: interpolate(settle.value, [0, 1], [8, 0]) }],
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
        <BridgeHiveMark size={APP_BOOT_MARK_SIZE} />
      </Animated.View>

      <Animated.View style={[styles.copyBlock, copyMotion]}>
        <Text style={styles.copy} allowFontScaling={false}>
          Preparing your workspace
        </Text>
        <Text style={styles.subcopy} allowFontScaling={false}>
          Setting up your secure BridgeHive experience
        </Text>
      </Animated.View>

      {bootstrapError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            We could not finish setting up your workspace. Check your connection and try again.
          </Text>
          {onRetryBootstrap ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry workspace setup"
              onPress={onRetryBootstrap}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <PreparationProgress active={showProgress} reducedMotion={reducedMotion} />
      )}
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(20, 169, 181, 0.2)',
    top: '26%',
  },
  glowGold: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(228, 179, 52, 0.12)',
    top: '34%',
    left: '16%',
  },
  logoWrap: {
    marginBottom: 28,
    padding: 4,
    overflow: 'visible',
  },
  copyBlock: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 320,
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
  subcopy: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '400' as const },
      android: { fontFamily: 'sans-serif', fontWeight: '400' as const },
      default: { fontWeight: '400' as const },
    }),
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: 'rgba(184, 228, 234, 0.72)',
    textAlign: 'center',
    width: '100%',
  },
  progressBlock: {
    marginTop: 28,
    alignItems: 'center',
    gap: 14,
    width: '100%',
    maxWidth: 160,
  },
  progressLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: 'rgba(20, 169, 181, 0.75)',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(20, 169, 181, 0.9)',
  },
  errorBlock: {
    marginTop: 28,
    alignItems: 'center',
    gap: 14,
    maxWidth: 300,
  },
  errorText: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '400' as const },
      android: { fontFamily: 'sans-serif', fontWeight: '400' as const },
      default: { fontWeight: '400' as const },
    }),
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 200, 180, 0.92)',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.45)',
    backgroundColor: 'rgba(20, 169, 181, 0.18)',
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '600' as const },
      android: { fontFamily: 'sans-serif-medium', fontWeight: '600' as const },
      default: { fontWeight: '600' as const },
    }),
    fontSize: 14,
    color: 'rgba(247, 251, 253, 0.95)',
  },
});
