import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SignOutButton({
  onPress,
  loading = false,
  label = 'Sign out',
}: Props) {
  const reveal = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    reveal.value = withSpring(1, { damping: 16, stiffness: 170 });
  }, [reveal]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [8, 0], Extrapolation.CLAMP) },
      { scale: interpolate(press.value, [0, 1], [1, 0.97], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={loading}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 120 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 220 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={[styles.shell, shellStyle]}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator color={colors.yellow} size="small" />
        ) : (
          <Ionicons name="log-out-outline" size={20} color={colors.yellow} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{loading ? 'Signing out…' : label}</Text>
        <Text style={styles.subtitle}>End your HealthBridge session securely</Text>
      </View>
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.45)" />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 72,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(180,35,24,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
