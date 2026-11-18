import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  label: string;
  amountMinor: number;
  currency?: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  statusIcon?: React.ComponentProps<typeof StatusBadge>['icon'];
  /** Soft live pulse on the status badge (open / processing). */
  pulse?: boolean;
  context?: string;
  stateLine?: string;
  style?: StyleProp<ViewStyle>;
};

const WASH: Record<StatusTone, readonly [string, string, ...string[]]> = {
  neutral: ['rgba(11, 42, 67, 0.05)', 'rgba(255, 255, 255, 0)'],
  info: ['rgba(11, 42, 67, 0.06)', 'rgba(20, 169, 181, 0.12)', 'rgba(255, 255, 255, 0)'],
  success: ['rgba(20, 108, 67, 0.10)', 'rgba(255, 255, 255, 0)'],
  warning: ['rgba(180, 120, 24, 0.10)', 'rgba(255, 255, 255, 0)'],
  danger: ['rgba(180, 35, 24, 0.10)', 'rgba(255, 255, 255, 0)'],
  accent: ['rgba(20, 169, 181, 0.12)', 'rgba(224, 170, 24, 0.08)', 'rgba(255, 255, 255, 0)'],
};

function stateIcon(tone: StatusTone): keyof typeof Ionicons.glyphMap {
  if (tone === 'success') return 'checkmark-circle';
  if (tone === 'danger') return 'alert-circle';
  if (tone === 'warning') return 'time';
  return 'time-outline';
}

/** Emphasis block for invoice/money heroes. */
export function MoneySummary({
  label,
  amountMinor,
  currency,
  statusLabel,
  statusTone = 'info',
  statusIcon,
  pulse = false,
  context,
  stateLine,
  style,
}: Props) {
  const reduced = useReducedMotion();
  const sheen = useSharedValue(reduced ? 0.28 : 0);
  const enter =
    !reduced && Platform.OS !== 'web'
      ? FadeInDown.duration(420).springify().damping(18)
      : undefined;

  useEffect(() => {
    if (reduced) {
      sheen.value = 0.28;
      return;
    }
    sheen.value = withDelay(
      180,
      withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [reduced, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 1], [0.04, 0.14]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-48, 96]) }],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 1], [0.55, 1]),
    transform: [{ scaleX: interpolate(sheen.value, [0, 1], [0.72, 1]) }],
  }));

  const stateColor =
    statusTone === 'danger'
      ? colors.error
      : statusTone === 'success'
        ? colors.success
        : colors.tealStrong;

  return (
    <Animated.View entering={enter} style={[styles.wrap, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={WASH[statusTone]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={styles.top}>
        <View style={styles.labelRow}>
          <View style={styles.mark}>
            <Ionicons name="receipt-outline" size={14} color={colors.navy} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
        {statusLabel ? (
          <StatusBadge
            label={statusLabel}
            tone={statusTone}
            icon={statusIcon}
            pulse={pulse}
          />
        ) : null}
      </View>

      <MoneyAmount
        amountMinor={amountMinor}
        currency={currency}
        emphasize
        style={styles.amount}
      />

      <Animated.View style={[styles.accentRule, accentStyle]} />

      {context ? <Text style={styles.context}>{context}</Text> : null}

      {stateLine ? (
        <View style={styles.chip}>
          <Ionicons name={stateIcon(statusTone)} size={14} color={stateColor} />
          <Text
            style={[
              styles.chipText,
              statusTone === 'danger' ? styles.chipTextAlert : null,
            ]}
          >
            {stateLine}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    ...shadows.sm,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    width: 96,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  labelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.18)',
  },
  label: {
    flex: 1,
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  amount: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 36,
    lineHeight: 42,
    color: colors.navy,
    letterSpacing: -0.7,
    marginTop: 2,
  },
  accentRule: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginTop: 2,
  },
  context: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.navy,
    letterSpacing: -0.1,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.06)',
  },
  chipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  chipTextAlert: {
    color: colors.error,
  },
});
