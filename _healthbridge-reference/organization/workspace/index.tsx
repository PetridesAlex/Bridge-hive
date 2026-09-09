import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function OrgWorkspaceScreen() {
  const { organizationMembership, member, signOut } = useAuth();
  const org = organizationMembership?.organization;

  return (
    <AppScreen>
      <ScreenHeader
        title={org?.name ?? 'Organization'}
        subtitle="Workspace"
        right={
          <Button
            label="Settings"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/(org)/settings')}
          />
        }
      />

      <Card style={styles.hero}>
        <Badge
          label="VERIFIED"
          color={colors.white}
          backgroundColor={colors.success}
          icon="checkmark-circle"
        />
        <Text style={styles.heroTitle}>Organization workspace</Text>
        <Text style={styles.heroBody}>
          Welcome, {member.firstName}. Full staffing ops (shifts, applications, invoices) will live in
          the web portal. This mobile shell keeps you signed in.
        </Text>
      </Card>

      <Text style={styles.section}>Snapshot</Text>
      <View style={styles.stats}>
        {[
          { label: 'Open shifts', value: '—' },
          { label: 'Applicants', value: '—' },
          { label: 'This week', value: '—' },
        ].map((s) => (
          <Card key={s.label} elevated={false} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.section}>Upcoming shifts</Text>
      <Card elevated={false}>
        <Text style={styles.empty}>
          No shifts yet — create shifts from the web portal (coming soon).
        </Text>
      </Card>

      <Text style={styles.section}>Quick actions</Text>
      <View style={styles.actions}>
        <Button label="Create shift" variant="secondary" disabled onPress={() => undefined} />
        <Text style={styles.coming}>Coming soon</Text>
        <Button label="Applications" variant="secondary" disabled onPress={() => undefined} />
        <Text style={styles.coming}>Coming soon</Text>
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
  heroTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.xl,
    color: colors.navy,
  },
  heroBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
  },
  statValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.xl,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  empty: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  actions: { gap: spacing.sm },
  coming: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: -4,
    marginBottom: spacing.xs,
  },
});
