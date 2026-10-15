import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { colors, spacing, typography } from '@/constants/theme';
import { greetingForNow } from '@/utils/format';

type Props = {
  firstName: string;
  roleLabel: string;
  initials: string;
  unreadCount?: number;
};

/** Compact light home greeting — not a full-width navy slab. */
export function GreetingHeader({ firstName, roleLabel, initials, unreadCount = 0 }: Props) {
  const router = useRouter();
  const greeting = greetingForNow();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Avatar
            initials={initials}
            size={44}
            backgroundColor={colors.tealSoft}
            textColor={colors.tealStrong}
          />
          <View style={styles.textCol}>
            <View style={styles.kickerRow}>
              <BridgeHiveMark size={28} style={styles.mark} />
              <Text style={styles.kicker}>Bridge Hive</Text>
            </View>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}, {firstName}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              {roleLabel}
            </Text>
          </View>
        </View>
        <View style={styles.bellWrap}>
          <IconButton
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/notifications')}
            color={colors.navy}
            backgroundColor={colors.surfaceSubdued}
          />
          {unreadCount > 0 ? <View style={styles.dot} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  textCol: { flex: 1, gap: 2, minWidth: 0 },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    marginBottom: 2,
  },
  mark: {},
  kicker: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: '#0B2032',
    flexShrink: 1,
  },
  greeting: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.navy,
  },
  role: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  bellWrap: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});
