import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';

export type ProfileDetailRow = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeTone?: 'success' | 'blue' | 'muted';
};

type Props = {
  rows: ProfileDetailRow[];
  sectionLabel?: string;
  help?: string;
};

export function ProfileDetailList({ rows, sectionLabel, help }: Props) {
  return (
    <View style={styles.wrap}>
      {sectionLabel ? <Text style={styles.sectionLabel}>{sectionLabel}</Text> : null}
      <Card padded={false}>
        {rows.map((row, index) => (
          <View
            key={`${row.label}-${row.value}-${index}`}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
          >
            {row.icon ? (
              <View style={styles.iconWrap}>
                <Ionicons name={row.icon} size={18} color={colors.blue} />
              </View>
            ) : null}
            <View style={styles.rowBody}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value} selectable>
                {row.value}
              </Text>
            </View>
            {row.badge ? (
              <View
                style={[
                  styles.badge,
                  row.badgeTone === 'success' && styles.badgeSuccess,
                  row.badgeTone === 'blue' && styles.badgeBlue,
                  row.badgeTone === 'muted' && styles.badgeMuted,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    row.badgeTone === 'success' && styles.badgeTextSuccess,
                    row.badgeTone === 'blue' && styles.badgeTextBlue,
                    row.badgeTone === 'muted' && styles.badgeTextMuted,
                  ]}
                >
                  {row.badge}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </Card>
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.blue,
  },
  value: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.navy,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.blueLight,
  },
  badgeSuccess: {
    backgroundColor: colors.successLight,
  },
  badgeBlue: {
    backgroundColor: colors.blueLight,
  },
  badgeMuted: {
    backgroundColor: colors.background,
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: colors.blue,
  },
  badgeTextSuccess: {
    color: colors.success,
  },
  badgeTextBlue: {
    color: colors.blue,
  },
  badgeTextMuted: {
    color: colors.textSecondary,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
});
