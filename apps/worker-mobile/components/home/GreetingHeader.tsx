import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { AppMenuDrawer } from '@/components/navigation/AppMenuDrawer';
import { Avatar } from '@/components/ui/Avatar';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { greetingForNow } from '@/utils/format';

type Props = {
  firstName: string;
  roleLabel: string;
  initials: string;
  unreadCount?: number;
  /** Visual tone for the bell badge (billing vs generic). */
  alertTone?: 'default' | 'money' | 'danger';
};

/** Premium home greeting — branded hero with profile + menu actions. */
export function GreetingHeader({
  firstName,
  roleLabel,
  initials,
  unreadCount = 0,
  alertTone = 'default',
}: Props) {
  const router = useRouter();
  const greeting = greetingForNow();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [glow, reduced]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.35,
    transform: [{ translateX: glow.value * 28 }],
  }));

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#08253C', '#0B3A4F', '#0E6670', '#0F766E']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.glowOrb, glowStyle]}>
        <LinearGradient
          colors={['rgba(20, 169, 181, 0.45)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.topSheen} />

      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <View style={styles.markChip}>
            <BridgeHiveMark size={40} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Bridge Hive</Text>
            <Text style={styles.brandTag}>Worker workspace</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            style={({ pressed }) => [styles.chromeBtn, pressed && styles.pressed]}
          >
            <Ionicons name="menu" size={20} color={colors.white} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} alert${unreadCount === 1 ? '' : 's'}`
                : 'Notifications'
            }
            style={({ pressed }) => [styles.chromeBtn, pressed && styles.pressed]}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={20}
              color={colors.white}
            />
            {unreadCount > 0 ? (
              <View
                style={[
                  styles.badge,
                  alertTone === 'danger' && styles.badgeDanger,
                  alertTone === 'money' && styles.badgeMoney,
                ]}
              >
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.greetingRow}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={({ pressed }) => [styles.avatarHit, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={['#F5C542', '#14A9B5', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <Avatar
              initials={initials}
              size={52}
              backgroundColor="#E4F7F9"
              textColor={colors.navy}
            />
          </LinearGradient>
          <View style={styles.profileCue}>
            <Ionicons name="person" size={10} color={colors.navy} />
          </View>
        </Pressable>

        <View style={styles.textCol}>
          <Text style={styles.greetingLabel}>Welcome back</Text>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}, {firstName}
          </Text>
          <View style={styles.rolePill}>
            <View style={styles.roleDot} />
            <Text style={styles.role} numberOfLines={1}>
              {roleLabel}
            </Text>
          </View>
        </View>
      </View>

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
    borderRadius: radii.lg,
    overflow: 'hidden',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    ...shadows.md,
  },
  glowOrb: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  topSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  markChip: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  brandName: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.white,
  },
  brandTag: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chromeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  pressed: {
    opacity: 0.86,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    borderWidth: 1.5,
    borderColor: '#0B3A4F',
  },
  badgeMoney: {
    backgroundColor: colors.honeyStrong,
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarHit: {
    position: 'relative',
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    ...shadows.sm,
  },
  profileCue: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B3A4F',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  greetingLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  greeting: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.white,
  },
  rolePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    maxWidth: '100%',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  role: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 1,
  },
});
