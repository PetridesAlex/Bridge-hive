import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Qualification = {
  title: string;
  issuer: string;
  year: string;
  status: 'Active' | 'Completed';
  icon: keyof typeof Ionicons.glyphMap;
};

const QUALIFICATIONS: Qualification[] = [
  {
    title: 'BSc Nursing',
    issuer: 'University of Cyprus',
    year: '2018',
    status: 'Completed',
    icon: 'school-outline',
  },
  {
    title: 'CPR / BLS',
    issuer: 'Cyprus Red Cross',
    year: 'Active',
    status: 'Active',
    icon: 'heart-outline',
  },
  {
    title: 'IV Therapy',
    issuer: 'Clinical Skills Programme',
    year: '2024',
    status: 'Completed',
    icon: 'medkit-outline',
  },
];

export function QualificationsSection() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Credentials</Text>
      {QUALIFICATIONS.map((item) => (
        <Card key={item.title} padded={false} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.blue} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.title}</Text>
                <Badge
                  label={item.status}
                  color={item.status === 'Active' ? colors.success : colors.blue}
                  backgroundColor={
                    item.status === 'Active' ? colors.successLight : colors.blueLight
                  }
                />
              </View>
              <Text style={styles.meta}>
                {item.issuer} · {item.year}
              </Text>
            </View>
          </View>
        </Card>
      ))}
      <Text style={styles.help}>
        Keep your professional credentials up to date so hospitals can verify you faster.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  sectionLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
});
