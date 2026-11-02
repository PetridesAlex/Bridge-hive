import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

/** Centered session exit control — compact navy/red pill. */
export function SignOutButton({
  onPress,
  loading = false,
  label = 'Sign out',
}: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={motionStyle}>
        <Pressable
          onPress={onPress}
          disabled={loading}
          onPressIn={() => {
            if (reduced) return;
            scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: loading, busy: loading }}
          style={[styles.shell, loading && styles.shellBusy]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['#8E1B14', '#B42318', '#D1432F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.sheen} />
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <View style={styles.iconWrap}>
              <Ionicons name="log-out-outline" size={16} color="#8E1B14" />
            </View>
          )}
          <Text style={styles.title}>{loading ? 'Signing out…' : label}</Text>
        </Pressable>
      </Animated.View>
      <Text style={styles.subtitle}>End your Bridge Hive session securely</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  shellBusy: {
    opacity: 0.8,
    minWidth: 148,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
