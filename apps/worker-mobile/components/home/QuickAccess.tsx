import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type AccessItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  /** Icon + badge gradient — brand navy / teal / honey only. */
  gradient: [string, string];
  /** Soft glass wash behind the row. */
  wash: [string, string];
  accent: string;
  badge?: string;
};

const ITEMS: AccessItem[] = [
  {
    key: 'shifts',
    title: 'Open shifts',
    subtitle: 'Role-matched marketplace',
    icon: 'search',
    href: '/(tabs)/shifts',
    gradient: ['#0B2A43', '#0F6B6B'],
    wash: ['rgba(15, 107, 107, 0.28)', 'rgba(11, 42, 67, 0.18)'],
    accent: colors.tealStrong,
    badge: 'Browse',
  },
  {
    key: 'work',
    title: 'My shifts',
    subtitle: 'Accepted assignments',
    icon: 'briefcase',
    href: '/(tabs)/work',
    gradient: ['#F08C00', '#E0AA18'],
    wash: ['rgba(224, 170, 24, 0.22)', 'rgba(11, 42, 67, 0.16)'],
    accent: colors.yellow,
    badge: 'Work',
  },
  {
    key: 'money',
    title: 'Money',
    subtitle: 'Earnings and invoices',
    icon: 'wallet',
    href: '/(tabs)/payments',
    gradient: ['#0E4A5C', '#16A6B6'],
    wash: ['rgba(22, 166, 182, 0.24)', 'rgba(11, 42, 67, 0.16)'],
    accent: '#3BC4D8',
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
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={item.wash}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.cardEdge, { backgroundColor: item.accent }]} />

        <Animated.View style={iconStyle}>
          <LinearGradient
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.icon}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={item.key === 'work' ? colors.navy : colors.white}
            />
          </LinearGradient>
        </Animated.View>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {item.badge ? (
              <View style={[styles.badge, { backgroundColor: item.accent }]}>
                <Text
                  style={[
                    styles.badgeText,
                    item.key === 'work' && styles.badgeTextOnHoney,
                  ]}
                >
                  {item.badge}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>

        <View style={styles.chevron}>
          <Animated.View style={arrowStyle}>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Home shortcuts — navy panel with brand navy / teal / honey destinations. */
export function QuickAccess() {
  const reduced = useReducedMotion();
  const wash = useSharedValue(0);
  const orb = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      wash.value = 0.35;
      orb.value = 0.5;
      return;
    }
    wash.value = withRepeat(
      withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    orb.value = withRepeat(
      withTiming(1, { duration: 7200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [orb, reduced, wash]);

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.14, 0.36]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-36, 64]) }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 1], [0.16, 0.38]),
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [0, 12]) },
      { translateY: interpolate(orb.value, [0, 1], [0, -10]) },
      { scale: interpolate(orb.value, [0, 1], [0.94, 1.08]) },
    ],
  }));

  return (
    <View style={styles.wrap}>
      <LinearGradient
        pointerEvents="none"
        colors={['#071E33', '#0B2A43', '#0E4A5C']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.panelWash, washStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.panelOrb, orbStyle]} />
      <View pointerEvents="none" style={styles.panelHoney} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Shortcuts</Text>
          <Text style={styles.heading}>Quick access</Text>
        </View>
        <View style={styles.headerAccent}>
          <LinearGradient
            colors={[colors.yellow, colors.tealStrong]}
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
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0B2A43',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  panelWash: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 130,
  },
  panelOrb: {
    position: 'absolute',
    right: -40,
    top: -48,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(22, 166, 182, 0.24)',
  },
  panelHoney: {
    position: 'absolute',
    left: -28,
    bottom: -40,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 210, 90, 0.10)',
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
    color: colors.yellow,
  },
  heading: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.white,
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
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardEdge: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    color: colors.white,
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
  badgeTextOnHoney: {
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
