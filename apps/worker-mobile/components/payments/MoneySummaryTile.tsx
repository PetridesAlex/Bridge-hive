import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  label: string;
  amountMinor: number;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  emphasis?: 'default' | 'alert';
  delayMs?: number;
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Interactive earnings / invoices overview tile.
 * Selected state uses a navy accent bar + soft fill (not a full dark takeover),
 * so the pair stays balanced on narrow phones.
 */
export function MoneySummaryTile({
  label,
  amountMinor,
  hint,
  icon,
  selected,
  emphasis = 'default',
  delayMs = 0,
  onPress,
  accessibilityLabel,
}: Props) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const press = useSharedValue(0);
  const select = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      delayMs,
      withTiming(1, { duration: motion.duration.normal, easing: Easing.out(Easing.cubic) }),
    );
  }, [delayMs, enter, reduced]);

  useEffect(() => {
    select.value = reduced
      ? selected
        ? 1
        : 0
      : withSpring(selected ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [reduced, select, selected]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [10, 0]) },
      { scale: interpolate(press.value, [0, 1], [1, 0.985]) },
    ],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    opacity: select.value,
    transform: [{ scaleY: interpolate(select.value, [0, 1], [0.35, 1]) }],
  }));

  const alert = emphasis === 'alert';

  return (
    <Animated.View style={[styles.shell, shellStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 140 });
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.pressable,
          selected && styles.pressableSelected,
          alert && !selected && styles.pressableAlert,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            selected
              ? ['rgba(11,42,67,0.08)', 'rgba(22,166,182,0.10)']
              : alert
                ? ['rgba(196, 92, 46, 0.08)', 'rgba(255,255,255,0)']
                : ['rgba(22,166,182,0.08)', 'rgba(255,255,255,0)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          pointerEvents="none"
          style={[styles.accent, alert && !selected && styles.accentAlert, accentStyle]}
        />

        <View style={styles.topRow}>
          <View
            style={[
              styles.iconWrap,
              selected && styles.iconWrapSelected,
              alert && !selected && styles.iconWrapAlert,
            ]}
          >
            <Ionicons
              name={icon}
              size={15}
              color={selected ? colors.navy : alert ? colors.warning : colors.tealStrong}
            />
          </View>
          <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <MoneyAmount
          amountMinor={amountMinor}
          emphasize
          style={[styles.amount, alert && !selected && styles.amountAlert]}
        />
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minWidth: 0,
  },
  pressable: {
    minHeight: 112,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.md + 4,
    gap: 8,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  pressableSelected: {
    borderColor: 'rgba(11, 42, 67, 0.22)',
  },
  pressableAlert: {
    borderColor: 'rgba(196, 92, 46, 0.35)',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.navy,
  },
  accentAlert: {
    backgroundColor: colors.warning,
    opacity: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(11, 42, 67, 0.10)',
  },
  iconWrapAlert: {
    backgroundColor: colors.warningLight,
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.navy,
  },
  amount: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  amountAlert: {
    color: colors.warning,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
