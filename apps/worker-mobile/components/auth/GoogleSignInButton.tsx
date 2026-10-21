import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';

export function GoogleSignInButton({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { signInWithGoogle } = useAuth();
  const reduced = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);
  const scale = useSharedValue(1);

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = async () => {
    if (lock.current || loading) return;
    lock.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess?.();
    } finally {
      setLoading(false);
      lock.current = false;
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow} accessibilityElementsHidden>
        <View style={styles.line} />
        <Text style={styles.or}>or continue with</Text>
        <View style={styles.line} />
      </View>
      <Animated.View style={motion}>
        <Pressable
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          onPress={() => void onPress()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityHint="Opens Google sign-in in the system browser"
          accessibilityState={{ busy: loading, disabled: loading }}
          onPressIn={() => {
            if (reduced || loading) return;
            scale.value = withSpring(0.975, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <View style={styles.gMark} accessibilityElementsHidden>
                <Text style={styles.gLetter}>G</Text>
              </View>
              <Text style={styles.label}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 32, 50, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  gLetter: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.text,
    marginTop: -1,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 18,
  },
});
