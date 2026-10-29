import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';

/** Official Google brand colors (Identity guidelines). */
const GOOGLE = {
  blue: '#4285F4',
  red: '#EA4335',
  yellow: '#FBBC05',
  green: '#34A853',
  text: '#1F1F1F',
  border: '#747775',
  surface: '#FFFFFF',
  divider: '#DADCE0',
} as const;

/**
 * Compact official-style Google "G" mark using brand blues/reds/yellows/greens.
 * Pure Views — no SVG dependency.
 */
function GoogleMark({
  size = 18,
  cutoutColor = GOOGLE.surface,
}: {
  size?: number;
  cutoutColor?: string;
}) {
  const stroke = Math.max(2.5, size * 0.195);
  const armHeight = stroke;
  const armWidth = size * 0.52;
  const cut = size * 0.38;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderTopColor: GOOGLE.red,
          borderRightColor: GOOGLE.blue,
          borderBottomColor: GOOGLE.green,
          borderLeftColor: GOOGLE.yellow,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          right: -1,
          width: cut,
          height: size * 0.56,
          backgroundColor: cutoutColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: (size - armHeight) / 2,
          right: 0,
          width: armWidth,
          height: armHeight,
          backgroundColor: GOOGLE.blue,
          borderTopRightRadius: 1,
          borderBottomRightRadius: 1,
        }}
      />
    </View>
  );
}

export function GoogleSignInButton({
  onSuccess,
  compact = false,
  glass = false,
}: {
  onSuccess?: () => void;
  /** Narrower centered pill for the auth choice landing. */
  compact?: boolean;
  /** Frosted transparent treatment for navy/glass auth landing. */
  glass?: boolean;
}) {
  const { signInWithGoogle } = useAuth();
  const reduced = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduced || !compact) return;
    lift.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [compact, lift, reduced]);

  const motion = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: compact && !reduced ? (1 - lift.value) * 6 : 0 },
    ],
    opacity: compact && !reduced ? 0.55 + lift.value * 0.45 : 1,
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

  const cutout = glass ? 'rgba(12, 48, 68, 0.55)' : GOOGLE.surface;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.dividerRow} accessibilityElementsHidden>
        <View style={[styles.line, glass && styles.lineGlass]} />
        <Text style={[styles.or, glass && styles.orGlass]}>
          {compact ? 'or' : 'or continue with'}
        </Text>
        <View style={[styles.line, glass && styles.lineGlass]} />
      </View>
      <Animated.View style={[motion, compact && styles.btnFrame]}>
        <Pressable
          style={[
            styles.button,
            compact && styles.buttonCompact,
            glass ? styles.buttonGlass : null,
            loading ? styles.buttonDisabled : null,
          ]}
          onPress={() => void onPress()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityHint="Opens Google sign-in in the system browser"
          accessibilityState={{ busy: loading, disabled: loading }}
          onPressIn={() => {
            if (reduced || loading) return;
            scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
        >
          {glass ? (
            <View pointerEvents="none" style={styles.glassSheen} />
          ) : null}
          {loading ? (
            <ActivityIndicator color={glass ? '#14A9B5' : GOOGLE.blue} />
          ) : (
            <>
              <GoogleMark size={compact ? 18 : 20} cutoutColor={cutout} />
              <Text
                style={[
                  styles.label,
                  compact && styles.labelCompact,
                  glass && styles.labelGlass,
                ]}
              >
                {compact ? 'Google' : 'Continue with Google'}
              </Text>
            </>
          )}
        </Pressable>
      </Animated.View>
      {error ? (
        <Animated.Text
          entering={reduced ? undefined : FadeIn.duration(220)}
          style={styles.error}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  wrapCompact: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: GOOGLE.divider,
  },
  lineGlass: {
    backgroundColor: 'rgba(20, 169, 181, 0.28)',
  },
  or: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: GOOGLE.border,
    letterSpacing: 0.3,
  },
  orGlass: {
    color: 'rgba(20, 169, 181, 0.72)',
  },
  btnFrame: {
    width: '100%',
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 50,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: GOOGLE.border,
    backgroundColor: GOOGLE.surface,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  buttonCompact: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  buttonGlass: {
    backgroundColor: 'rgba(20, 169, 181, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.4)',
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: GOOGLE.text,
    letterSpacing: 0.15,
  },
  labelCompact: {
    fontSize: 15,
    letterSpacing: 0,
  },
  labelGlass: {
    color: '#B8E4EA',
    letterSpacing: -0.1,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: GOOGLE.red,
    textAlign: 'center',
    lineHeight: 18,
  },
});
