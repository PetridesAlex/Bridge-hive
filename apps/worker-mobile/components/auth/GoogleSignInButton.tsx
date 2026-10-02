import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function GoogleSignInButton({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);

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
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && !loading ? styles.buttonPressed : null,
          loading ? styles.buttonDisabled : null,
        ]}
        onPress={() => void onPress()}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityHint="Opens Google sign-in in the system browser"
        accessibilityState={{ busy: loading, disabled: loading }}
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
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.md },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  buttonPressed: {
    backgroundColor: colors.surfaceSubdued,
    opacity: 0.96,
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
