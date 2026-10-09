import { Redirect, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WelcomeScreen() {
  const { session, loading, homeRoute } = useAuth();

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <BridgeHiveMark size={56} />
          <Text style={styles.brand}>Bridge Hive</Text>
          <Text style={styles.title}>Healthcare shifts,{'\n'}built for workers</Text>
          <Text style={styles.subtitle}>
            Find verified nursing, ward assistant, and physiotherapy shifts across Cyprus. Claim
            once — first eligible worker wins.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Sign in"
            variant="primary"
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxxl,
  },
  hero: {
    marginTop: spacing.huge,
    gap: spacing.md,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    maxWidth: 340,
  },
  actions: { gap: spacing.md },
  note: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
