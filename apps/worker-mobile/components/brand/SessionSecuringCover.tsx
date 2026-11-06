import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
import {
  SESSION_SECURING_MAX_MS,
  SESSION_SECURING_MIN_MS,
  SESSION_SECURING_STEPS,
  sessionSecuringStepIndex,
  shouldFinishSessionSecuring,
  type SessionSecuringStepId,
} from '@/lib/session-securing';

const BG = '#071A2F';
const MIDNIGHT = '#061528';
const TEAL = '#0B5266';
const CYAN = '#1596B5';
const GOLD = '#F4C542';

type Props = {
  /** Auth/profile hydrate finished — cover still waits for the minimum duration. */
  ready: boolean;
  onFinished: () => void;
  /** Override minimum hold (tests). */
  minMs?: number;
  /** Hard dismiss cap (tests). Defaults to SESSION_SECURING_MAX_MS. */
  maxMs?: number;
};

const STEP_ICONS: Record<SessionSecuringStepId, keyof typeof Ionicons.glyphMap> = {
  verify: 'shield-checkmark',
  encrypt: 'lock-closed',
  sync: 'cloud-done',
  open: 'sparkles',
};

/**
 * Premium post-login handoff — staged security steps, orbital accents,
 * and a timed progress fill before entering the workspace.
 */
