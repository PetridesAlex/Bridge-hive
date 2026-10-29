import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

type Props = {
  summary: BillingRestrictionSummary;
};

/**
 * High-priority billing restriction bar.
 * Collapsed by default — tap to reveal details and invoice actions.
 * Existing assignments remain visible; this only pauses new marketplace access.
 */
export function BillingRestrictionBanner({ summary }: Props) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const amount = formatMoney(summary.overdue_amount_minor);
  const due = summary.oldest_due_at
    ? `Due ${formatShortDate(summary.oldest_due_at)}`
    : null;

  const goInvoices = () => router.push('/(tabs)/invoices');

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(360)}
      style={styles.wrap}
      accessibilityRole="alert"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Marketplace access paused"
        accessibilityHint={
          open
            ? 'Collapse billing details'
            : 'Show billing details and invoice actions'
        }
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={18} color="#B42318" />
        </View>
        <View style={styles.barCopy}>
          <Text style={styles.title}>Marketplace access paused</Text>
          <Text style={styles.amountLine}>
            {amount} overdue{due ? ` · ${due}` : ''}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="rgba(180, 35, 24, 0.72)"
        />
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          <Text style={styles.body}>
            Outstanding invoices must be settled before claiming new shifts. Your
            current assignments remain unaffected.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View invoices"
              onPress={goInvoices}
              style={({ pressed }) => [styles.actionPrimary, pressed && styles.actionPressed]}
            >
              <Ionicons name="document-text-outline" size={15} color="#9B1C14" />
              <Text style={styles.actionPrimaryText}>View invoices</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pay now"
              onPress={goInvoices}
              style={({ pressed }) => [styles.actionSecondary, pressed && styles.actionPressed]}
            >
              <Ionicons name="card-outline" size={15} color="#9B1C14" />
              <Text style={styles.actionSecondaryText}>Pay now</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(180, 35, 24, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180, 35, 24, 0.28)',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(180, 35, 24, 0.08)',
  },
  barPressed: {
    backgroundColor: 'rgba(180, 35, 24, 0.16)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180, 35, 24, 0.14)',
  },
  barCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: '#9B1C14',
  },
  amountLine: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(155, 28, 20, 0.78)',
  },
  panel: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 12,
    gap: 12,
    backgroundColor: 'rgba(180, 35, 24, 0.06)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(180, 35, 24, 0.22)',
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(122, 20, 16, 0.88)',
    paddingLeft: 46,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 46,
  },
  actionPrimary: {
    minHeight: 40,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(180, 35, 24, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180, 35, 24, 0.28)',
  },
  actionPrimaryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: '#9B1C14',
  },
  actionSecondary: {
    minHeight: 40,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(180, 35, 24, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(180, 35, 24, 0.22)',
  },
  actionSecondaryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: '#9B1C14',
  },
  actionPressed: {
    opacity: 0.88,
  },
});
