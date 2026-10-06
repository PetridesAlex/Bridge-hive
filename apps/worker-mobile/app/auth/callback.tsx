import { Redirect, router } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { createSessionFromUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

/**
 * OAuth return landing (Expo web + deep link). Establishes one session then redirects.
 * GET never logs tokens. Soft-fails without redbox when the code was already exchanged.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const { loading, session, homeRoute } = useAuth();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<'working' | 'ready' | 'failed'>('working');
  const started = useRef(false);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false,
    );
  }, [pulse]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

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
          // Give auth state a moment — another handler may have already set the session.
          await new Promise((r) => setTimeout(r, 400));
          if (cancelled) return;
        }
      }

      // Brief settle so AuthProvider hydrate can catch up before we decide.
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

  if ((!loading && session) || (phase === 'ready' && !loading && session)) {
    return <Redirect href={homeRoute as never} />;
  }

  if (phase === 'ready') {
    return (
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(280)} style={styles.card}>
          <BridgeHiveMark size={48} />
          <Text style={styles.brand} accessibilityRole="header">
            Bridge Hive
          </Text>
          <Text style={styles.title}>You are signed in</Text>
          <Text style={styles.copy}>Taking you to your workspace…</Text>
          <ActivityIndicator color={colors.tealStrong} style={styles.spinner} />
        </Animated.View>
      </View>
    );
  }

  if (phase === 'failed') {
    return (
      <View style={styles.root}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.card}>
          <BridgeHiveMark size={48} />
          <Text style={styles.brand}>Bridge Hive</Text>
          <Text style={styles.title}>Sign-in interrupted</Text>
          <Text style={styles.copy}>
            {error ?? 'Something went wrong returning from Google. Your account was not changed.'}
          </Text>
          <Pressable
            style={styles.cta}
            onPress={() => router.replace('/auth/worker/login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Text style={styles.ctaLabel}>Back to sign in</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(280)} style={styles.card}>
        <Animated.View style={[styles.markWrap, markStyle]}>
          <BridgeHiveMark size={48} />
        </Animated.View>
        <Text style={styles.brand}>Bridge Hive</Text>
        <Text style={styles.title}>Securing your session</Text>
        <Text style={styles.copy}>Finishing Google sign-in — this only takes a moment.</Text>
        <ActivityIndicator color={colors.tealStrong} style={styles.spinner} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  markWrap: {
    marginBottom: spacing.sm,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  copy: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  spinner: {
    marginTop: spacing.md,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.tealStrong,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    minWidth: 180,
    alignItems: 'center',
  },
  ctaLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: '#fff',
  },
});
