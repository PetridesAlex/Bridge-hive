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
  withRepeat,
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
 * Earnings / invoices overview tile — navy premium surface with wash motion.
 * Selected state deepens the panel and lights the honey rule + icon.
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
  const wash = useSharedValue(0);
  const orb = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      wash.value = 0.35;
      orb.value = 0.5;
      return;
    }
    enter.value = withDelay(
      delayMs,
      withTiming(1, { duration: motion.duration.normal, easing: Easing.out(Easing.cubic) }),
    );
    wash.value = withRepeat(
      withTiming(1, { duration: 4800 + delayMs * 4, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    orb.value = withRepeat(
      withTiming(1, { duration: 6200 + delayMs * 3, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [delayMs, enter, orb, reduced, wash]);

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
      { translateY: interpolate(enter.value, [0, 1], [14, 0]) },
      { scale: interpolate(press.value, [0, 1], [1, 0.978]) },
    ],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.12, selected ? 0.42 : 0.26]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-36, 64]) }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 1], [0.16, selected ? 0.42 : 0.28]),
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [0, 12]) },
      { translateY: interpolate(orb.value, [0, 1], [0, -10]) },
      { scale: interpolate(orb.value, [0, 1], [0.92, 1.08]) },
    ],
  }));

  const ruleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(select.value, [0, 1], [0.35, 1]),
    transform: [{ scaleX: interpolate(select.value, [0, 1], [0.35, 1]) }],
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
          alert && styles.pressableAlert,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            selected
              ? alert
                ? ['#3A1808', '#5A280C', '#0B2A43']
                : ['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']
              : alert
                ? ['#2A160E', '#3A2208', '#1A2834']
                : ['#0A2438', '#0D3348', '#0E4554']
          }
          locations={selected && !alert ? [0, 0.34, 0.7, 1] : [0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View pointerEvents="none" style={[styles.wash, washStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.orb, alert ? styles.orbAlert : null, orbStyle]}
        />

        <View style={styles.topRow}>
          {selected ? (
            <LinearGradient
              colors={alert ? ['#FFB088', '#C45C2E'] : ['#FFD25A', '#F08C00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Ionicons name={icon} size={15} color={colors.navy} />
            </LinearGradient>
          ) : (
            <View
              style={[styles.iconWrap, styles.iconWrapIdle, alert && styles.iconWrapAlert]}
            >
              <Ionicons
                name={icon}
                size={15}
                color={alert ? '#FFB088' : colors.yellow}
              />
            </View>
          )}
          <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View style={styles.amountBlock}>
          <MoneyAmount
            amountMinor={amountMinor}
            emphasize
            style={[styles.amount, alert && styles.amountAlert]}
          />
          <Text style={[styles.hint, selected && styles.hintSelected]} numberOfLines={2}>
            {hint}
          </Text>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.rule, alert && styles.ruleAlert, ruleStyle]}
        />
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
    minHeight: 136,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#0B2A43',
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md + 4,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  pressableSelected: {
    borderColor: 'rgba(255, 210, 90, 0.38)',
  },
  pressableAlert: {
    borderColor: 'rgba(255, 176, 136, 0.4)',
  },
  wash: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    width: 110,
  },
  orb: {
    position: 'absolute',
    right: -28,
    top: -36,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(22, 166, 182, 0.28)',
  },
  orbAlert: {
    backgroundColor: 'rgba(196, 92, 46, 0.28)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconWrapIdle: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  iconWrapAlert: {
    backgroundColor: 'rgba(196, 92, 46, 0.28)',
    borderColor: 'rgba(255, 176, 136, 0.35)',
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  labelSelected: {
    color: colors.yellow,
  },
  amountBlock: {
    gap: 6,
  },
  amount: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.white,
  },
  amountAlert: {
    color: '#FFB088',
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.62)',
  },
  hintSelected: {
    color: 'rgba(255,255,255,0.78)',
  },
  rule: {
    alignSelf: 'flex-start',
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  ruleAlert: {
    backgroundColor: '#FFB088',
  },
});
