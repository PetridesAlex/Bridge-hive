import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { layout, useLayout } from '@/hooks/useLayout';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
  /** Override default back behaviour (e.g. return to Welcome). */
  onBack?: () => void;
  /** Vertically center content (login/forms and landing). */
  centered?: boolean;
  /** Tighter mark/copy/card rhythm for the auth landing. */
  compact?: boolean;
  /** Navy glass journey chrome (landing, login, register). */
  tone?: 'light' | 'navy';
};

function goBackSafely() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/auth/worker');
}

/** Light premium auth chrome — keep opacity animation non-essential. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  onBack,
  centered = true,
  compact = false,
  tone = 'light',
}: Props) {
  const { gutter } = useLayout();
  const reduced = useReducedMotion();
  const reveal = useSharedValue(reduced ? 1 : 0.96);
  const breath = useSharedValue(0);
  /** Large centered hero only on the auth choice landing. */
  const isLanding = compact;
  /** Full-bleed navy glass used across the first-launch auth journey. */
  const isNavy = tone === 'navy' || compact;

  useEffect(() => {
    if (reduced) {
      reveal.value = 1;
      return;
    }
    reveal.value = withDelay(40, withSpring(1, { damping: 16, stiffness: 160 }));
  }, [reduced, reveal]);

  useEffect(() => {
    if (reduced || !isNavy) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [breath, isNavy, reduced]);

  const motion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      {
        translateY: interpolate(
          reveal.value,
          [0.96, 1],
          [reduced ? 0 : 10, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const markGlow = useAnimatedStyle(() => {
    if (!isNavy || reduced) {
      return { opacity: isNavy ? 0.22 : 0, transform: [{ scale: 1 }] };
    }
    return {
      opacity: interpolate(breath.value, [0, 1], [0.16, 0.34]),
      transform: [{ scale: interpolate(breath.value, [0, 1], [0.92, 1.1]) }],
    };
  });

  const markBreath = useAnimatedStyle(() => {
    if (!isNavy || reduced) {
      return { transform: [{ scale: 1 }] };
    }
    return {
      transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.045]) }],
    };
  });

  const enter = (delay: number) =>
    reduced ? undefined : FadeInDown.delay(delay).duration(420);

  return (
    <View style={[styles.root, isNavy && styles.rootLanding]}>
      {isNavy ? <StatusBar style="light" /> : null}
      {isNavy ? (
        <>
          <View pointerEvents="none" style={styles.landingCanvas} />
          <LinearGradient
            pointerEvents="none"
            colors={['#071A2F', '#0A2438', '#071A2F']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <HiveFlowBackground />
      )}
      <View
        pointerEvents="none"
        style={[styles.ambientTeal, isNavy && styles.ambientTealLanding]}
      />
      <View
        pointerEvents="none"
        style={[styles.ambientHoney, isNavy && styles.ambientHoneyLanding]}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {showBack ? (
            <Pressable
              onPress={onBack ?? goBackSafely}
              style={[styles.back, { marginLeft: gutter }]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <View style={[styles.backBtn, isNavy && styles.backBtnLanding]}>
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={isNavy ? '#D7EEF2' : colors.navy}
                />
              </View>
            </Pressable>
          ) : null}

          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              compact ? styles.scrollCompact : null,
              centered || isLanding ? styles.scrollCentered : null,
              !showBack && !compact ? styles.scrollNoBack : null,
              isLanding ? styles.scrollLanding : null,
              isNavy && !isLanding ? styles.scrollNavyForm : null,
              {
                paddingHorizontal: Math.max(gutter, 20),
                maxWidth: layout.contentMaxWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={!compact}
          >
            <Animated.View
              entering={enter(40)}
              style={[
                styles.hero,
                compact && styles.heroCompact,
                isLanding && styles.heroLanding,
                isNavy && !isLanding && styles.heroNavy,
                motion,
              ]}
            >
              <View
                style={[
                  styles.markStage,
                  isLanding && styles.markStageLanding,
                  isNavy && !isLanding && styles.markStageNavy,
                ]}
              >
                {isNavy ? (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.markGlow,
                        isLanding && styles.markGlowOuter,
                        !isLanding && styles.markGlowNavy,
                        markGlow,
                      ]}
                    />
                    {isLanding ? (
                      <Animated.View pointerEvents="none" style={[styles.markGlow, markGlow]} />
                    ) : null}
                  </>
                ) : null}
                <Animated.View style={markBreath}>
                  <BridgeHiveMark
                    size={isLanding ? 132 : isNavy ? 88 : compact ? 72 : 84}
                    style={
                      isLanding
                        ? styles.markLanding
                        : compact
                          ? styles.markCompact
                          : styles.mark
                    }
                  />
                </Animated.View>
              </View>
              <Text
                style={[
                  styles.brand,
                  isNavy && styles.brandLanding,
                ]}
              >
                BridgeHive App
              </Text>
              {isNavy ? <View style={styles.brandRule} /> : null}
              <Text
                style={[
                  styles.title,
                  compact && styles.titleCompact,
                  isLanding && styles.titleLanding,
                  isNavy && !isLanding && styles.titleNavy,
                ]}
                accessibilityRole="header"
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  compact && styles.subtitleCompact,
                  isLanding && styles.subtitleLanding,
                  isNavy && !isLanding && styles.subtitleNavy,
                ]}
              >
                {subtitle}
              </Text>
            </Animated.View>

            <Animated.View
              entering={enter(140)}
              style={[
                styles.card,
                compact && styles.cardCompact,
                isNavy ? styles.cardLanding : styles.cardPremium,
                motion,
              ]}
            >
              {isNavy ? (
                <>
                  <View pointerEvents="none" style={styles.glassFill} />
                  <View pointerEvents="none" style={styles.glassHighlight} />
                </>
              ) : (
                <View pointerEvents="none" style={styles.cardSheen} />
              )}
              {children}
            </Animated.View>
            {footer ? (
              <Animated.View
                entering={enter(240)}
                style={compact ? styles.footerCompact : styles.footerSlot}
              >
                {footer}
              </Animated.View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AuthStepBar({
  current,
  total,
  tone = 'light',
}: {
  current: number;
  total: number;
  tone?: 'light' | 'navy';
}) {
  const navy = tone === 'navy';
  return (
    <View style={styles.stepBar} accessibilityRole="progressbar">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepSeg,
            navy && styles.stepSegNavy,
            i < current && (navy ? styles.stepSegDoneNavy : styles.stepSegDone),
            i === current - 1 && (navy ? styles.stepSegActiveNavy : styles.stepSegActive),
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootLanding: {
    backgroundColor: '#071A2F',
  },
  landingCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#071A2F',
  },
  ambientTeal: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    top: -60,
    right: -90,
  },
  ambientTealLanding: {
    backgroundColor: 'rgba(20, 169, 181, 0.16)',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: '18%',
    right: -110,
  },
  ambientHoney: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(228, 179, 52, 0.1)',
    bottom: '12%',
    left: -80,
  },
  ambientHoneyLanding: {
    backgroundColor: 'rgba(228, 179, 52, 0.1)',
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: '8%',
    left: -90,
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  scrollCompact: {
    paddingBottom: spacing.xl,
  },
  scrollCentered: {
    justifyContent: 'center',
  },
  scrollNoBack: {
    paddingTop: spacing.xxl,
  },
  scrollLanding: {
    paddingVertical: spacing.xl,
  },
  scrollNavyForm: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  back: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnLanding: {
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.35)',
  },
  hero: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  heroCompact: {
    marginBottom: spacing.lg,
    gap: 6,
  },
  heroLanding: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: 10,
  },
  heroNavy: {
    marginBottom: spacing.lg,
    gap: 8,
  },
  markStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  markStageLanding: {
    width: 180,
    height: 180,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  markStageNavy: {
    width: 112,
    height: 112,
    marginBottom: spacing.sm,
  },
  markGlow: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(20, 169, 181, 0.22)',
  },
  markGlowOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(228, 179, 52, 0.1)',
  },
  markGlowNavy: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(20, 169, 181, 0.2)',
  },
  mark: {
    marginBottom: spacing.sm,
  },
  markCompact: {
    marginBottom: 0,
  },
  markLanding: {
    marginBottom: 0,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: '#0B2032',
    letterSpacing: 0.8,
  },
  brandLanding: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontSize: 12,
    color: 'rgba(20, 169, 181, 0.9)',
    marginTop: 2,
  },
  brandRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
    marginTop: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: colors.text,
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 30,
    marginTop: 2,
  },
  titleLanding: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    maxWidth: 320,
    color: '#D7EEF2',
  },
  titleNavy: {
    color: '#D7EEF2',
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 340,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  subtitleLanding: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 21,
    color: 'rgba(20, 169, 181, 0.78)',
  },
  subtitleNavy: {
    color: 'rgba(20, 169, 181, 0.78)',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardCompact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderRadius: 20,
  },
  cardPremium: {
    ...shadows.lg,
    borderColor: 'rgba(11, 32, 50, 0.07)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: 'rgba(20, 169, 181, 0.045)',
  },
  cardLanding: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 169, 181, 0.08)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(20, 169, 181, 0.06)',
  },
  footerSlot: {
    marginTop: spacing.lg,
  },
  footerCompact: {
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  stepBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  stepSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepSegNavy: {
    backgroundColor: 'rgba(20, 169, 181, 0.2)',
  },
  stepSegDone: {
    backgroundColor: colors.success,
  },
  stepSegDoneNavy: {
    backgroundColor: 'rgba(20, 169, 181, 0.55)',
  },
  stepSegActive: {
    backgroundColor: colors.navy,
  },
  stepSegActiveNavy: {
    backgroundColor: colors.yellow,
  },
});
