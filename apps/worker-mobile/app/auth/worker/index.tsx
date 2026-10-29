import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuthDensity } from '@/hooks/useAuthDensity';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';

function ChoicePrimary({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    sheen.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 2400 }),
        ),
        -1,
        false,
      ),
    );
  }, [reduced, sheen]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const iconMotion = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));
  const sheenMotion = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.35, 0.7, 1], [0, 0.28, 0.12, 0]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-80, 220]) }],
  }));

  return (
    <Animated.View style={[styles.choiceWrap, motion]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.97, { damping: 16, stiffness: 420 });
          nudge.value = withSpring(5, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={styles.primaryBtn}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(11, 42, 67, 0.55)',
            'rgba(12, 62, 86, 0.48)',
            'rgba(20, 169, 181, 0.42)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.primarySheen} />
        {!reduced ? (
          <Animated.View pointerEvents="none" style={[styles.sheenSweep, sheenMotion]} />
        ) : null}
        <Text style={styles.primaryLabel}>{label}</Text>
        <Animated.View style={iconMotion}>
          <Ionicons name="arrow-forward" size={17} color={colors.yellow} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function ChoiceSecondary({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const shellMotion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      press.value,
      [0, 1],
      ['rgba(20, 169, 181, 0.35)', 'rgba(20, 169, 181, 0.62)'],
    ),
    backgroundColor: interpolateColor(
      press.value,
      [0, 1],
      ['rgba(20, 169, 181, 0.12)', 'rgba(20, 169, 181, 0.22)'],
    ),
  }));

  return (
    <Animated.View style={[styles.choiceWrap, styles.secondaryShell, shellMotion]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.97, { damping: 16, stiffness: 420 });
          press.value = withTiming(1, { duration: 140 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          press.value = withTiming(0, { duration: 200 });
        }}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function FooterEmailLink({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      press.value,
      [0, 1],
      ['rgba(20, 169, 181, 0.28)', 'rgba(228, 179, 52, 0.45)'],
    ),
    backgroundColor: interpolateColor(
      press.value,
      [0, 1],
      ['rgba(20, 169, 181, 0.1)', 'rgba(20, 169, 181, 0.18)'],
    ),
  }));

  return (
    <Animated.View style={[styles.footerChip, motion]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel="Sign in with email"
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.97, { damping: 16, stiffness: 420 });
          press.value = withTiming(1, { duration: 140 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          press.value = withTiming(0, { duration: 200 });
        }}
        style={styles.footerLinkHit}
      >
        <View style={styles.footerIcon}>
          <Ionicons name="mail-outline" size={14} color={colors.yellow} />
        </View>
        <Text style={styles.footerMuted}>Prefer email?</Text>
        <Text style={styles.footerLink}>Sign in</Text>
        <Ionicons name="arrow-forward" size={13} color={colors.yellow} />
      </Pressable>
    </Animated.View>
  );
}

export default function WorkerAuthLandingScreen() {
  const { session, loading, homeRoute } = useAuth();
  const reduced = useReducedMotion();
  const density = useAuthDensity();

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  const enter = (delay: number) =>
    reduced ? undefined : FadeInDown.delay(delay).duration(420).springify().damping(18);

  return (
    <AuthShell
      title="How would you like to continue?"
      subtitle="Create a professional account or sign in to manage shifts, documents and payment records."
      showBack
      onBack={() => router.replace('/welcome?revisit=1')}
      centered
      compact
      tone="navy"
      footer={
        <Animated.View entering={enter(320)} style={styles.footer}>
          <FooterEmailLink onPress={() => router.push('/auth/worker/login')} />
        </Animated.View>
      }
    >
      <View style={[styles.actions, density === 'compact' && styles.actionsTight]}>
        <Animated.View entering={enter(80)} style={styles.actionSlot}>
          <ChoicePrimary
            label="Create account"
            onPress={() => router.push('/auth/worker/register')}
          />
        </Animated.View>
        <Animated.View entering={enter(160)} style={styles.actionSlot}>
          <ChoiceSecondary
            label="Sign in"
            onPress={() => router.push('/auth/worker/login')}
          />
        </Animated.View>
        <Animated.View entering={enter(240)} style={styles.googleWrap}>
          <GoogleSignInButton compact glass />
        </Animated.View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  actionsTight: {
    gap: spacing.sm + 2,
  },
  actionSlot: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  choiceWrap: {
    width: '100%',
    maxWidth: 280,
    borderRadius: radii.full,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: radii.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.45)',
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
    width: 56,
    backgroundColor: 'rgba(228, 179, 52, 0.18)',
    transform: [{ skewX: '-18deg' }],
  },
  primaryLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#D7EEF2',
    letterSpacing: -0.2,
  },
  secondaryShell: {
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.35)',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    overflow: 'hidden',
  },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  secondaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#B8E4EA',
    letterSpacing: -0.2,
  },
  googleWrap: {
    width: '100%',
    maxWidth: 280,
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  footerChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    backgroundColor: 'rgba(20, 169, 181, 0.1)',
    overflow: 'hidden',
  },
  footerLinkHit: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 179, 52, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(228, 179, 52, 0.35)',
  },
  footerMuted: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    letterSpacing: 0.1,
    color: 'rgba(184, 228, 234, 0.78)',
  },
  footerLink: {
    fontFamily: typography.fonts.bold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: '#D7EEF2',
  },
});
