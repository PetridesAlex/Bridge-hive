import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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

function ActionButton({
  label,
  icon,
  onPress,
  variant,
  reduced,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant: 'primary' | 'ghost';
  reduced: boolean;
}) {
  const scale = useSharedValue(1);
  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={shell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.96, { damping: 16, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        }}
        style={variant === 'primary' ? styles.actionPrimary : styles.actionGhost}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={[colors.yellow, '#F0C14D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionPrimaryFill}
          >
            <Ionicons name={icon} size={14} color={colors.navy} />
            <Text style={styles.actionPrimaryText}>{label}</Text>
          </LinearGradient>
        ) : (
          <>
            <Ionicons name={icon} size={14} color={SIDEBAR_TEXT} />
            <Text style={styles.actionGhostText}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

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
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(240)}
          style={styles.panel}
        >
          <Text style={styles.body}>
            Settle invoices — then claim new shifts.{'\n'}
            Current assignments — unaffected.
          </Text>
          <View style={styles.actions}>
            <ActionButton
              label="Pay now"
              icon="card-outline"
              onPress={goInvoices}
              variant="primary"
              reduced={reduced}
            />
            <ActionButton
              label="View invoices"
              icon="document-text-outline"
              onPress={goInvoices}
              variant="ghost"
              reduced={reduced}
            />
          </View>
        </Animated.View>
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
    height: 3,
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
    paddingTop: 10,
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.1,
    color: SIDEBAR_TEXT,
    paddingLeft: 48,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingLeft: 48,
  },
  actionPrimary: {
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  actionPrimaryFill: {
    minHeight: 38,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionPrimaryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: colors.navy,
  },
  actionGhost: {
    minHeight: 38,
    borderRadius: radii.full,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(220, 232, 238, 0.28)',
  },
  actionGhostText: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    letterSpacing: 0.15,
    color: SIDEBAR_TEXT,
  },
});
