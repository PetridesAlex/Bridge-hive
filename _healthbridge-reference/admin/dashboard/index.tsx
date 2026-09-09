import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

type Stat = { label: string; value: string };

export default function SuperAdminScreen() {
  const router = useRouter();
  const { isSuperAdmin, member, loading, homeRoute } = useAuth();
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Members', value: '—' },
    { label: 'Super admins', value: '—' },
    { label: 'Verified', value: '—' },
  ]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    void (async () => {
      const { data, error } = await supabase.from('profiles').select('app_role, verification_status');
      if (error || !data) {
        setStats([
          { label: 'Members', value: 'n/a' },
          { label: 'Super admins', value: '1' },
          { label: 'Verified', value: 'n/a' },
        ]);
        return;
      }

      const members = data.length;
      const admins = data.filter((r) => r.app_role === 'SUPER_ADMIN').length;
      const verified = data.filter((r) => r.verification_status === 'VERIFIED').length;
      setStats([
        { label: 'Members', value: String(members) },
        { label: 'Super admins', value: String(admins) },
        { label: 'Verified', value: String(verified) },
      ]);
    })();
  }, [isSuperAdmin]);

  if (!loading && !isSuperAdmin) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <AppScreen>
      <ScreenHeader
        title="Super Admin"
        subtitle="Platform control"
        showBack
        onBack={() => router.replace('/(tabs)')}
      />

      <Button
        label="Exit to dashboard"
        variant="brand"
        size="lg"
        onPress={() => router.replace('/(tabs)')}
        style={styles.exitBtn}
      />

      <Card style={styles.hero}>
        <Badge label="SUPER ADMIN" color={colors.navy} backgroundColor={colors.yellow} icon="shield" />
        <Text style={styles.heroTitle}>{member.fullName}</Text>
        <Text style={styles.heroEmail}>{member.email}</Text>
        <Text style={styles.heroBody}>
          You have platform-wide access. Use Exit to dashboard for the main app; admin tools will
          expand here as Phase 2 grows.
        </Text>
      </Card>

      <Text style={styles.sectionLabel}>Platform snapshot</Text>
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <Card key={stat.label} style={styles.statCard} elevated={false}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      <Card style={styles.roadmap}>
        <Text style={styles.roadmapTitle}>Coming next</Text>
        <Text style={styles.roadmapItem}>• Organization / hospital accounts</Text>
        <Text style={styles.roadmapItem}>• Shift & marketplace moderation</Text>
        <Text style={styles.roadmapItem}>• Document verification queue</Text>
        <Text style={styles.roadmapItem}>• Payouts & invoice oversight</Text>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  exitBtn: {
    marginBottom: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.xl,
    color: colors.navy,
    letterSpacing: -0.4,
    marginTop: spacing.xs,
  },
  heroEmail: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.blue,
  },
  heroBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.blueLight,
    borderColor: colors.blueLight,
  },
  statValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.xxl,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  roadmap: {
    gap: spacing.xs,
  },
  roadmapTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.md,
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  roadmapItem: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
});
