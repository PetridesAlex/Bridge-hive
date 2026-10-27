import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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
}: {
  label: string;
  tone: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.actionWrap, motionStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={[
          styles.action,
          tone === 'primary' ? styles.actionPrimary : styles.actionSecondary,
        ]}
      >
        {tone === 'primary' ? (
          <LinearGradient
            pointerEvents="none"
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
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
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.yellow}
            style={styles.actionIcon}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { session, loading, homeRoute } = useAuth();
  const reduced = useReducedMotion();
  const [checking, setChecking] = useState(true);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    let alive = true;
    void hasCompletedOnboarding().then((done) => {
      if (!alive) return;
      if (done && !session) {
        router.replace('/auth/worker/login');
        return;
      }
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [session]);

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
      <View pointerEvents="none" style={styles.textureA} />
      <View pointerEvents="none" style={styles.textureB} />
      <View pointerEvents="none" style={styles.honeyCell} />
      <View pointerEvents="none" style={styles.honeyCellSoft} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <Animated.View style={[styles.hero, heroMotion]}>
          <BridgeHiveMark size={96} style={styles.mark} />
          <Text style={styles.eyebrow}>BRIDGEHIVE FOR PROFESSIONALS</Text>
          <Text style={styles.title} accessibilityRole="header">
            Healthcare shifts,{'\n'}structured around you.
          </Text>
          <Text style={styles.subtitle}>
            Discover verified opportunities for nurses, ward assistants and
            physiotherapists.
          </Text>
          <Animated.View style={[styles.cues, cuesMotion]}>
            {TRUST_CUES.map((cue) => (
              <View key={cue.label} style={styles.cueRow}>
                <View style={styles.cueIcon}>
                  <Ionicons name={cue.icon} size={16} color={colors.yellow} />
                </View>
                <Text style={styles.cueLabel}>{cue.label}</Text>
              </View>
            ))}
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : FadeInDown.delay(220).duration(420)}
          style={styles.actions}
        >
          <WelcomeAction label="Get started" tone="primary" onPress={() => void goStarted()} />
          <WelcomeAction
            label="I already have an account"
            tone="secondary"
            onPress={() => void goSignIn()}
          />
        </Animated.View>
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
    backgroundColor: 'rgba(20, 169, 181, 0.1)',
    top: -60,
    right: -100,
  },
  textureB: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(228, 179, 52, 0.07)',
    bottom: '16%',
    left: -110,
  },
  honeyCell: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(228, 179, 52, 0.16)',
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
    borderColor: 'rgba(20, 169, 181, 0.14)',
    transform: [{ rotate: '18deg' }],
    top: '48%',
    right: 86,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  hero: {
    marginTop: spacing.xxxl,
    gap: spacing.lg,
    maxWidth: 420,
  },
  mark: {
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    color: colors.yellow,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    lineHeight: 26,
    color: 'rgba(247, 251, 253, 0.92)',
    maxWidth: 360,
  },
  cues: {
    gap: 12,
    marginTop: spacing.md,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cueIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 179, 52, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(228, 179, 52, 0.28)',
  },
  cueLabel: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(247, 251, 253, 0.88)',
  },
  actions: {
    gap: spacing.md,
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  actionWrap: {
    width: '100%',
    maxWidth: 420,
  },
  action: {
    minHeight: 54,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    gap: 10,
  },
  actionPrimary: {
    ...shadows.lg,
  },
  actionSecondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(247, 251, 253, 0.45)',
    backgroundColor: 'rgba(247, 251, 253, 0.1)',
  },
  actionLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  actionLabelPrimary: {
    color: colors.white,
  },
  actionLabelSecondary: {
    color: colors.white,
  },
  actionIcon: {
    marginLeft: 4,
  },
});
