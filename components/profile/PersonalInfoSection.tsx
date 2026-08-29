import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Member } from '@/types';

type DetailRow = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  member: Member;
};

const DETAILS: (member: Member) => DetailRow[] = (member) => [
  { label: 'Full name', value: member.fullName, icon: 'person-outline' },
  { label: 'E-mail address', value: member.email, icon: 'mail-outline' },
  { label: 'Phone number', value: member.phone, icon: 'call-outline' },
  { label: 'Location', value: member.location, icon: 'location-outline' },
  { label: 'Country', value: 'Cyprus', icon: 'globe-outline' },
];

export function PersonalInfoSection({ member }: Props) {
  const rows = DETAILS(member);

  return (
    <View style={styles.wrap}>
      <Card padded={false} style={styles.identityCard}>
        <View style={styles.identityInner}>
          <View style={styles.avatarRing}>
            <Avatar
              initials={member.avatarInitials}
              size={72}
              backgroundColor={colors.navy}
              textColor={colors.yellow}
            />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{member.fullName}</Text>
            <Text style={styles.role}>{member.professionalRoleName}</Text>
            <View style={styles.badges}>
              <Badge
                label="Available"
                color={colors.success}
                backgroundColor={colors.successLight}
                icon="checkmark-circle"
              />
              <Badge
                label="Verified"
                color={colors.blue}
                backgroundColor={colors.blueLight}
                icon="shield-checkmark"
              />
            </View>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Personal details</Text>

      <Card padded={false} style={styles.detailsCard}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={row.icon} size={18} color={colors.blue} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value} selectable>
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  identityCard: {
    overflow: 'hidden',
  },
  identityInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.card,
  },
  avatarRing: {
    padding: 3,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.navy,
  },
  role: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  detailsCard: {
    overflow: 'hidden',
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
});
