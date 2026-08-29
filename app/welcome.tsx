import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, loading, homeRoute } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      router.replace(homeRoute as never);
    }
  }, [loading, session, homeRoute]);

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#04101F', colors.navy, '#0B2A4A']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.brandBlock}>
          <Text style={styles.brand}>HealthBridge</Text>
          <Text style={styles.tagline}>Healthcare staffing for Cyprus</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(500)} style={styles.cards}>
          <Text style={styles.continueLabel}>Continue as</Text>

          <Pressable
            onPress={() => router.push('/auth/professional/login')}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Continue as Professional"
          >
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(245,176,0,0.18)' }]}>
              <Ionicons name="medkit" size={26} color={colors.yellow} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Professional</Text>
              <Text style={styles.cardSub}>Find shifts, manage availability, and grow your practice</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.yellow} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/auth/organization/login')}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Continue as Organization"
          >
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(23,105,224,0.2)' }]}>
              <Ionicons name="business" size={26} color={colors.blue} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Organization</Text>
              <Text style={styles.cardSub}>Staff your facility and manage healthcare teams</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.blue} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(450)} style={styles.adminRow}>
          <Pressable
            onPress={() => router.push('/auth/admin/login')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Admin sign in"
          >
            <Text style={styles.adminLink}>Admin Sign In</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  orbTop: {
    width: 220,
    height: 220,
    top: -60,
    right: -40,
    backgroundColor: colors.blue,
  },
  orbBottom: {
    width: 280,
    height: 280,
    bottom: -80,
    left: -90,
    backgroundColor: colors.yellow,
    opacity: 0.12,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  brand: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.display,
    color: colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  cards: {
    gap: spacing.md,
  },
  continueLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
  cardSub: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
  },
  adminRow: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  adminLink: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
  },
});
