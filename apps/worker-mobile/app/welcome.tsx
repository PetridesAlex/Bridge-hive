import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
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
            colors={[colors.tealStrong, '#0A6C78', colors.yellow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Text
          style={[
            styles.actionLabel,
            tone === 'secondary' && styles.actionLabelSecondary,
          ]}
        >
          {label}
        </Text>
        {tone === 'primary' ? (
          <Ionicons
            name="arrow-forward"
            size={18}
            color={WELCOME_NAVY}
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
    if (checking || reduced) return;
    enter.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [checking, enter, reduced]);

  const heroMotion = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }],
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
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <Animated.View style={[styles.hero, heroMotion]}>
          <BridgeHiveMark size={88} style={styles.mark} />
          <Text style={styles.eyebrow}>BRIDGEHIVE FOR PROFESSIONALS</Text>
          <Text style={styles.title}>
            Healthcare shifts,{'\n'}structured around you.
          </Text>
          <Text style={styles.subtitle}>
            Discover verified opportunities for nurses, ward assistants and
            physiotherapists.
          </Text>
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : FadeInDown.delay(180).duration(420)}
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
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    top: -40,
    right: -80,
  },
  textureB: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(228, 179, 52, 0.08)',
    bottom: '18%',
    left: -90,
  },
  honeyCell: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(228, 179, 52, 0.18)',
    transform: [{ rotate: '30deg' }],
    top: '42%',
    right: 28,
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
    letterSpacing: 1.4,
    color: 'rgba(228, 179, 52, 0.92)',
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    lineHeight: 26,
    color: 'rgba(247, 251, 253, 0.78)',
    maxWidth: 360,
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
    minHeight: 52,
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
    borderWidth: 1,
    borderColor: 'rgba(247, 251, 253, 0.28)',
    backgroundColor: 'rgba(247, 251, 253, 0.06)',
  },
  actionLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: WELCOME_NAVY,
  },
  actionLabelSecondary: {
    color: colors.white,
  },
  actionIcon: {
    marginLeft: 4,
  },
});
