import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';

type DetailRow = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  mono?: boolean;
};

const PAYOUT_ROWS: DetailRow[] = [
  {
    label: 'IBAN number',
    value: 'CY12002001950000357035541204',
    icon: 'card-outline',
    mono: true,
  },
  {
    label: 'Bank name',
    value: 'Bank of Cyprus',
    icon: 'business-outline',
  },
];

const TAX_ROWS: DetailRow[] = [
  {
    label: 'Tax identification number',
    value: '60029812X',
    icon: 'document-text-outline',
    mono: true,
  },
];

function DetailCard({ rows }: { rows: DetailRow[] }) {
  return (
    <Card padded={false}>
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
            <Text style={[styles.value, row.mono && styles.mono]} selectable>
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

export function PaymentInfoSection() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Payout information</Text>
      <DetailCard rows={PAYOUT_ROWS} />
      <Text style={styles.help}>
        Your IBAN and bank name is required to compose the payment note necessary for
        organizations at the end of each shift.
      </Text>

      <Text style={[styles.sectionLabel, styles.taxLabel]}>Tax details</Text>
      <DetailCard rows={TAX_ROWS} />
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
  taxLabel: {
    marginTop: spacing.md,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
    marginTop: -spacing.xs,
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
  mono: {
    letterSpacing: 0.3,
  },
});
