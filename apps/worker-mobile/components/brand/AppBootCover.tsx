import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { typography } from '@/constants/theme';
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
const BOOT_TEAL = '#0B5266';
const BOOT_CYAN = '#1596B5';
const BOOT_GOLD = '#F4C542';
const BOOT_TEXT = '#F4FAFC';

/** Official mark size on the premium launch splash. */
export const APP_BOOT_MARK_SIZE = 168;

/** Logo breath cycle (ms). */
export const APP_BOOT_BREATH_MS = 3200;

/** Background atmosphere drift cycle (ms). */
export const APP_BOOT_DRIFT_MS = 12000;

/** Soft orbital ring period (ms). */
export const APP_BOOT_ORBIT_MS = 10000;

export {
  APP_BOOT_MIN_MS,
  WORKSPACE_PREPARATION_MINIMUM_MS,
  canDismissWorkspacePreparation,
};

/** Show refined progress after this delay when bootstrap is still running. */
export const APP_BOOT_SLOW_MS = 500;

/**
 * Holds the launch cover until `ready` and the minimum boot duration have both elapsed.
 * Kept for callers that still want a timed gate; index no longer uses a fixed hold.
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
      return { opacity: 0.16, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    return {
      opacity: interpolate(drift.value, [0, 1], [0.12, 0.22]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-14, 18]) },
        { translateY: interpolate(drift.value, [0, 1], [10, -16]) },
        { scale: interpolate(drift.value, [0, 1], [0.94, 1.08]) },
      ],
    };
  });

  const poolB = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.12, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    return {
      opacity: interpolate(drift.value, [0, 1], [0.09, 0.16]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [16, -12]) },
        { translateY: interpolate(drift.value, [0, 1], [-8, 18]) },
        { scale: interpolate(drift.value, [0, 1], [1.05, 0.92]) },
      ],
    };
  });

  const veil = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0.35 };
    return {
      opacity: interpolate(drift.value, [0, 1], [0.28, 0.42]),
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <LinearGradient
        colors={['#071A2F', '#0B2A43', '#0A3D4A']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[styles.midnightWash, veil]} />
      <Animated.View style={[styles.poolCyan, poolA]} />
      <Animated.View style={[styles.poolTeal, poolB]} />
      <LinearGradient
        colors={['transparent', 'rgba(7, 26, 47, 0.55)']}
        style={styles.floorFade}
      />
    </View>
  );
}

function LaunchProgress({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const fill = useSharedValue(reducedMotion ? 0.7 : 0.1);
  const sweep = useSharedValue(0);
  const glow = useSharedValue(reducedMotion ? 0.5 : 0);

  useEffect(() => {
    if (!active) {
      fill.value = reducedMotion ? 0.7 : 0.1;
      sweep.value = 0;
      glow.value = reducedMotion ? 0.5 : 0;
      return;
    }
    if (reducedMotion) {
      fill.value = 0.7;
      glow.value = 0.5;
      return;
    }
    fill.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2200, easing: Easing.out(Easing.cubic) }),
        withTiming(0.32, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    sweep.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, fill, glow, reducedMotion, sweep]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(fill.value, [0, 1], [0.12, 1]) }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : interpolate(sweep.value, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-36, 200]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.28 : interpolate(glow.value, [0, 1], [0.22, 0.55]),
    transform: [{ scaleX: interpolate(glow.value, [0, 1], [0.92, 1.06]) }],
  }));

  if (!active) return null;

  return (
    <View style={styles.progressBlock} accessibilityElementsHidden>
      <Animated.View style={[styles.progressGlow, glowStyle]} />
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]}>
          <LinearGradient
            colors={['#0E6B7A', BOOT_CYAN, '#3BC4D8', BOOT_GOLD]}
            locations={[0, 0.45, 0.82, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.progressSweep, sweepStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Premium launch splash — animated BridgeHive mark on navy atmosphere.
 * No “preparing workspace” copy; brand signal only while auth/fonts settle.
 */
