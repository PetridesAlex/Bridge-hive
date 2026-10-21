import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** Optional trailing icon (defaults to forward arrow). */
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Premium CTA — navy→teal gradient, spring press, icon nudge. */
export function PremiumActionButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
  icon = 'arrow-forward',
}: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const isDisabled = disabled || loading;

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, motionStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPressIn={() => {
          if (reduced || isDisabled) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(6, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={[styles.button, isDisabled && styles.disabled]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.sheen} />
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={styles.label}>{label}</Text>
            <Animated.View style={iconStyle}>
              <Ionicons name={icon} size={18} color={colors.yellow} />
            </Animated.View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    ...shadows.lg,
    borderRadius: radii.full,
  },
  button: {
    minHeight: 54,
    borderRadius: radii.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  label: {
    fontFamily: typography.fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.white,
    letterSpacing: -0.1,
  },
  disabled: {
    opacity: 0.55,
  },
});
