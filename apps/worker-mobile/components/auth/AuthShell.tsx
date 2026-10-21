import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  /** Vertically center content (login/forms and landing). */
  centered?: boolean;
  /** Tighter mark/copy/card rhythm for the auth landing. */
  compact?: boolean;
};

/** Light premium auth chrome — keep opacity animation non-essential. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  centered = true,
  compact = false,
}: Props) {
  const { gutter } = useLayout();
  const reduced = useReducedMotion();
  const reveal = useSharedValue(reduced ? 1 : 0.96);
  const breath = useSharedValue(0);
  const isLanding = compact && !showBack;

  useEffect(() => {
    if (reduced) {
      reveal.value = 1;
      return;
    }
    reveal.value = withDelay(40, withSpring(1, { damping: 16, stiffness: 160 }));
  }, [reduced, reveal]);

  useEffect(() => {
    if (reduced || !isLanding) {
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
  }, [breath, isLanding, reduced]);

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
    if (!isLanding || reduced) {
      return { opacity: isLanding ? 0.22 : 0, transform: [{ scale: 1 }] };
    }
    return {
      opacity: interpolate(breath.value, [0, 1], [0.16, 0.34]),
      transform: [{ scale: interpolate(breath.value, [0, 1], [0.92, 1.1]) }],
    };
  });

  const markBreath = useAnimatedStyle(() => {
    if (!isLanding || reduced) {
      return { transform: [{ scale: 1 }] };
    }
    return {
      transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.045]) }],
    };
  });

  const enter = (delay: number) =>
    reduced ? undefined : FadeInDown.delay(delay).duration(420);

  return (
    <View style={styles.root}>
      <HiveFlowBackground />
      <View pointerEvents="none" style={styles.ambientTeal} />
      <View pointerEvents="none" style={styles.ambientHoney} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              style={[styles.back, { marginLeft: gutter }]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <View style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.navy} />
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
                motion,
              ]}
            >
              <View style={styles.markStage}>
                {isLanding ? (
                  <Animated.View pointerEvents="none" style={[styles.markGlow, markGlow]} />
                ) : null}
                <Animated.View style={markBreath}>
                  <BridgeHiveMark
                    size={compact ? 72 : 84}
                    style={compact ? styles.markCompact : styles.mark}
                  />
                </Animated.View>
              </View>
              <Text style={[styles.brand, isLanding && styles.brandLanding]}>
                Bridge Hive
              </Text>
              {isLanding ? <View style={styles.brandRule} /> : null}
              <Text
                style={[
                  styles.title,
                  compact && styles.titleCompact,
                  isLanding && styles.titleLanding,
                ]}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  compact && styles.subtitleCompact,
                  isLanding && styles.subtitleLanding,
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
                isLanding ? styles.cardLanding : styles.cardPremium,
                motion,
              ]}
            >
              {!isLanding ? (
                <View pointerEvents="none" style={styles.cardSheen} />
              ) : null}
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

export function AuthStepBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepSeg,
            i < current && styles.stepSegDone,
            i === current - 1 && styles.stepSegActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambientTeal: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    top: -60,
    right: -90,
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
    marginBottom: spacing.xl,
    gap: 8,
  },
  markStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  markGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(20, 169, 181, 0.28)',
  },
  mark: {
    marginBottom: spacing.sm,
  },
  markCompact: {
    marginBottom: 0,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: '#0B2032',
    letterSpacing: 0.8,
  },
  brandLanding: {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 12,
    color: colors.textSecondary,
  },
  brandRule: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
    marginTop: 2,
    marginBottom: 2,
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
    ...shadows.md,
    borderColor: 'rgba(11, 32, 50, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
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
  stepSegDone: {
    backgroundColor: colors.success,
  },
  stepSegActive: {
    backgroundColor: colors.navy,
  },
});
