import { Redirect, router } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createSessionFromUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

/**
 * OAuth return landing. Establishes the session then goes straight to home —
 * no blank navy intermediate canvas.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const { session, loading, homeRoute } = useAuth();
  const reduced = useReducedMotion();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<'working' | 'ready' | 'failed'>('working');
  const started = useRef(false);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    const run = async () => {
      const href =
        url ??
        (typeof window !== 'undefined' ? window.location.href : null);

      if (href) {
        const result = await createSessionFromUrl(href);
        if (cancelled) return;
        if (result.error) {
          await new Promise((r) => setTimeout(r, 400));
          if (cancelled) return;
        }
      }

      await new Promise((r) => setTimeout(r, 250));
      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setPhase('ready');
        return;
      }

      if (href) {
        const retry = await createSessionFromUrl(href);
        if (cancelled) return;
        if (retry.error) {
          setError(retry.error);
          setPhase('failed');
          return;
        }
      }

      const again = await supabase.auth.getSession();
      if (cancelled) return;
      if (again.data.session) {
        setPhase('ready');
        return;
      }

      setError('We could not finish Google sign-in. Please try again.');
      setPhase('failed');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const ctaMotion = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  if (session && !loading && phase !== 'failed') {
    return <Redirect href={homeRoute as never} />;
  }

  if (phase !== 'failed') {
    return (
      <View style={styles.working}>
        <HiveFlowBackground />
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <HiveFlowBackground />
      <Animated.View
        entering={reduced ? undefined : FadeInDown.duration(380).springify().damping(18)}
        style={styles.card}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#071E33', '#0B2A43', '#0E4A5C']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View entering={reduced ? undefined : FadeIn.duration(280)}>
          <BridgeHiveMark variant="boot" size={56} />
        </Animated.View>
        <Text style={styles.eyebrow}>Bridge Hive</Text>
        <View style={styles.rule} />
        <Text style={styles.title}>Sign-in interrupted</Text>
        <Text style={styles.copy}>
          {error ?? 'Something went wrong returning from Google. Your account was not changed.'}
        </Text>
        <Animated.View style={ctaMotion}>
          <Pressable
            style={styles.cta}
            onPress={() => router.replace('/auth/worker/login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            onPressIn={() => {
              if (!reduced) ctaScale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
            }}
            onPressOut={() => {
              if (!reduced) ctaScale.value = withSpring(1, { damping: 14, stiffness: 260 });
            }}
          >
            <LinearGradient
              colors={['#F4C542', '#E8B530']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaFill}
            >
              <Text style={styles.ctaLabel}>Back to sign in</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  working: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.md,
  },
  eyebrow: {
    marginTop: spacing.sm,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(184, 228, 234, 0.85)',
  },
  rule: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F4C542',
    marginVertical: 4,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.white,
    textAlign: 'center',
  },
  copy: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.lg,
    borderRadius: radii.full,
    overflow: 'hidden',
    minWidth: 200,
  },
  ctaFill: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg + 4,
    alignItems: 'center',
  },
  ctaLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 15,
    letterSpacing: -0.1,
    color: colors.navy,
  },
});
