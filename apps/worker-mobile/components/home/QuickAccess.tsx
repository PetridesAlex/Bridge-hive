import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type AccessItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  gradient: [string, string];
  soft: string;
  border: string;
  badge?: string;
};

const ITEMS: AccessItem[] = [
  {
    key: 'shifts',
    title: 'Open shifts',
    subtitle: 'Role-matched marketplace',
    icon: 'search',
    href: '/(tabs)/shifts',
    gradient: [colors.navy, colors.tealStrong],
    soft: colors.tealSoft,
    border: 'rgba(20, 169, 181, 0.28)',
    badge: 'Browse',
  },
  {
    key: 'work',
    title: 'My shifts',
    subtitle: 'Accepted assignments',
    icon: 'briefcase',
    href: '/(tabs)/work',
    gradient: [colors.honeyStrong, '#C47A12'],
    soft: colors.yellowLight,
    border: 'rgba(212, 148, 36, 0.35)',
    badge: 'Work',
  },
  {
    key: 'money',
    title: 'Money',
    subtitle: 'Earnings and invoices',
    icon: 'wallet',
    href: '/(tabs)/payments',
    gradient: ['#146C43', colors.success],
    soft: colors.successLight,
    border: 'rgba(25, 135, 84, 0.28)',
    badge: 'Pay',
  },
];

function AccessCard({ item, index }: { item: AccessItem; index: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(nudge.value, [0, 1], [0, 3]) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(nudge.value, [0, 1], [1, 1.08]) }],
  }));

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(80 + index * 70).duration(360)}
      style={motionStyle}
    >
      <Pressable
        onPress={() => router.push(item.href as never)}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.975, { damping: 16, stiffness: 340 });
          nudge.value = withSpring(1, { damping: 14, stiffness: 300 });
        }}
        onPressOut={() => {
          if (reduced) return;
          scale.value = withSpring(1, { damping: 14, stiffness: 280 });
          nudge.value = withSpring(0, { damping: 12, stiffness: 240 });
        }}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: item.soft,
            shadowColor: item.gradient[1],
          },
          pressed && styles.cardPressed,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[`${item.gradient[0]}18`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={iconStyle}>
          <LinearGradient
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.icon}
          >
            <Ionicons name={item.icon} size={20} color={colors.white} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {item.badge ? (
              <View style={[styles.badge, { backgroundColor: item.gradient[0] }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>

        <View style={[styles.chevron, { backgroundColor: `${item.gradient[1]}22` }]}>
          <Animated.View style={arrowStyle}>
            <Ionicons name="arrow-forward" size={16} color={item.gradient[0]} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Premium home shortcuts with per-destination color systems. */
export function QuickAccess() {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Shortcuts</Text>
          <Text style={styles.heading}>Quick access</Text>
        </View>
        <View style={styles.headerAccent}>
          <LinearGradient
            colors={[colors.navy, colors.tealStrong]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.headerBar}
          />
        </View>
      </View>

      <View style={styles.stack}>
        {ITEMS.map((item, index) => (
          <AccessCard key={item.key} item={item} index={index} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  heading: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  headerAccent: {
    paddingBottom: 6,
  },
  headerBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  stack: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 84,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  cardPressed: {
    opacity: 0.92,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.text,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
