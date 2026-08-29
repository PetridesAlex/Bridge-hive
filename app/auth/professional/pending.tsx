import { Redirect, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfessionalPendingScreen() {
  const {
    session,
    loading,
    accountType,
    isVerifiedProfessional,
    member,
    signOut,
    refreshProfile,
    homeRoute,
  } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (accountType !== 'PROFESSIONAL') {
    return <Redirect href={homeRoute as never} />;
  }

  if (isVerifiedProfessional) {
    return <Redirect href="/(tabs)" />;
  }

  const status = member.professionalStatus;
  const statusLabel =
    status === 'PENDING_VERIFICATION'
      ? 'Pending verification'
      : status === 'REJECTED'
        ? 'Application rejected'
        : status === 'DRAFT'
          ? 'Draft application'
          : status === 'SUSPENDED'
            ? 'Account suspended'
            : 'Unverified';

  return (
    <AppScreen>
      <ScreenHeader title="Verification" subtitle="Professional account" />

      <Card style={styles.hero}>
        <Badge
          label={statusLabel.toUpperCase()}
          color={colors.navy}
          backgroundColor={colors.yellow}
          icon="time"
        />
        <Text style={styles.title}>Application submitted</Text>
        <Text style={styles.body}>
          Hi {member.firstName}, your professional profile is under review. You’ll unlock full shift
          booking once a HealthBridge admin verifies your credentials.
        </Text>
        <Text style={styles.meta}>
          {member.professionalRoleName} · {member.city}, Cyprus
        </Text>
      </Card>

      <Card elevated={false} style={styles.list}>
        <Text style={styles.listTitle}>While you wait</Text>
        <Text style={styles.listItem}>• Keep an eye on your email for updates</Text>
        <Text style={styles.listItem}>• Prepare license and ID documents</Text>
        <Text style={styles.listItem}>• Accept Shift stays disabled until verified</Text>
      </Card>

      <View style={styles.actions}>
        <Button label="Refresh status" variant="secondary" onPress={() => void refreshProfile()} />
        <Button label="Open app (limited)" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        <Button label="Documents" variant="ghost" onPress={() => router.push('/documents')} />
        <Button label="Availability" variant="ghost" onPress={() => router.push('/availability')} />
        <Button
          label="Sign out"
          variant="danger"
          onPress={() => void signOut().then(() => router.replace('/welcome'))}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.xl,
    color: colors.navy,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  meta: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.blue,
  },
  list: { gap: spacing.sm },
  listTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  listItem: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
