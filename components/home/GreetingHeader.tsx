import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, typography } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import type { Member } from '@/types';
import { greetingForNow } from '@/utils/format';

type Props = {
  member: Member;
  unreadCount: number;
};

export function GreetingHeader({ member, unreadCount }: Props) {
  const router = useRouter();
  const greeting = greetingForNow();
  const { gutter, isCompact } = useLayout();
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withSpring(1, { damping: 18, stiffness: 170 });
  }, [reveal]);

  const motion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [-6, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View
      style={[
        styles.wrap,
        {
          marginHorizontal: -gutter,
          paddingHorizontal: gutter,
        },
      ]}
    >
      <View style={styles.decorOrb} pointerEvents="none" />
      <View style={styles.decorOrbSecondary} pointerEvents="none" />
      <Animated.View style={[styles.row, isCompact && styles.rowCompact, motion]}>
        <View style={styles.left}>
          <Avatar
            initials={member.avatarInitials}
            size={isCompact ? 44 : 52}
            backgroundColor="rgba(245,176,0,0.22)"
            textColor={colors.yellow}
          />
          <View style={styles.texts}>
            <Text style={styles.kicker}>HealthBridge · Cyprus</Text>
            <Text style={[styles.greeting, isCompact && styles.greetingCompact]} numberOfLines={2}>
              {greeting}, {member.firstName}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              {member.professionalRoleName}
            </Text>
            <Badge
              label="Verified Professional"
              color={colors.navy}
              backgroundColor={colors.yellow}
              icon="shield-checkmark"
              style={styles.badge}
            />
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
          {unreadCount > 0 ? (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.navy,
    marginTop: -spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  decorOrb: {
    position: 'absolute',
    top: -50,
    right: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(23, 105, 224, 0.2)',
  },
  decorOrbSecondary: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 176, 0, 0.08)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowCompact: {
    gap: spacing.xs,
  },
  left: {
    flexDirection: 'row',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  kicker: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: 'rgba(245,176,0,0.9)',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  greeting: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.white,
  },
  greetingCompact: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  role: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.72)',
  },
  badge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bellPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotText: {
    fontFamily: typography.fonts.bold,
    fontSize: 9,
    color: colors.navy,
  },
});
