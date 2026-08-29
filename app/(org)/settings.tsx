import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function OrgSettingsScreen() {
  const { member, organizationMembership, signOut } = useAuth();
  const org = organizationMembership?.organization;

  return (
    <AppScreen>
      <ScreenHeader title="Settings" showBack subtitle={org?.name} />

      <Card style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{member.fullName}</Text>
        <Text style={styles.meta}>{member.email}</Text>
        {organizationMembership ? (
          <Text style={styles.meta}>{organizationMembership.role.replace(/_/g, ' ')}</Text>
        ) : null}
      </Card>

      <Button
        label="Sign out"
        variant="danger"
        onPress={() => void signOut().then(() => router.replace('/welcome'))}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.lg },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
});
