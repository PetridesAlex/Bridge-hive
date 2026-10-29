import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';

type MenuItem = {
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  accent: [string, string];
};

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Work',
    items: [
      {
        key: 'home',
        label: 'Home',
        subtitle: 'Schedule and next actions',
        icon: 'home',
        href: '/(tabs)',
        accent: [colors.navy, colors.tealStrong],
      },
      {
        key: 'shifts',
        label: 'Open shifts',
        subtitle: 'Role-matched marketplace',
        icon: 'search',
        href: '/(tabs)/shifts',
        accent: [colors.tealStrong, '#0E7490'],
      },
      {
        key: 'calendar',
        label: 'Shift calendar',
        subtitle: 'Browse by month',
        icon: 'calendar',
        href: '/shifts/calendar',
        accent: [colors.navyLift, colors.teal],
      },
      {
        key: 'work',
        label: 'My shifts',
        subtitle: 'Accepted assignments',
        icon: 'briefcase',
        href: '/(tabs)/work',
        accent: [colors.honeyStrong, '#C47A12'],
      },
      {
        key: 'documents',
        label: 'Credentials',
        subtitle: 'Licenses and documents',
        icon: 'document-text',
        href: '/documents',
        accent: [colors.navy, '#1B4F72'],
      },
    ],
  },
  {
    title: 'Money',
    items: [
      {
        key: 'payments',
        label: 'Money',
        subtitle: 'Earnings and payouts',
        icon: 'wallet',
        href: '/(tabs)/payments',
        accent: ['#146C43', colors.success],
      },
      {
        key: 'invoices',
        label: 'Invoices',
        subtitle: 'Commission invoices',
        icon: 'receipt',
        href: '/(tabs)/invoices',
        accent: [colors.navy, colors.tealStrong],
      },
      {
        key: 'payout',
        label: 'Payout setup',
        subtitle: 'Bank details for pay',
        icon: 'card',
        href: '/payout-setup',
        accent: ['#0E7490', colors.tealStrong],
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        key: 'profile',
        label: 'Profile',
        subtitle: 'Account overview',
        icon: 'person',
        href: '/(tabs)/profile',
        accent: [colors.navy, colors.navyLift],
      },
      {
        key: 'personal',
        label: 'Personal information',
        subtitle: 'Name, email, role',
        icon: 'person-circle',
        href: '/profile/personal-information',
        accent: [colors.navyLift, colors.teal],
      },
      {
        key: 'notifications',
        label: 'Notifications',
        subtitle: 'Alerts and updates',
        icon: 'notifications',
        href: '/notifications',
        accent: [colors.honeyStrong, colors.yellow],
      },
      {
        key: 'prefs',
        label: 'Notification preferences',
        subtitle: 'What you receive',
        icon: 'settings',
        href: '/profile/notification-preferences',
        accent: [colors.navy, '#345C78'],
      },
      {
        key: 'support',
        label: 'Support',
        subtitle: 'Get help',
        icon: 'help-circle',
        href: '/support',
        accent: [colors.tealStrong, colors.navy],
      },
      {
        key: 'app',
        label: 'App information',
        subtitle: 'Version and build',
        icon: 'information-circle',
        href: '/profile/app-information',
        accent: [colors.navySoft, colors.navy],
      },
    ],
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  firstName?: string;
  roleLabel?: string;
};