export function AppBootCover({
  showSlowIndicator = true,
  bootstrapError = false,
  onRetryBootstrap,
}: AppBootCoverProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const settle = useSharedValue(reducedMotion ? 1 : 0);
  const breath = useSharedValue(reducedMotion ? 0.5 : 0);
  const orbit = useSharedValue(0);
  const brand = useSharedValue(reducedMotion ? 1 : 0);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (bootstrapError) {
      setShowProgress(false);
      return;
    }
    const delay = showSlowIndicator ? APP_BOOT_SLOW_MS : 280;
    const timer = setTimeout(() => setShowProgress(true), delay);
    return () => clearTimeout(timer);
  }, [bootstrapError, showSlowIndicator]);

  useEffect(() => {
    if (reducedMotion) {
      settle.value = 1;
      breath.value = 0.5;
      brand.value = 1;
      return;
    }
    settle.value = withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) });
    brand.value = withDelay(
      320,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }),
    );
    breath.value = withDelay(
      240,
      withRepeat(
        withSequence(
          withTiming(1, { duration: APP_BOOT_BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: APP_BOOT_BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    orbit.value = withRepeat(
      withTiming(1, { duration: APP_BOOT_ORBIT_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [brand, breath, orbit, reducedMotion, settle]);

  const logoMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [{ scale: 1 }], opacity: 1 };
    }
    const entrance = interpolate(settle.value, [0, 1], [0.86, 1]);
    const breathScale = interpolate(breath.value, [0, 1], [1, 1.055]);
    return {
      transform: [{ scale: entrance * breathScale }],
      opacity: interpolate(settle.value, [0, 1], [0, 1]),
    };
  });

  const haloMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.22, transform: [{ scale: 1 }] };
    }
    return {
      opacity: interpolate(breath.value, [0, 1], [0.14, 0.38]) * settle.value,
      transform: [{ scale: interpolate(breath.value, [0, 1], [0.9, 1.16]) }],
    };
  });

  const ringMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.4, transform: [{ rotate: '0deg' }] };
    }
    return {
      opacity: interpolate(settle.value, [0, 1], [0, 0.55]),
      transform: [{ rotate: `${orbit.value * 360}deg` }],
    };
  });

  const ringInnerMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.28, transform: [{ rotate: '0deg' }] };
    }
    return {
      opacity: interpolate(settle.value, [0, 1], [0, 0.42]),
      transform: [{ rotate: `${-orbit.value * 360}deg` }],
    };
  });

  const brandMotion = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    return {
      opacity: brand.value,
      transform: [{ translateY: interpolate(brand.value, [0, 1], [12, 0]) }],
    };
  });

  const ruleMotion = useAnimatedStyle(() => ({
    opacity: brand.value,
    transform: [{ scaleX: interpolate(brand.value, [0, 1], [0.2, 1]) }],
  }));

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.bridgeHive')}
    >
      <BootAtmosphere reducedMotion={reducedMotion} />

      <Animated.View style={[styles.logoWrap, logoMotion]}>
        <Animated.View pointerEvents="none" style={[styles.logoHalo, haloMotion]} />
        <Animated.View pointerEvents="none" style={[styles.ring, ringMotion]}>
          <View style={styles.ringDot} />
          <View style={[styles.ringDot, styles.ringDotGold]} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.ringInner, ringInnerMotion]}>
          <View style={styles.ringDash} />
        </Animated.View>
        <BridgeHiveMark variant="boot" size={APP_BOOT_MARK_SIZE} />
      </Animated.View>

      <Animated.View style={[styles.brandBlock, brandMotion]}>
        <Text style={styles.brand} allowFontScaling={false}>
          {t('common.bridgeHive').toUpperCase()}
        </Text>
        <Animated.View style={[styles.brandRule, ruleMotion]} />
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
        <LaunchProgress active={showProgress} reducedMotion={reducedMotion} />
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
  },
  poolCyan: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: BOOT_CYAN,
    top: '14%',
    alignSelf: 'center',
  },
  poolTeal: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: BOOT_TEAL,
    bottom: '10%',
    left: '-8%',
  },
  floorFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
  },
  logoWrap: {
    marginBottom: 28,
    width: APP_BOOT_MARK_SIZE + 64,
    height: APP_BOOT_MARK_SIZE + 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHalo: {
    position: 'absolute',
    width: APP_BOOT_MARK_SIZE * 1.42,
    height: APP_BOOT_MARK_SIZE * 1.42,
    borderRadius: APP_BOOT_MARK_SIZE * 0.71,
    backgroundColor: BOOT_CYAN,
  },
  ring: {
    position: 'absolute',
    width: APP_BOOT_MARK_SIZE + 48,
    height: APP_BOOT_MARK_SIZE + 48,
    borderRadius: (APP_BOOT_MARK_SIZE + 48) / 2,
    borderWidth: 1,
    borderColor: 'rgba(21, 150, 181, 0.38)',
    borderStyle: 'dashed',
  },
  ringInner: {
    position: 'absolute',
    width: APP_BOOT_MARK_SIZE + 28,
    height: APP_BOOT_MARK_SIZE + 28,
    borderRadius: (APP_BOOT_MARK_SIZE + 28) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244, 197, 66, 0.3)',
  },
  ringDot: {
    position: 'absolute',
    top: -3,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BOOT_CYAN,
  },
  ringDotGold: {
    top: undefined,
    bottom: -3,
    backgroundColor: BOOT_GOLD,
  },
  ringDash: {
    position: 'absolute',
    right: -2,
    top: '42%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: 2.4,
    color: 'rgba(184, 228, 234, 0.92)',
  },
  brandRule: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: BOOT_GOLD,
  },
  progressBlock: {
    marginTop: 36,
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
  },
  progressGlow: {
    position: 'absolute',
    top: -6,
    width: '92%',
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(21, 150, 181, 0.35)',
  },
  progressTrack: {
    height: 5,
    width: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    transformOrigin: 'left center',
  },
  progressSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 48,
  },
  errorBlock: {
    marginTop: 28,
    alignItems: 'center',
    gap: 14,
    maxWidth: 300,
  },
  errorText: {
    fontFamily: typography.fonts.regular,
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
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: BOOT_TEXT,
  },
});
