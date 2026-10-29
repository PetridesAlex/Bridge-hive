import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { AppMenuDrawer } from '@/components/navigation/AppMenuDrawer';
import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatDate, greetingForNow } from '@/utils/format';

type Props = {
  firstName: string;
  roleLabel: string;
  initials: string;
  unreadCount?: number;
  /** Visual tone for the bell badge (billing vs generic). */
  alertTone?: 'default' | 'money' | 'danger';
  /** Platform-verified worker — shows a check on the avatar (otherwise a pending clock). */
  verified?: boolean;
};

const GREETING_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Good morning': 'sunny',
  'Good afternoon': 'partly-sunny',
  'Good evening': 'moon',
};

type HeaderButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  count?: number;
  tone?: 'default' | 'money' | 'danger';
  /** Gently rings the icon on mount and every few seconds (alerts only). */
  ring?: boolean;
};

/**
 * Round header action: spring press, web hover lift, optional alert badge that
 * pops in, a soft yellow pulse halo while alerts are pending, and a periodic bell ring.
 * All motion is skipped when Reduce Motion is on.
 */
function HeaderButton({
  icon,
  label,
  onPress,
  count = 0,
  tone = 'default',
  ring = false,
}: HeaderButtonProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const swing = useSharedValue(0);
  const pulse = useSharedValue(0);
  const hasAlert = count > 0;

  useEffect(() => {
    if (reduced || !ring) return;
    let alive = true;
    const wiggle = () => {
      swing.value = withSequence(
        withTiming(-14, { duration: 90 }),
        withTiming(12, { duration: 120 }),
        withTiming(-9, { duration: 110 }),
        withTiming(6, { duration: 100 }),
        withTiming(0, { duration: 120 }),
      );
    };
    const first = setTimeout(() => alive && wiggle(), 900);
    const timer = setInterval(() => alive && wiggle(), 9000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [reduced, ring, swing]);

  useEffect(() => {
    if (reduced || !hasAlert) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [pulse, reduced, hasAlert]);

  const shell = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.55]) }],
  }));

  const tint = hasAlert ? styles.chromeBtnAlert : null;

  return (
    <Animated.View style={shell}>
      {hasAlert && !reduced ? (
        <Animated.View pointerEvents="none" style={[styles.pulseHalo, pulseStyle]} />
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        onHoverIn={() => {
          if (!reduced) lift.value = withSpring(-2, { damping: 16, stiffness: 260 });
        }}
        onHoverOut={() => {
          lift.value = withSpring(0, { damping: 16, stiffness: 240 });
        }}
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.92, { damping: 16, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 260 });
        }}
        style={[styles.chromeBtn, tint]}
      >
        <Animated.View style={iconStyle}>
          <Ionicons
            name={icon}
            size={20}
            color={hasAlert ? colors.navy : colors.white}
          />
        </Animated.View>
        {hasAlert ? (
          <Animated.View
            entering={reduced ? undefined : ZoomIn.springify().damping(10).stiffness(220)}
            style={[
              styles.badge,
              tone === 'danger' && styles.badgeDanger,
            ]}
          >
            <Text style={styles.badgeText}>
              {count > 9 ? '9+' : count}
            </Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Home header — two calm tiers on the page background:
 *  1. brand bar (mark + wordmark, menu, notifications)
 *  2. identity (avatar with verification badge, time-of-day greeting, name, role, date)
 * No card, border, gradient or shadow. Motion is restrained (staggered entrance,
 * a slow avatar glow, press feedback) and disabled with Reduce Motion.
 */
export function GreetingHeader({
  firstName,
  roleLabel,
  initials,
  unreadCount = 0,
  alertTone = 'default',
  verified = false,
}: Props) {
  const router = useRouter();
  const greeting = greetingForNow();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const press = useSharedValue(1);
  const greetingIcon = GREETING_ICON[greeting] ?? 'sunny';
  const today = formatDate(new Date(), { weekday: 'short', day: 'numeric', month: 'short' });

  useEffect(() => {
    if (reduced) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [glow, reduced]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 0.7 : interpolate(glow.value, [0, 1], [0.45, 0.95]),
    transform: [{ scale: reduced ? 1 : interpolate(glow.value, [0, 1], [0.96, 1.06]) }],
  }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <View style={styles.wrap}>
      <Animated.View entering={reduced ? undefined : FadeIn.duration(320)} style={styles.topRow}>
        <View style={styles.brandBlock}>
          <BridgeHiveMark size={36} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Bridge Hive</Text>
            <Text style={styles.brandTag}>Worker workspace</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <HeaderButton
            icon="menu"
            label="Open navigation menu"
            onPress={() => setMenuOpen(true)}
          />
          <HeaderButton
            icon={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
            label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} alert${unreadCount === 1 ? '' : 's'}`
                : 'Notifications'
            }
            onPress={() => router.push('/notifications')}
            count={unreadCount}
            tone={alertTone}
            ring={unreadCount > 0}
          />
        </View>
      </Animated.View>

      <Animated.View entering={reduced ? undefined : FadeInDown.delay(80).duration(420)}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          onPressIn={() => {
            if (!reduced) press.value = withSpring(0.98, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            press.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          accessibilityRole="button"
          accessibilityLabel={`Open profile, ${firstName}, ${roleLabel}${verified ? ', verified' : ''}`}
        >
          <Animated.View style={[styles.identity, pressStyle]}>
            <View style={styles.avatarStage}>
              <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
              <Avatar
                initials={initials}
                size={64}
                backgroundColor={colors.navy}
                textColor={colors.white}
              />
              <View style={[styles.statusBadge, !verified && styles.statusBadgePending]}>
                <Ionicons
                  name={verified ? 'checkmark' : 'time'}
                  size={12}
                  color={colors.white}
                />
              </View>
            </View>
            <View style={styles.textCol}>
              <View style={styles.greetingRow}>
                <Ionicons name={greetingIcon} size={15} color={colors.honeyStrong} />
                <Text style={styles.greeting} numberOfLines={1}>
                  {greeting},
                </Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {firstName}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.rolePill}>
                  <View style={styles.roleDot} />
                  <Text style={styles.role} numberOfLines={1}>
                    {roleLabel}
                  </Text>
                </View>
                <Text style={styles.date} numberOfLines={1}>
                  {today}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Animated.View>
        </Pressable>
      </Animated.View>

      <AppMenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        firstName={firstName}
        roleLabel={roleLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xl,
    paddingTop: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: 22,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm + 2,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  brandName: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.white,
  },
  brandTag: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.62)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chromeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  chromeBtnAlert: {
    backgroundColor: colors.yellow,
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  pulseHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.yellow,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  badgeDanger: {
    backgroundColor: colors.error,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    color: colors.white,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 72,
  },
  avatarStage: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.tealSoft,
  },
  statusBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealStrong,
  },
  statusBadgePending: {
    backgroundColor: colors.honeyStrong,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    marginTop: spacing.sm,
  },
  date: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  name: {
    fontFamily: typography.fonts.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.7,
    color: colors.navy,
  },
  rolePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.tealSoft,
    maxWidth: '100%',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  role: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: colors.navy,
    flexShrink: 1,
  },
});
