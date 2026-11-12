import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  ZoomIn,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { AppMenuDrawer } from '@/components/navigation/AppMenuDrawer';
import { Avatar } from '@/components/ui/Avatar';
import { colors, motion, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatDate, greetingForNow } from '@/utils/format';

type Props = {
  firstName: string;
  roleLabel: string;
  initials: string;
  /** Signed profile photo URL when available; falls back to initials. */
  imageUri?: string | null;
  unreadCount?: number;
  /** Unread organization messages — badge on the Messages action. */
  messageUnreadCount?: number;
  /** Visual tone for the bell badge (billing vs generic). */
  alertTone?: 'default' | 'money' | 'danger';
  /** Platform-verified worker — shows a check on the avatar (otherwise a pending clock). */
  verified?: boolean;
  /** Home scroll offset — drives brand-bar color / elevation. */
  scrollY?: SharedValue<number>;
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
              {count > 99 ? '99+' : count}
            </Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Home header — brand bar + identity strip with premium role/date chips.
 * Motion: staggered entrance, avatar glow, role pulse; skipped with Reduce Motion.
 */
export function GreetingHeader({
  firstName,
  roleLabel,
  initials,
  imageUri,
  unreadCount = 0,
  messageUnreadCount = 0,
  alertTone = 'default',
  verified = false,
  scrollY,
}: Props) {
  const router = useRouter();
  const greeting = greetingForNow();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const press = useSharedValue(1);
  const rolePulse = useSharedValue(1);
  const greetingReveal = useSharedValue(reduced ? 1 : 0);
  const nameReveal = useSharedValue(reduced ? 1 : 0);
  const nameRule = useSharedValue(reduced ? 1 : 0);
  const wash = useSharedValue(0);
  const orb = useSharedValue(0);
  const localScroll = useSharedValue(0);
  const scroll = scrollY ?? localScroll;
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

  useEffect(() => {
    if (reduced) {
      wash.value = 0.35;
      orb.value = 0.5;
      return;
    }
    wash.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    orb.value = withRepeat(
      withTiming(1, { duration: 6800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [orb, reduced, wash]);

  useEffect(() => {
    if (reduced) {
      rolePulse.value = 1;
      return;
    }
    rolePulse.value = withRepeat(
      withTiming(1.08, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, rolePulse]);

  useEffect(() => {
    if (reduced) {
      greetingReveal.value = 1;
      nameReveal.value = 1;
      nameRule.value = 1;
      return;
    }
    greetingReveal.value = 0;
    nameReveal.value = 0;
    nameRule.value = 0;
    greetingReveal.value = withTiming(1, {
      duration: motion.duration.normal,
      easing: Easing.out(Easing.cubic),
    });
    nameReveal.value = withDelay(
      90,
      withSpring(1, { damping: 16, stiffness: 160 }),
    );
    nameRule.value = withDelay(
      220,
      withTiming(1, {
        duration: motion.duration.normal,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [firstName, greeting, greetingReveal, nameReveal, nameRule, reduced]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 0.7 : interpolate(glow.value, [0, 1], [0.45, 0.95]),
    transform: [{ scale: reduced ? 1 : interpolate(glow.value, [0, 1], [0.96, 1.06]) }],
  }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const roleRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rolePulse.value, [1, 1.08], [0.45, 0]),
    transform: [{ scale: rolePulse.value }],
  }));
  const greetingTextStyle = useAnimatedStyle(() => ({
    opacity: greetingReveal.value,
    transform: [
      { translateX: interpolate(greetingReveal.value, [0, 1], [-10, 0]) },
      { translateY: interpolate(greetingReveal.value, [0, 1], [4, 0]) },
    ],
  }));
  const nameTextStyle = useAnimatedStyle(() => ({
    opacity: nameReveal.value,
    transform: [
      { translateY: interpolate(nameReveal.value, [0, 1], [14, 0]) },
      { scale: interpolate(nameReveal.value, [0, 1], [0.96, 1]) },
    ],
  }));
  const nameRuleStyle = useAnimatedStyle(() => ({
    opacity: nameRule.value,
    transform: [{ scaleX: interpolate(nameRule.value, [0, 1], [0.2, 1]) }],
  }));
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.18, 0.42]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-48, 72]) }],
  }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 1], [0.22, 0.48]),
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [0, 18]) },
      { translateY: interpolate(orb.value, [0, 1], [0, -10]) },
      { scale: interpolate(orb.value, [0, 1], [0.92, 1.08]) },
    ],
  }));

  const brandBarStyle = useAnimatedStyle(() => {
    const y = Math.max(0, scroll.value);
    return {
      backgroundColor: interpolateColor(
        y,
        [0, 36, 90],
        ['#0B2A43', '#0A334C', '#071E33'],
      ),
      borderColor: interpolateColor(
        y,
        [0, 48, 100],
        ['rgba(255,255,255,0.08)', 'rgba(22,166,182,0.35)', 'rgba(255,210,90,0.48)'],
      ),
      shadowOpacity: interpolate(y, [0, 80], [0.08, 0.28]),
      shadowRadius: interpolate(y, [0, 80], [6, 16]),
      transform: [
        { translateY: interpolate(y, [0, 100], [0, -2], 'clamp') },
        { scale: interpolate(y, [0, 100], [1, 0.985], 'clamp') },
      ],
    };
  });

  const brandAccentStyle = useAnimatedStyle(() => {
    const y = Math.max(0, scroll.value);
    return {
      opacity: interpolate(y, [0, 28, 90], [0.15, 0.55, 0.92], 'clamp'),
    };
  });

  const brandTagStyle = useAnimatedStyle(() => {
    const y = Math.max(0, scroll.value);
    return {
      color: interpolateColor(
        y,
        [0, 70],
        ['rgba(255,255,255,0.62)', 'rgba(255,210,90,0.92)'],
      ),
    };
  });

  const brandWashStyle = useAnimatedStyle(() => {
    const y = Math.max(0, scroll.value);
    return {
      opacity: interpolate(y, [0, 80], [0.2, 0.55], 'clamp'),
      transform: [{ translateX: interpolate(y, [0, 120], [-20, 40], 'clamp') }],
    };
  });

  return (
    <View style={styles.wrap}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(320)}
        style={[styles.topRow, brandBarStyle]}
      >
        <Animated.View pointerEvents="none" style={[styles.brandAccent, brandAccentStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,210,90,0.55)', 'rgba(22,166,182,0.35)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.brandWash, brandWashStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.brandBlock}>
          <BridgeHiveMark size={48} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Bridge Hive</Text>
            <Animated.Text style={[styles.brandTag, brandTagStyle]}>
              Worker workspace
            </Animated.Text>
          </View>
        </View>

        <View style={styles.actions}>
          <HeaderButton
            icon={messageUnreadCount > 0 ? 'chatbubbles' : 'chatbubbles-outline'}
            label={
              messageUnreadCount > 0
                ? `Messages, ${messageUnreadCount} unread`
                : 'Messages'
            }
            onPress={() => router.push('/messages')}
            count={messageUnreadCount}
            ring={messageUnreadCount > 0}
          />
          <HeaderButton
            icon={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
            label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} alert${unreadCount === 1 ? '' : 's'}`
                : 'Notifications'
            }
            onPress={() => router.push('/profile/notifications')}
            count={unreadCount}
            tone={alertTone}
            ring={unreadCount > 0}
          />
          <HeaderButton
            icon="menu"
            label="Open navigation menu"
            onPress={() => setMenuOpen(true)}
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
            <LinearGradient
              pointerEvents="none"
              colors={['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']}
              locations={[0, 0.34, 0.7, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View pointerEvents="none" style={[styles.identityWash, washStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']}
                start={{ x: 0, y: 0.15 }}
                end={{ x: 1, y: 0.85 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.identityOrb, orbStyle]} />
            <View pointerEvents="none" style={styles.identityGlow} />

            <View style={styles.avatarStage}>
              <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
              <View style={styles.avatarFrame}>
                <Avatar
                  initials={initials}
                  size={60}
                  backgroundColor="rgba(255,255,255,0.14)"
                  textColor={colors.white}
                  imageUri={imageUri}
                />
              </View>
              <View style={[styles.statusBadge, !verified && styles.statusBadgePending]}>
                <Ionicons
                  name={verified ? 'checkmark' : 'time'}
                  size={12}
                  color={colors.white}
                />
              </View>
            </View>
            <View style={styles.textCol}>
              <Animated.View style={[styles.greetingRow, greetingTextStyle]}>
                <Animated.View
                  entering={reduced ? undefined : FadeInRight.delay(40).duration(320)}
                >
                  <Ionicons name={greetingIcon} size={15} color={colors.yellow} />
                </Animated.View>
                <Animated.Text style={styles.greeting} numberOfLines={1}>
                  {greeting},
                </Animated.Text>
              </Animated.View>
              <Animated.Text style={[styles.name, nameTextStyle]} numberOfLines={1}>
                {firstName}
              </Animated.Text>
              <Animated.View style={[styles.nameRule, nameRuleStyle]} />
              <Animated.View
                entering={reduced ? undefined : FadeInDown.delay(260).duration(360)}
                style={styles.metaRow}
              >
                <View style={styles.roleStack}>
                  <Animated.View pointerEvents="none" style={[styles.roleRing, roleRingStyle]} />
                  <View style={styles.rolePill}>
                    <Ionicons name="medkit-outline" size={12} color={colors.yellow} />
                    <Text style={styles.role} numberOfLines={1}>
                      {roleLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.dateChip}>
                  <Ionicons name="calendar-outline" size={12} color={colors.yellow} />
                  <Text style={styles.date} numberOfLines={1}>
                    {today}
                  </Text>
                </View>
              </Animated.View>
            </View>
            <View style={styles.chevron}>
              <Ionicons name="chevron-forward" size={16} color={colors.white} />
            </View>
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
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#041018',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  brandAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  brandWash: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 120,
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
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    gap: spacing.md,
    minHeight: 108,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0B2A43',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  identityWash: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    width: 140,
  },
  identityOrb: {
    position: 'absolute',
    right: -36,
    top: -42,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(22, 166, 182, 0.28)',
  },
  identityGlow: {
    position: 'absolute',
    left: -28,
    bottom: -48,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 210, 90, 0.10)',
  },
  avatarStage: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrame: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(22, 166, 182, 0.28)',
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
    borderWidth: 1.5,
    borderColor: '#0B2A43',
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
    columnGap: 8,
    rowGap: 8,
    marginTop: spacing.sm,
  },
  roleStack: {
    position: 'relative',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  roleRing: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 210, 90, 0.55)',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,210,90,0.28)',
  },
  role: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.15,
    color: colors.white,
    flexShrink: 1,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  date: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: 'rgba(255,255,255,0.92)',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.72)',
  },
  name: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: colors.white,
  },
  nameRule: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginTop: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