export function SessionSecuringCover({
  ready,
  onFinished,
  minMs = SESSION_SECURING_MIN_MS,
  maxMs = SESSION_SECURING_MAX_MS,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(minMs <= 0);
  const [maxElapsed, setMaxElapsed] = useState(maxMs <= 0);
  const [stepIndex, setStepIndex] = useState(0);
  const finishedRef = useRef(false);

  // Logo/brand visible on first paint — never a blank navy frame before securing UI.
  const settle = useSharedValue(1);
  const progress = useSharedValue(reduced ? 1 : 0.08);
  const orbit = useSharedValue(0);
  const breath = useSharedValue(reduced ? 0.5 : 0);
  const shimmer = useSharedValue(0);
  // Brand copy visible immediately (avoid empty navy while motion catches up).
  const copyIn = useSharedValue(1);

  const steps = useMemo(
    () =>
      SESSION_SECURING_STEPS.map((id) => ({
        id,
        label: t(`auth.securingStep.${id}`),
        icon: STEP_ICONS[id],
      })),
    [t],
  );

  useEffect(() => {
    finishedRef.current = false;
    if (minMs <= 0) {
      setMinElapsed(true);
    } else {
      setMinElapsed(false);
    }
    if (maxMs <= 0) {
      setMaxElapsed(true);
    } else {
      setMaxElapsed(false);
    }
    const minTimer =
      minMs <= 0 ? null : setTimeout(() => setMinElapsed(true), minMs);
    const maxTimer =
      maxMs <= 0 ? null : setTimeout(() => setMaxElapsed(true), Math.max(maxMs, minMs));
    return () => {
      if (minTimer) clearTimeout(minTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };
  }, [maxMs, minMs]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (
      !shouldFinishSessionSecuring({
        ready,
        minElapsed,
        maxElapsed,
      })
    ) {
      return;
    }
    finishedRef.current = true;
    onFinished();
  }, [maxElapsed, minElapsed, onFinished, ready]);

  useEffect(() => {
    if (reduced) {
      settle.value = 1;
      progress.value = 1;
      breath.value = 0.5;
      copyIn.value = 1;
      setStepIndex(SESSION_SECURING_STEPS.length - 1);
      return;
    }

    copyIn.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, {
      duration: Math.max(1200, minMs - 200),
      easing: Easing.out(Easing.cubic),
    });
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    orbit.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [breath, copyIn, minMs, orbit, progress, reduced, settle, shimmer]);

  // Advance checklist from wall-clock (avoid reading shared values on the JS thread).
  useEffect(() => {
    if (reduced) {
      setStepIndex(SESSION_SECURING_STEPS.length - 1);
      return;
    }
    if (minMs <= 0) {
      setStepIndex(SESSION_SECURING_STEPS.length - 1);
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / Math.max(1, minMs - 200));
      setStepIndex(sessionSecuringStepIndex(ratio));
    }, 160);
    return () => clearInterval(tick);
  }, [minMs, reduced]);

  const logoStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [{ scale: 1 }] };
    return {
      opacity: 1,
      transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.05]) }],
    };
  });

  const haloStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.2, transform: [{ scale: 1 }] };
    return {
      opacity: interpolate(breath.value, [0, 1], [0.14, 0.36]),
      transform: [{ scale: interpolate(breath.value, [0, 1], [0.92, 1.16]) }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.35, transform: [{ rotate: '0deg' }] };
    return {
      opacity: 0.55,
      transform: [{ rotate: `${orbit.value * 360}deg` }],
    };
  });

  const ringBStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.22, transform: [{ rotate: '0deg' }] };
    return {
      opacity: 0.4,
      transform: [{ rotate: `${-orbit.value * 360}deg` }],
    };
  });

  const copyStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [{ translateY: 0 }] };
    return {
      opacity: copyIn.value,
      transform: [{ translateY: interpolate(copyIn.value, [0, 1], [10, 0]) }],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.08, 1]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : interpolate(shimmer.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-40, 220]) }],
  }));

  const activeLabel = steps[stepIndex]?.label ?? steps[0]?.label;

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={t('auth.securingTitle')}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.midnight} />
        <LinearGradient
          colors={['#071A2F', '#0B2A43', '#0A3D4A']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.poolCyan} />
        <View style={styles.poolTeal} />
      </View>

      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Animated.View style={[styles.halo, haloStyle]} />
        <Animated.View style={[styles.ring, ringStyle]}>
          <View style={styles.ringDot} />
          <View style={[styles.ringDot, styles.ringDotGold]} />
        </Animated.View>
        <Animated.View style={[styles.ringInner, ringBStyle]}>
          <View style={styles.ringDash} />
        </Animated.View>
        <BridgeHiveMark variant="boot" size={128} />
      </Animated.View>

      <Animated.View style={[styles.copyBlock, copyStyle]}>
        <Text style={styles.eyebrow}>{t('common.bridgeHive')}</Text>
        <View style={styles.rule} />
        <Text style={styles.title}>{t('auth.securingTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.securingSubtitle')}</Text>
        <Text style={styles.activeStep} accessibilityLiveRegion="polite">
          {activeLabel}
        </Text>
      </Animated.View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          return (
            <Animated.View
              key={step.id}
              entering={
                reduced
                  ? undefined
                  : FadeInDown.delay(180 + index * 90)
                      .duration(420)
                      .springify()
                      .damping(16)
              }
              style={[
                styles.stepRow,
                done && styles.stepDone,
                active && styles.stepActive,
              ]}
            >
              <LinearGradient
                colors={
                  done || active
                    ? [colors.navy, '#0C3E56', colors.tealStrong]
                    : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stepIcon}
              >
                <Ionicons
                  name={done ? 'checkmark' : step.icon}
                  size={14}
                  color={done || active ? colors.white : 'rgba(255,255,255,0.45)'}
                />
              </LinearGradient>
              <Text
                style={[
                  styles.stepLabel,
                  (done || active) && styles.stepLabelOn,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
              {active ? <View style={styles.stepPulse} /> : null}
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.progressBlock} accessibilityElementsHidden>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, fillStyle]}>
            <LinearGradient
              colors={['#0E6B7A', CYAN, '#3BC4D8', GOLD]}
              locations={[0, 0.45, 0.82, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View style={[styles.progressShimmer, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </Animated.View>
        </View>
        <Text style={styles.progressHint}>{t('auth.securingHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
    // Web: first paint can be an empty navy flex parent before children layout —
    // pin to the viewport so logo + copy are visible immediately.
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100vh', width: '100%' } as object)
      : null),
  },
  midnight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MIDNIGHT,
    opacity: 0.4,
  },
  poolCyan: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: CYAN,
    opacity: 0.12,
    top: '12%',
    alignSelf: 'center',
  },
  poolTeal: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: TEAL,
    opacity: 0.16,
    bottom: '8%',
    left: '-6%',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  halo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: CYAN,
  },
  ring: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: 'rgba(21, 150, 181, 0.35)',
    borderStyle: 'dashed',
  },
  ringInner: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244, 197, 66, 0.28)',
  },
  ringDot: {
    position: 'absolute',
    top: -3,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CYAN,
  },
  ringDotGold: {
    top: undefined,
    bottom: -3,
    backgroundColor: GOLD,
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
  copyBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xl,
    maxWidth: 340,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(184, 228, 234, 0.85)',
  },
  rule: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
  },
  activeStep: {
    marginTop: 4,
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: GOLD,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  steps: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
    marginBottom: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  stepDone: {
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  stepActive: {
    backgroundColor: 'rgba(20, 169, 181, 0.18)',
    borderColor: 'rgba(244, 197, 66, 0.35)',
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  stepLabelOn: {
    color: colors.white,
    fontFamily: typography.fonts.semibold,
  },
  stepPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  progressBlock: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    transformOrigin: 'left center',
  },
  progressShimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 48,
  },
  progressHint: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(175, 201, 213, 0.85)',
    textAlign: 'center',
  },
});
