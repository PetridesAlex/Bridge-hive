import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useAuthDensity, useKeyboardVisible } from '@/hooks/useAuthDensity';
import { layout, useLayout } from '@/hooks/useLayout';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { authShellMetrics } from '@/lib/auth-density';

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

/**
 * Premium auth chrome. Layout is height-aware: spacing and artwork scale with
 * the usable safe-area height so standard iPhones fit without scrolling.
 * The scroll view only becomes scrollable when content genuinely overflows
 * (keyboard open, very small phones, large Dynamic Type, long forms).
 */
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
  const { gutter } = useLayout('auth');
  const insets = useSafeAreaInsets();
  const density = useAuthDensity();
  const keyboardVisible = useKeyboardVisible();
  const m = authShellMetrics(density);
  const reduced = useReducedMotion();
  const reveal = useSharedValue(reduced ? 1 : 0.96);
  const breath = useSharedValue(0);
  /** Large centered hero only on the auth choice landing. */
  const isLanding = compact;
  /** Full-bleed navy glass used across the first-launch auth journey. */
  const isNavy = tone === 'navy' || compact;

  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const overflowing = contentHeight > viewportHeight + 1 && viewportHeight > 0;
  const scrollable = overflowing || keyboardVisible;

  const onScrollLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
  }, []);
  const onContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h);
  }, []);

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

  const markSize = isLanding ? m.landingMark : isNavy ? m.formMark : m.lightMark;
  const stage = markSize + m.markPad;
  const heroBottom = isLanding
    ? m.landingHeroBottom
    : isNavy
      ? m.formHeroBottom
      : m.lightHeroBottom;
  const titleMetrics = isNavy ? m.title : m.lightTitle;
  const bottomPad = keyboardVisible ? spacing.lg : Math.max(insets.bottom, spacing.md);
  const topPad = showBack ? m.scrollTop : m.scrollTopNoBack;

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
      {/* Bottom inset is applied inside the scroll content so the keyboard
          avoiding view measures against the real screen edge. */}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {showBack ? (
            <Pressable
              onPress={onBack ?? goBackSafely}
              style={[
                styles.back,
                { marginLeft: gutter, marginTop: m.backTop, marginBottom: m.backBottom },
              ]}
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
            style={styles.flex}
            onLayout={onScrollLayout}
            onContentSizeChange={onContentSizeChange}
            contentContainerStyle={[
              styles.scroll,
              centered || isLanding ? styles.scrollCentered : null,
              {
                paddingTop: topPad,
                paddingBottom: bottomPad,
                paddingHorizontal: Math.max(gutter, 20),
                maxWidth: layout.authMaxWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
            scrollEnabled={scrollable}
            bounces={scrollable}
            alwaysBounceVertical={false}
            alwaysBounceHorizontal={false}
            overScrollMode={scrollable ? 'auto' : 'never'}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Animated.View
              entering={enter(40)}
              style={[
                styles.hero,
                isLanding && styles.heroLanding,
                { gap: m.heroGap, marginBottom: heroBottom },
                motion,
              ]}
            >
              <View
                style={[
                  styles.markStage,
                  isNavy ? { width: stage, height: stage } : null,
                ]}
              >
                {isNavy ? (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.markGlow,
                        {
                          width: stage,
                          height: stage,
                          borderRadius: stage / 2,
                          backgroundColor: isLanding
                            ? 'rgba(228, 179, 52, 0.1)'
                            : 'rgba(20, 169, 181, 0.2)',
                        },
                        markGlow,
                      ]}
                    />
                    {isLanding ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.markGlow,
                          {
                            width: stage * 0.8,
                            height: stage * 0.8,
                            borderRadius: (stage * 0.8) / 2,
                            backgroundColor: 'rgba(20, 169, 181, 0.22)',
                          },
                          markGlow,
                        ]}
                      />
                    ) : null}
                  </>
                ) : null}
                <Animated.View style={markBreath}>
                  <BridgeHiveMark size={markSize} />
                </Animated.View>
              </View>
              <Text style={[styles.brand, isNavy && styles.brandLanding]}>
                BridgeHive App
              </Text>
              {isNavy ? <View style={styles.brandRule} /> : null}
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: titleMetrics.size,
                    lineHeight: titleMetrics.line,
                  },
                  isNavy && styles.titleNavy,
                  isLanding && styles.titleLanding,
                ]}
                accessibilityRole="header"
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { fontSize: m.subtitle.size, lineHeight: m.subtitle.line },
                  isNavy && styles.subtitleNavy,
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
                { padding: m.cardPad, gap: m.cardGap },
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
                style={[
                  isLanding ? styles.footerCompact : null,
                  { marginTop: m.footerTop },
                ]}
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
  },
  scrollCentered: {
    justifyContent: 'center',
  },
  back: {
    alignSelf: 'flex-start',
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
    alignItems: 'flex-start',
  },
  heroLanding: {
    alignItems: 'center',
  },
  markStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlow: {
    position: 'absolute',
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
  },
  brandRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
  },
  title: {
    fontFamily: typography.fonts.display,
    letterSpacing: -0.4,
    color: colors.text,
  },
  titleNavy: {
    color: '#D7EEF2',
  },
  titleLanding: {
    textAlign: 'center',
    letterSpacing: -0.5,
    maxWidth: 340,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    maxWidth: 360,
  },
  subtitleNavy: {
    color: 'rgba(20, 169, 181, 0.78)',
  },
  subtitleLanding: {
    textAlign: 'center',
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPremium: {
    ...shadows.lg,
    borderColor: 'rgba(11, 42, 67, 0.07)',
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
  footerCompact: {
    alignItems: 'center',
  },
  stepBar: {
    flexDirection: 'row',
    gap: 6,
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
