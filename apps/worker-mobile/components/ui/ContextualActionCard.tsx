import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Stat = {
  label: string;
  value: string;
};

type Props = {
  eyebrow: string;
  title: string;
  body?: string;
  actionLabel: string;
  onAction: () => void;
  onPressCard?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** `emphasis` = action required (honey icon), `light` = informational (navy icon). */
  variant?: 'light' | 'emphasis';
  /** Live marketplace / workday indicator with subtle pulse. */
  live?: boolean;
  liveLabel?: string;
  /** Compact stats under the body (counts, role, window). */
  stats?: Stat[];
};

const HONEY_GRADIENT: [string, string] = ['#FFD25A', '#F08C00'];

/**
 * Home “next action” hero — navy premium panel with moving wash,
 * glass stats, and a high-contrast CTA.
 */
export function ContextualActionCard({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
  onPressCard,
  icon = 'flash-outline',
  variant = 'light',
  live = false,
  liveLabel = 'Live',
  stats,
}: Props) {
  const emphasis = variant === 'emphasis';
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(1);
  const press = useSharedValue(1);
  const nudge = useSharedValue(0);
  const wash = useSharedValue(0);
  const orb = useSharedValue(0);
  const eyebrowGlow = useSharedValue(reduced ? 0.5 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      wash.value = 0.35;
      orb.value = 0.5;
      return;
    }
    enter.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
    wash.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    orb.value = withRepeat(
      withTiming(1, { duration: 6400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [enter, orb, reduced, wash]);

  useEffect(() => {
    if (!live || reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1.22, {
        duration: motion.duration.slow * 4,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [live, pulse, reduced]);

  useEffect(() => {
    if (reduced) {
      eyebrowGlow.value = 0.5;
      return;
    }
    eyebrowGlow.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [eyebrowGlow, reduced]);

  useEffect(() => {
    if (reduced) {
      nudge.value = 0;
      return;
    }
    nudge.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [nudge, reduced]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }, { scale: press.value }],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.16, 0.4]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-40, 70]) }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 1], [0.2, 0.45]),
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [0, 14]) },
      { translateY: interpolate(orb.value, [0, 1], [0, -12]) },
      { scale: interpolate(orb.value, [0, 1], [0.94, 1.08]) },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.22], [0.55, 0]),
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(nudge.value, [0, 1], [0, 3]) }],
  }));

  const eyebrowPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(eyebrowGlow.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(eyebrowGlow.value, [0, 1], [0.96, 1]) }],
  }));

  const eyebrowDotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(eyebrowGlow.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(eyebrowGlow.value, [0, 1], [0.85, 1.2]) }],
  }));

  const ctaScan = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      ctaScan.value = 0.4;
      return;
    }
    ctaScan.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [ctaScan, reduced]);

  const ctaScanStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : interpolate(ctaScan.value, [0, 0.2, 0.7, 1], [0, 0.7, 0.7, 0]),
    transform: [{ translateX: interpolate(ctaScan.value, [0, 1], [-28, 140]) }],
  }));

  const handlePress = () => {
    (onPressCard ?? onAction)();
  };

  const ringColor = emphasis ? colors.yellow : 'rgba(255,210,90,0.7)';
  const hasStats = Boolean(stats && stats.length > 0);

  return (
    <Animated.View style={cardAnim}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.985, { damping: 18, stiffness: 380 });
        }}
        onPressOut={() => {
          if (!reduced) press.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${eyebrow}. ${title}. ${actionLabel}`}
        style={[styles.card, emphasis && styles.cardEmphasis]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            emphasis
              ? ['#3A2208', '#5A340C', '#0B2A43']
              : ['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']
          }
          locations={emphasis ? [0, 0.45, 1] : [0, 0.34, 0.7, 1]}
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
        <Animated.View pointerEvents="none" style={[styles.orb, orbStyle]} />
        <View pointerEvents="none" style={styles.glow} />

        <View style={styles.topRow}>
          <View style={styles.iconStack}>
            {live ? (
              <Animated.View
                style={[styles.liveRing, { borderColor: ringColor }, pulseStyle]}
              />
            ) : null}
            <LinearGradient
              colors={emphasis ? HONEY_GRADIENT : ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.icon}
            >
              <Ionicons
                name={icon}
                size={22}
                color={emphasis ? colors.navy : colors.white}
              />
            </LinearGradient>
          </View>

          <View style={styles.headerCopy}>
            <View style={styles.metaRow}>
              <Animated.View
                style={[
                  styles.eyebrowPill,
                  emphasis && styles.eyebrowPillEmphasis,
                  eyebrowPulseStyle,
                ]}
              >
                <Animated.View
                  style={[
                    styles.eyebrowDot,
                    emphasis && styles.eyebrowDotEmphasis,
                    eyebrowDotStyle,
                  ]}
                />
                <Text
                  style={[styles.eyebrow, emphasis && styles.eyebrowEmphasis]}
                  numberOfLines={1}
                >
                  {eyebrow}
                </Text>
              </Animated.View>
              {live ? (
                <View style={[styles.livePill, emphasis && styles.livePillEmphasis]}>
                  <View style={[styles.liveDot, emphasis && styles.liveDotEmphasis]} />
                  <Text style={[styles.liveText, emphasis && styles.liveTextEmphasis]}>
                    {liveLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {body ? (
              <Text style={styles.body} numberOfLines={3}>
                {body}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.footer, !hasStats && styles.footerActionOnly]}>
          {hasStats ? (
            <View style={styles.statsRow}>
              {stats!.map((stat, index) => (
                <View
                  key={stat.label}
                  style={[styles.statChip, index === 0 && styles.statChipLead]}
                >
                  <Text
                    style={[styles.statValue, index === 0 && styles.statValueLead]}
                    numberOfLines={1}
                  >
                    {stat.value}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.footerSpacer} />
          )}

          <View style={[styles.action, emphasis && styles.actionEmphasis]}>
            <LinearGradient
              pointerEvents="none"
              colors={
                emphasis
                  ? ['#FFE08A', '#FFD25A', '#F08C00']
                  : ['#1A3F5C', '#0E4A5C', '#0F6B6B']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View pointerEvents="none" style={[styles.actionScan, ctaScanStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.45)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <View style={styles.actionNotch} />
            <Text
              style={[styles.actionText, emphasis && styles.actionTextEmphasis]}
              numberOfLines={1}
            >
              {actionLabel}
            </Text>
            <Animated.View
              style={[
                styles.actionArrow,
                emphasis && styles.actionArrowEmphasis,
                arrowStyle,
              ]}
            >
              <LinearGradient
                colors={emphasis ? ['#0B2A43', '#071E33'] : HONEY_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons
                name="arrow-forward"
                size={13}
                color={emphasis ? colors.white : colors.navy}
              />
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#0B2A43',
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  cardEmphasis: {
    borderColor: 'rgba(255, 210, 90, 0.35)',
  },
  wash: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 130,
  },
  orb: {
    position: 'absolute',
    right: -40,
    top: -48,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(22, 166, 182, 0.28)',
  },
  glow: {
    position: 'absolute',
    left: -30,
    bottom: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 210, 90, 0.10)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconStack: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  liveRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 210, 90, 0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.55)',
  },
  eyebrowPillEmphasis: {
    backgroundColor: 'rgba(255, 210, 90, 0.28)',
    borderColor: 'rgba(255, 210, 90, 0.72)',
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  eyebrowDotEmphasis: {
    backgroundColor: colors.yellow,
  },
  eyebrow: {
    flexShrink: 1,
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  eyebrowEmphasis: {
    color: '#FFE29A',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,210,90,0.28)',
  },
  livePillEmphasis: {
    backgroundColor: 'rgba(255, 210, 90, 0.18)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  liveDotEmphasis: {
    backgroundColor: colors.yellow,
  },
  liveText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    color: colors.white,
  },
  liveTextEmphasis: {
    color: colors.yellow,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.35,
    color: colors.white,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.72)',
    maxWidth: 420,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 2,
  },
  footerActionOnly: {
    justifyContent: 'flex-end',
  },
  footerSpacer: {
    flex: 1,
  },
  statsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  statChip: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statChipLead: {
    flexGrow: 0,
    flexBasis: 'auto',
    minWidth: 58,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 210, 90, 0.16)',
    borderColor: 'rgba(255, 210, 90, 0.35)',
  },
  statValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.white,
  },
  statValueLead: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: colors.yellow,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.62)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 10,
    minHeight: 40,
    paddingVertical: 7,
    paddingLeft: 16,
    paddingRight: 6,
    overflow: 'hidden',
    // Blade / cockpit chip — sharp leading edge, soft trailing cut.
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 6,
    backgroundColor: '#0E4A5C',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.45)',
  },
  actionEmphasis: {
    backgroundColor: colors.yellow,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  actionScan: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 36,
  },
  actionNotch: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 1,
    backgroundColor: colors.yellow,
  },
  actionText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.white,
  },
  actionTextEmphasis: {
    color: colors.navy,
  },
  actionArrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Diamond-cut arrow pod.
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 4,
    backgroundColor: colors.yellow,
  },
  actionArrowEmphasis: {
    backgroundColor: colors.navy,
  },
});
