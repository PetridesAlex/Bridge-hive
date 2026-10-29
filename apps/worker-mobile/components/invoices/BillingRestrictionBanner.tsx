import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

/** Website console palette: sidebar ink, muted slate text, honey accent. */
const SIDEBAR = '#0B2A43';
const SIDEBAR_TEXT = '#DCE8EE';
const SIDEBAR_MUTED = '#91A8B5';

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
      <LinearGradient
        pointerEvents="none"
        colors={[colors.teal, colors.yellow, colors.teal]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.accentBar}
      />
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
          <Ionicons name="alert-circle" size={20} color={colors.yellow} />
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
          color={SIDEBAR_MUTED}
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
              <Ionicons name="document-text-outline" size={15} color={colors.navy} />
              <Text style={styles.actionPrimaryText}>View invoices</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pay now"
              onPress={goInvoices}
              style={({ pressed }) => [styles.actionSecondary, pressed && styles.actionPressed]}
            >
              <Ionicons name="card-outline" size={15} color={colors.white} />
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
    backgroundColor: SIDEBAR,
  },
  accentBar: {
    height: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  barPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 170, 24, 0.16)',
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
    color: colors.white,
  },
  amountLine: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.yellow,
  },
  panel: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 12,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: SIDEBAR_TEXT,
    paddingLeft: 48,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 48,
  },
  actionPrimary: {
    minHeight: 40,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
  },
  actionPrimaryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  actionSecondary: {
    minHeight: 40,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionSecondaryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.white,
  },
  actionPressed: {
    opacity: 0.88,
  },
});
