import {
  dueDateCopy,
  workerInvoiceStatusLabel,
  type WorkerInvoiceStatus,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { WorkerInvoiceListItem } from '@/lib/invoices';
import { formatShortDate } from '@/utils/format';

type Props = {
  invoice: WorkerInvoiceListItem;
  onPress: () => void;
};

function toneForStatus(status: WorkerInvoiceStatus): {
  fg: string;
  bg: string;
  mark: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (status === 'past_due') {
    return {
      fg: colors.error,
      bg: colors.errorLight,
      mark: ['#8F1A12', colors.error],
      icon: 'alert-circle',
    };
  }
  if (status === 'paid') {
    return {
      fg: colors.success,
      bg: '#D5F0DF',
      mark: ['#146C43', colors.success],
      icon: 'checkmark-circle',
    };
  }
  if (status === 'payment_processing') {
    return {
      fg: colors.honeyStrong,
      bg: colors.yellowLight,
      mark: [colors.navy, colors.honeyStrong],
      icon: 'time',
    };
  }
  if (status === 'void' || status === 'uncollectible') {
    return {
      fg: colors.textSecondary,
      bg: colors.surfaceSubdued,
      mark: [colors.navy, '#5B7391'],
      icon: 'close-circle',
    };
  }
  return {
    fg: colors.tealStrong,
    bg: colors.tealSoft,
    mark: [colors.navy, colors.tealStrong],
    icon: 'document-text',
  };
}

export function InvoiceCard({ invoice, onPress }: Props) {
  const orgName =
    invoice.organizations?.display_name ??
    invoice.organizations?.legal_name ??
    'Organization';
  const shift = invoice.shift_assignments?.shifts;
  const title = shift?.title?.trim() || 'Shift';
  const status = invoice.status as WorkerInvoiceStatus;
  const pastDue = status === 'past_due';
  const tone = toneForStatus(status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pastDue && styles.cardPastDue,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${workerInvoiceStatusLabel(status)}`}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          pastDue
            ? ['rgba(180, 35, 24, 0.06)', 'transparent']
            : ['rgba(20, 169, 181, 0.07)', 'rgba(11, 42, 67, 0.02)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.top}>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.orgRow}>
            <Ionicons name="business" size={12} color="#1F4E96" />
            <Text style={styles.org} numberOfLines={1}>
              {orgName}
            </Text>
          </View>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Commission</Text>
          <MoneyAmount
            amountMinor={invoice.commission_amount_minor}
            currency={invoice.currency}
            emphasize
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <LinearGradient
            colors={tone.mark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusMark}
          >
            <Ionicons name={tone.icon} size={11} color={colors.white} />
          </LinearGradient>
          <Text style={[styles.statusText, { color: tone.fg }]} numberOfLines={1}>
            {workerInvoiceStatusLabel(status)}
          </Text>
        </View>

        <View style={styles.metaRight}>
          {shift?.starts_at ? (
            <Text style={styles.meta}>Shift · {formatShortDate(shift.starts_at)}</Text>
          ) : null}
          <Text style={[styles.due, pastDue ? styles.dueOverdue : null]} numberOfLines={1}>
            {dueDateCopy(invoice.due_at)}
          </Text>
        </View>

        <LinearGradient
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chevron}
        >
          <Ionicons name="chevron-forward" size={14} color={colors.white} />
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardPastDue: {
    borderColor: 'rgba(180, 35, 24, 0.35)',
  },
  cardPressed: {
    opacity: 0.94,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.lg,
    color: colors.navy,
    lineHeight: typography.lineHeight.lg,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  org: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
  },
  statusMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
  },
  metaRight: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  due: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  dueOverdue: {
    color: colors.error,
    fontFamily: typography.fonts.semibold,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
