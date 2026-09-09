import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { brandGradient, colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WelcomeScreen() {
  const { session, loading, homeRoute } = useAuth();

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <LinearGradient colors={[...brandGradient]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markLetter}>B</Text>
          </View>
          <Text style={styles.brand}>Bridge Hive</Text>
          <Text style={styles.title}>Healthcare shifts,{'\n'}built for workers</Text>
          <Text style={styles.subtitle}>
            Find verified nursing and ward assistant shifts across Cyprus. Claim once — first
            eligible worker wins.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Sign in"
            variant="brand"
            size="lg"
            onPress={() => router.push('/auth/worker/login')}
          />
          <Button
            label="Create worker account"
            variant="secondary"
            size="lg"
            onPress={() => router.push('/auth/worker/register')}
          />
          <Text style={styles.note}>
            Organization and platform admin accounts use the Bridge Hive web portal.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxxl,
  },
  hero: {
    marginTop: spacing.huge,
    gap: spacing.md,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markLetter: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 30,
    color: colors.navy,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.yellow,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 34,
    lineHeight: 40,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.72)',
    maxWidth: 340,
  },
  actions: { gap: spacing.md },
  note: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
