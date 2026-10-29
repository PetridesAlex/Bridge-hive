import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuthDensity } from '@/hooks/useAuthDensity';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { welcomeMetrics } from '@/lib/auth-density';
import {
  hasCompletedOnboarding,
  markOnboardingSeen,
} from '@/lib/onboarding-preference';
import { useAuth } from '@/providers/AuthProvider';

const WELCOME_NAVY = '#071A2F';

const TRUST_CUES = [
  {
    icon: 'shield-checkmark-outline' as const,
    label: 'Verified professional roles',
  },
  {
    icon: 'document-text-outline' as const,
    label: 'Credentials checked before shifts',
  },
  {
    icon: 'wallet-outline' as const,
    label: 'Shifts and payment records together',
  },
];

function WelcomeAction({
  label,
  tone,
  onPress,
  enterDelay = 0,
}: {
  label: string;
  tone: 'primary' | 'secondary';
  onPress: () => void;
  enterDelay?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const breath = useSharedValue(0);
  const press = useSharedValue(0);
  const nudge = useSharedValue(0);
  const sheen = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breath.value = withDelay(
      enterDelay + 200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    if (tone !== 'primary') return;
    sheen.value = withDelay(
      enterDelay + 400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 1800 }),
        ),
        -1,
        false,
      ),
    );
    glow.value = withDelay(
      enterDelay + 300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [breath, enterDelay, glow, reduced, sheen, tone]);

  const wrapMotion = useAnimatedStyle(() => {
    const idle = tone === 'primary' ? interpolate(breath.value, [0, 1], [1, 1.018]) : 1;
    return {
      transform: [{ scale: scale.value * idle }],
    };
  });

  const shellMotion = useAnimatedStyle(() => {
    if (tone === 'primary') {
      return {
        borderColor: interpolateColor(
          Math.max(press.value, glow.value * 0.7),
          [0, 1],
          ['rgba(20, 169, 181, 0.42)', 'rgba(228, 179, 52, 0.72)'],
        ),
        shadowOpacity: interpolate(glow.value, [0, 1], [0.18, 0.42]),
      };
    }
    return {
      borderColor: interpolateColor(
        press.value,
        [0, 1],
        ['rgba(20, 169, 181, 0.38)', 'rgba(228, 179, 52, 0.55)'],
      ),
      backgroundColor: interpolateColor(
        press.value,
        [0, 1],
        ['rgba(20, 169, 181, 0.12)', 'rgba(20, 169, 181, 0.22)'],
      ),
    };
  });

  const iconMotion = useAnimatedStyle(() => ({
    transform: [
      { translateX: nudge.value + interpolate(breath.value, [0, 1], [0, 2]) },
    ],
  }));

  const sheenMotion = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.35, 0.7, 1], [0, 0.3, 0.12, 0]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-100, 260]) }],
  }));

  const glowMotion = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.12, 0.34]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.92, 1.08]) }],
  }));

  const entering = reduced
    ? undefined
    : FadeInDown.delay(enterDelay).duration(460).springify().damping(16);

  return (
    <Animated.View entering={entering} style={[styles.actionWrap, wrapMotion]}>
      {tone === 'primary' && !reduced ? (
        <Animated.View pointerEvents="none" style={[styles.actionGlow, glowMotion]} />
      ) : null}
      <Animated.View
        style={[
          styles.actionShell,
          tone === 'primary' ? styles.actionPrimary : styles.actionSecondary,
          shellMotion,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          onPressIn={() => {
            if (reduced) return;
            scale.value = withSpring(0.965, { damping: 16, stiffness: 420 });
            press.value = withTiming(1, { duration: 120 });
            nudge.value = withSpring(6, { damping: 14, stiffness: 320 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 260 });
            press.value = withTiming(0, { duration: 200 });
            nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
          }}
          style={styles.action}
        >
          {tone === 'primary' ? (
            <>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(11, 42, 67, 0.78)',
                  'rgba(12, 62, 86, 0.66)',
                  'rgba(20, 169, 181, 0.58)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.primarySheen} />
              {!reduced ? (
                <Animated.View pointerEvents="none" style={[styles.sheenSweep, sheenMotion]} />
              ) : null}
            </>
          ) : null}
          <Text
            style={[
              styles.actionLabel,
              tone === 'primary' ? styles.actionLabelPrimary : styles.actionLabelSecondary,
            ]}
          >
            {label}
          </Text>
          {tone === 'primary' ? (
            <Animated.View style={iconMotion}>
              <Ionicons name="arrow-forward" size={18} color={colors.yellow} />
            </Animated.View>
          ) : (
            <Ionicons name="log-in-outline" size={17} color="#B8E4EA" />
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { session, loading, homeRoute } = useAuth();
  const params = useLocalSearchParams<{ revisit?: string }>();
  const revisit = params.revisit === '1';
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const density = useAuthDensity();
  const w = welcomeMetrics(density);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  /** Scroll only when content genuinely overflows (very small phones / large text). */
  const overflowing = viewportHeight > 0 && contentHeight > viewportHeight + 1;
  const [checking, setChecking] = useState(true);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    let alive = true;
    void hasCompletedOnboarding().then((done) => {
      if (!alive) return;
      // Allow an explicit revisit from the auth landing back control.
      if (done && !session && !revisit) {
        router.replace('/auth/worker/login');
        return;
      }
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [revisit, session]);

  useEffect(() => {
    if (checking || reduced) {
      if (!checking && reduced) enter.value = 1;
      return;
    }
    enter.value = withDelay(
      40,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }),
    );
  }, [checking, enter, reduced]);

  const heroMotion = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 16 }],
  }));

  const cuesMotion = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.35, 1], [0, 1]),
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  if (checking) {
    return <View style={styles.root} />;
  }

  const goStarted = async () => {
    await markOnboardingSeen();
    router.replace('/auth/worker');
  };

  const goSignIn = async () => {
    await markOnboardingSeen();
    router.replace('/auth/worker/login');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.textureA} />
      <View pointerEvents="none" style={styles.textureB} />
      <View pointerEvents="none" style={styles.honeyCell} />
      <View pointerEvents="none" style={styles.honeyCellSoft} />
      {/* Bottom inset is applied inside the scroll content so actions clear the home indicator. */}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.safe}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => setContentHeight(h)}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: w.top,
              paddingBottom: Math.max(insets.bottom, spacing.md) + w.bottom,
            },
          ]}
          scrollEnabled={overflowing}
          bounces={overflowing}
          alwaysBounceVertical={false}
          alwaysBounceHorizontal={false}
          overScrollMode={overflowing ? 'auto' : 'never'}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.heroSlot}>
            <Animated.View style={[styles.hero, { gap: w.heroGap }, heroMotion]}>
              <BridgeHiveMark size={w.mark} />
              <Text style={styles.eyebrow}>BRIDGEHIVE FOR PROFESSIONALS</Text>
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: w.title.size,
                    lineHeight: w.title.line,
                    letterSpacing: w.title.tracking,
                  },
                ]}
                accessibilityRole="header"
              >
                Healthcare shifts,{'\n'}structured around you.
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { fontSize: w.subtitle.size, lineHeight: w.subtitle.line },
                ]}
              >
                Discover verified opportunities for nurses, ward assistants and
                physiotherapists.
              </Text>
              <Animated.View
                style={[styles.cues, { gap: w.cueGap, marginTop: w.cuesTop }, cuesMotion]}
              >
                {TRUST_CUES.map((cue) => (
                  <View
                    key={cue.label}
                    style={[styles.cueRow, { paddingVertical: w.cuePadV }]}
                  >
                    <View
                      style={[
                        styles.cueIcon,
                        { width: w.cueIcon, height: w.cueIcon },
                      ]}
                    >
                      <Ionicons name={cue.icon} size={17} color={colors.yellow} />
                    </View>
                    <Text
                      style={[
                        styles.cueLabel,
                        { fontSize: w.cueLabel.size, lineHeight: w.cueLabel.line },
                      ]}
                    >
                      {cue.label}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          </View>

          <View style={[styles.actions, { gap: w.actionGap, paddingTop: w.actionsTop }]}>
            <WelcomeAction
              label="Get started"
              tone="primary"
              enterDelay={220}
              onPress={() => void goStarted()}
            />
            <WelcomeAction
              label="I already have an account"
              tone="secondary"
              enterDelay={340}
              onPress={() => void goSignIn()}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WELCOME_NAVY,
  },
  textureA: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    top: -60,
    right: -100,
  },
  textureB: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(228, 179, 52, 0.08)',
    bottom: '16%',
    left: -110,
  },
  honeyCell: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(228, 179, 52, 0.18)',
    transform: [{ rotate: '30deg' }],
    top: '38%',
    right: 24,
  },
  honeyCellSoft: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.16)',
    transform: [{ rotate: '18deg' }],
    top: '48%',
    right: 86,
  },
  safe: {
    flex: 1,
  },
  /** Hero floats centered in free space; CTAs stay anchored to the bottom. */
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  heroSlot: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: {
    maxWidth: 420,
  },
  eyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    color: colors.yellow,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    color: '#D7EEF2',
  },
  subtitle: {
    fontFamily: typography.fonts.medium,
    letterSpacing: -0.2,
    color: 'rgba(20, 169, 181, 0.92)',
    maxWidth: 360,
  },
  cues: {},
  cueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    backgroundColor: 'rgba(20, 169, 181, 0.1)',
  },
  cueIcon: {
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 179, 52, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(228, 179, 52, 0.38)',
  },
  cueLabel: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    letterSpacing: -0.1,
    color: '#D7EEF2',
  },
  actions: {
    alignItems: 'center',
  },
  actionWrap: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  actionGlow: {
    position: 'absolute',
    width: '88%',
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 169, 181, 0.35)',
    top: 8,
  },
  actionShell: {
    width: '100%',
    borderRadius: radii.full,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#14A9B5',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  action: {
    minHeight: 56,
    borderRadius: radii.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    gap: 10,
  },
  actionPrimary: {
    borderColor: 'rgba(20, 169, 181, 0.48)',
  },
  actionSecondary: {
    borderColor: 'rgba(20, 169, 181, 0.38)',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primarySheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
  },
  sheenSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 64,
    backgroundColor: 'rgba(228, 179, 52, 0.22)',
    transform: [{ skewX: '-18deg' }],
  },
  actionLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  actionLabelPrimary: {
    color: '#D7EEF2',
  },
  actionLabelSecondary: {
    color: '#B8E4EA',
  },
});