function MenuRow({
  item,
  delay,
  reduced,
  onPress,
}: {
  item: MenuItem;
  delay: number;
  reduced: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const chevron = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    chevron.value = withDelay(
      delay + 180,
      withRepeat(
        withSequence(
          withTiming(3, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [chevron, delay, reduced]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevron.value }],
  }));

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInRight.delay(delay).duration(380).springify().damping(18)
      }
      style={pressStyle}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.97, { damping: 16, stiffness: 360 });
        }}
        onPressOut={() => {
          if (!reduced) press.value = withSpring(1, { damping: 14, stiffness: 280 });
        }}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      >
        <LinearGradient
          colors={item.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.itemIcon}
        >
          <Ionicons name={item.icon} size={17} color={colors.white} />
        </LinearGradient>
        <View style={styles.itemText}>
          <Text style={styles.itemLabel}>{item.label}</Text>
          <Text style={styles.itemSub} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        <Animated.View style={[styles.chevronWrap, chevronStyle]}>
          <Ionicons name="chevron-forward" size={15} color={colors.tealStrong} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function AppMenuDrawer({ visible, onClose, firstName, roleLabel }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(348, Math.max(288, width * 0.88));
  const progress = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const accentPulse = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      progress.value = reduced
        ? 1
        : withSpring(1, { damping: 22, stiffness: 210, mass: 0.9 });
      if (!reduced) {
        shimmer.value = withRepeat(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        );
        accentPulse.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
      }
    } else {
      progress.value = 0;
      shimmer.value = 0;
      accentPulse.value = 1;
    }
  }, [accentPulse, progress, reduced, shimmer, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0.6, 1, 1]),
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-panelWidth * 0.92, 0]),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.97, 1]),
      },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.25, 0.55]),
    transform: [
      {
        translateX: interpolate(shimmer.value, [0, 1], [-40, 80]),
      },
    ],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: accentPulse.value }],
  }));

  const closeAnimated = () => {
    if (reduced) {
      onClose();
      return;
    }
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  };

  const go = (href: string) => {
    const navigate = () => {
      onClose();
      router.push(href as never);
    };
    if (reduced) {
      navigate();
      return;
    }
    progress.value = withTiming(
      0,
      { duration: 200, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(navigate)();
      },
    );
  };

  const performSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/auth/worker/login');
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (signingOut) return;
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' && window.confirm('End your Bridge Hive session?');
      if (confirmed) {
        onClose();
        void performSignOut();
      }
      return;
    }
    Alert.alert('Sign out', 'End your Bridge Hive session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          onClose();
          void performSignOut();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeAnimated}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeAnimated}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            {
              width: panelWidth,
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['#0B2A43', '#0E4A5C', '#0F766E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerWash}
          />
          <Animated.View pointerEvents="none" style={[styles.headerShimmer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.panelHeader}>
            <View style={styles.brandRow}>
              <View style={styles.markGlow}>
                <BridgeHiveMark size={42} />
              </View>
              <View style={styles.brandText}>
                <Text style={styles.brandName}>Bridge Hive</Text>
                <Text style={styles.brandMeta} numberOfLines={1}>
                  {[firstName ? `Hi, ${firstName}` : null, roleLabel]
                    .filter(Boolean)
                    .join(' · ') || 'Worker app'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={closeAnimated}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>

          <Animated.View style={[styles.rule, accentStyle]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* Remount on open so staggered enters replay each time. */}
            {visible
              ? MENU_SECTIONS.map((section, sectionIndex) => (
                  <Animated.View
                    key={`${section.title}-${visible}`}
                    entering={
                      reduced
                        ? undefined
                        : FadeInDown.delay(60 + sectionIndex * 70).duration(360)
                    }
                    style={styles.sectionCard}
                  >
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionDot} />
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                    </View>
                    {section.items.map((item, itemIndex) => (
                      <MenuRow
                        key={item.key}
                        item={item}
                        delay={90 + sectionIndex * 80 + itemIndex * 42}
                        reduced={reduced}
                        onPress={() => go(item.href)}
                      />
                    ))}
                  </Animated.View>
                ))
              : null}

            {visible ? (
              <Animated.View
                entering={
                  reduced
                    ? undefined
                    : FadeInDown.delay(60 + MENU_SECTIONS.length * 70).duration(360)
                }
              >
                <Pressable
                  onPress={confirmSignOut}
                  disabled={signingOut}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  style={({ pressed }) => [
                    styles.signOut,
                    pressed && styles.signOutPressed,
                    signingOut && styles.signOutDisabled,
                  ]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(18, 58, 92, 0.96)', 'rgba(11, 42, 67, 0.98)', 'rgba(7, 29, 48, 1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.signOutGloss}
                  />
                  <View style={styles.signOutIcon}>
                    <Ionicons name="log-out-outline" size={18} color={colors.white} />
                  </View>
                  <Text style={styles.signOutLabel}>
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 26, 47, 0.52)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  headerWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 148,
  },
  headerShimmer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 90,
    height: 148,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  markGlow: {
    borderRadius: 14,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  brandText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  brandName: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.3,
  },
  brandMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  rule: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  scroll: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    minHeight: 58,
  },
  itemPressed: {
    backgroundColor: colors.tealSoft,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.text,
  },
  itemSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  signOutGloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  signOutPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  signOutDisabled: {
    opacity: 0.6,
  },
  signOutIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  signOutLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
});
