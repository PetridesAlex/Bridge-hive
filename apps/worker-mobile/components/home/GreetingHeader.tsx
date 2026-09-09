import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing, typography } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { greetingForNow } from '@/utils/format';

type Props = {
  firstName: string;
  roleLabel: string;
  initials: string;
  unreadCount?: number;
};

export function GreetingHeader({ firstName, roleLabel, initials, unreadCount = 0 }: Props) {
  const router = useRouter();
  const greeting = greetingForNow();
  const { gutter } = useLayout();

  return (
    <View style={[styles.wrap, { marginHorizontal: -gutter, paddingHorizontal: gutter }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Avatar
            initials={initials}
            size={52}
            backgroundColor="rgba(245,176,0,0.22)"
            textColor={colors.yellow}
          />
          <View style={styles.textCol}>
            <Text style={styles.kicker}>Bridge Hive · Cyprus</Text>
            <Text style={styles.greeting}>
              {greeting}, {firstName}
            </Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          style={styles.bell}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
          {unreadCount > 0 ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.navy,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  textCol: { flex: 1, gap: 2 },
  kicker: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.yellow,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.white,
  },
  role: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
});
