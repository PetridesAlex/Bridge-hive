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

export default function OrganizationPendingScreen() {
  const {
    session,
    loading,
    accountType,
    isOrganizationVerified,
    organizationMembership,
    member,
    signOut,
    refreshProfile,
    homeRoute,
  } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (accountType !== 'ORGANIZATION_USER') {
    return <Redirect href={homeRoute as never} />;
  }

  if (isOrganizationVerified) {
    return <Redirect href="/(org)" />;
  }

  const org = organizationMembership?.organization;
  const status = org?.verificationStatus ?? 'PENDING_VERIFICATION';

  return (
    <AppScreen>
      <ScreenHeader title="Verification" subtitle="Organization account" />

      <Card style={styles.hero}>
        <Badge
          label={status.replace(/_/g, ' ')}
          color={colors.navy}
          backgroundColor={colors.yellow}
          icon="business"
        />
        <Text style={styles.title}>Organization under review</Text>
        <Text style={styles.body}>
          Hi {member.firstName}, {org?.name ?? 'your organization'} is pending HealthBridge verification.
          The workspace unlocks after approval.
        </Text>
        {org ? (
          <Text style={styles.meta}>
            {org.city}, Cyprus · {organizationMembership?.role.replace(/_/g, ' ')}
          </Text>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button label="Refresh status" variant="secondary" onPress={() => void refreshProfile()} />
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
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
