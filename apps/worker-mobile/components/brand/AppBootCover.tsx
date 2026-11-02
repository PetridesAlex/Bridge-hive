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
import { useTranslation } from '@/i18n/locale-provider';
import {
  APP_BOOT_MIN_MS,
  canDismissWorkspacePreparation,
  WORKSPACE_PREPARATION_MINIMUM_MS,
} from '@/lib/workspace-preparation';

/** Navy canvas matching the native launch background — no white flash. */
export const APP_BOOT_BG = '#071A2F';

/** @deprecated Prefer APP_BOOT_BG — kept for leftover imports. */
export const APP_BOOT_NAVY = APP_BOOT_BG;

const BOOT_MIDNIGHT = '#061528';
const BOOT_ELEVATED = '#0B2742';
const BOOT_TEAL = '#0B5266';
const BOOT_CYAN = '#1596B5';
const BOOT_GOLD = '#F4C542';
const BOOT_TEXT = '#F4FAFC';
const BOOT_TEXT_SECONDARY = '#AFC9D5';

/** Official mark size on the JS “Preparing your workspace” cover. */
export const APP_BOOT_MARK_SIZE = 220;

/** Logo breath cycle while workspace is preparing (ms). */
export const APP_BOOT_BREATH_MS = 3600;

/** Background atmosphere drift cycle (ms). */
export const APP_BOOT_DRIFT_MS = 13000;

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

function BootAtmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  const drift = useSharedValue(reducedMotion ? 0.5 : 0);

  useEffect(() => {
    if (reducedMotion) {
      drift.value = 0.5;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: APP_BOOT_DRIFT_MS / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: APP_BOOT_DRIFT_MS / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [drift, reducedMotion]);

  const poolA = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.14, transform: [{ translateX: 0 }, { translateY: 0 }] };
    }
    return {
      opacity: interpolate(drift.value, [0, 1], [0.1, 0.18]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-10, 14]) },
        { translateY: interpolate(drift.value, [0, 1], [8, -12]) },
      ],
    };
  });

  const poolB = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.1, transform: [{ translateX: 0 }, { translateY: 0 }] };
    }
    return {
      opacity: interpolate(drift.value, [0, 1], [0.08, 0.14]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [12, -8]) },
        { translateY: interpolate(drift.value, [0, 1], [-6, 16]) },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <View style={styles.midnightWash} />
      <Animated.View style={[styles.poolCyan, poolA]} />
      <Animated.View style={[styles.poolTeal, poolB]} />
    </View>
  );
}

function PreparationProgress({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const pulse = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion || !active) {
      pulse.value = reducedMotion ? 1 : 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, pulse, reducedMotion]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.55 : interpolate(pulse.value, [0, 1], [0.35, 0.9]),
    transform: [{ scaleX: reducedMotion ? 1 : interpolate(pulse.value, [0, 1], [0.62, 1]) }],
  }));

  const goldAccent = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.35 : interpolate(pulse.value, [0, 1], [0.18, 0.55]),
  }));

  if (!active) return null;

  return (
    <View style={styles.progressBlock} accessibilityElementsHidden>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressLine, lineStyle]} />
        <Animated.View style={[styles.progressGold, goldAccent]} />
      </View>
    </View>
  );
}

/**
 * Navy launch cover — first branded BridgeHive experience after the navy-only
 * native splash. System fonts keep every glyph visible before custom fonts load.
 */
export function AppBootCover({
  showSlowIndicator = false,
  bootstrapError = false,
  onRetryBootstrap,
}: AppBootCoverProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const settle = useSharedValue(reducedMotion ? 1 : 0);
  const breath = useSharedValue(reducedMotion ? 0.5 : 0);
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
      breath.value = 0.5;
      return;
    }
    // Soft entrance, then calm breath — mark is introduced here, not continued from native splash.
    settle.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    breath.value = withDelay(
      720,
      withRepeat(
        withSequence(
          withTiming(1, { duration: APP_BOOT_BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: APP_BOOT_BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }),
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
    const entrance = interpolate(settle.value, [0, 1], [0.96, 1]);
    const breathScale = interpolate(breath.value, [0, 1], [1, 1.025]);
    const breathOpacity = interpolate(breath.value, [0, 1], [0.94, 1]);
    return {
      transform: [{ scale: entrance * breathScale }],
      opacity: interpolate(settle.value, [0, 1], [0, 1]) * breathOpacity,
    };
  });

  const haloMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.16, transform: [{ scale: 1 }] };
    }
    return {
      opacity: interpolate(breath.value, [0, 1], [0.1, 0.22]) * settle.value,
      transform: [{ scale: interpolate(breath.value, [0, 1], [0.96, 1.08]) }],
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
      accessibilityLabel={t('boot.preparing')}
    >
      <BootAtmosphere reducedMotion={reducedMotion} />

      <Animated.View style={[styles.logoWrap, logoMotion]}>
        <Animated.View pointerEvents="none" style={[styles.logoHalo, haloMotion]} />
        <BridgeHiveMark variant="boot" size={APP_BOOT_MARK_SIZE} />
      </Animated.View>

      <Animated.View style={[styles.copyBlock, copyMotion]}>
        <Text style={styles.copy} allowFontScaling={false}>
          {t('boot.preparing')}
        </Text>
        <Text style={styles.subcopy} allowFontScaling={false}>
          {t('boot.preparingSub')}
        </Text>
      </Animated.View>

      {bootstrapError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {t('boot.bootstrapError')}
          </Text>
          {onRetryBootstrap ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('boot.retrySetup')}
              onPress={onRetryBootstrap}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            >
              <Text style={styles.retryLabel}>{t('common.retry')}</Text>
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
  midnightWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BOOT_MIDNIGHT,
    opacity: 0.35,
  },
  poolCyan: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: BOOT_CYAN,
    top: '18%',
    alignSelf: 'center',
  },
  poolTeal: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: BOOT_TEAL,
    top: '42%',
    left: '8%',
  },
  logoWrap: {
    marginBottom: 28,
    padding: 4,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHalo: {
    position: 'absolute',
    width: APP_BOOT_MARK_SIZE * 1.35,
    height: APP_BOOT_MARK_SIZE * 1.35,
    borderRadius: APP_BOOT_MARK_SIZE * 0.675,
    backgroundColor: BOOT_CYAN,
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
    color: BOOT_TEXT,
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
    color: BOOT_TEXT_SECONDARY,
    textAlign: 'center',
    width: '100%',
  },
  progressBlock: {
    marginTop: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 168,
  },
  progressTrack: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: BOOT_ELEVATED,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressLine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BOOT_CYAN,
    opacity: 0.75,
  },
  progressGold: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '28%',
    backgroundColor: BOOT_GOLD,
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
    borderColor: 'rgba(21, 150, 181, 0.45)',
    backgroundColor: 'rgba(21, 150, 181, 0.18)',
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
    color: BOOT_TEXT,
  },
});
