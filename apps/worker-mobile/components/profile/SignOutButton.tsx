import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

/** Borderless session tile — warm red mark, same surface as the account menu. */
export function SignOutButton({
  onPress,
  loading = false,
  label = 'Sign out',
}: Props) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={motionStyle}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        onHoverIn={() => {
          setHovered(true);
          if (!reduced) lift.value = withSpring(-2, { damping: 16, stiffness: 260 });
        }}
        onHoverOut={() => {
          setHovered(false);
          lift.value = withSpring(0, { damping: 16, stiffness: 260 });
        }}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: loading, busy: loading }}
        style={styles.shell}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            hovered
              ? ['rgba(255,255,255,0.98)', 'rgba(255,246,244,0.96)']
              : ['rgba(255,255,255,0.94)', 'rgba(255,248,246,0.9)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['#8E1B14', '#B42318', '#D1432F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="log-out-outline" size={18} color={colors.white} />
          )}
        </LinearGradient>
        <View style={styles.copy}>
          <Text style={styles.title}>{loading ? 'Signing out…' : label}</Text>
          <Text style={styles.subtitle}>End your Bridge Hive session securely</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 72,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    color: '#8E1B14',
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
