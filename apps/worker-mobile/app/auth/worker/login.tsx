import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AuthField } from '@/components/auth/AuthField';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { peekPendingShiftRoute } from '@/lib/push/pending-shift';
import { useAuth } from '@/providers/AuthProvider';

function DynamicPressable({
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  children,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'link';
  children: React.ReactNode;
  style?: object;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={motion}>
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        hitSlop={10}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function WorkerLoginScreen() {
  const { signIn, session, loading, homeRoute, isVerified } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    const pending = peekPendingShiftRoute();
    if (pending && isVerified) {
      return <Redirect href={pending as never} />;
    }
    return <Redirect href={homeRoute as never} />;
  }

  const onSubmit = async () => {
    setError(undefined);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // signIn awaits profile hydration; Redirect above sends verified workers
    // straight to the dashboard (homeRoute) on the next render.
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage shifts, timesheets, and commission invoices for healthcare professionals."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to BridgeHive?</Text>
          <DynamicPressable
            onPress={() => router.push('/auth/worker/register')}
            accessibilityRole="link"
            accessibilityLabel="Create professional account"
          >
            <Text style={styles.footerLink}>Create professional account</Text>
          </DynamicPressable>
        </View>
      }
    >
      <AuthField
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="name@email.com"
      />
      <AuthField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        placeholder="Required"
      />

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <AuthPrimaryButton
          label="Sign in"
          loading={submitting}
          onPress={() => void onSubmit()}
        />
        <DynamicPressable
          onPress={() => router.push('/auth/worker/forgot-password')}
          accessibilityLabel="Forgot password"
          style={styles.forgotBtn}
        >
          <Text style={styles.forgot}>Forgot password?</Text>
        </DynamicPressable>
        <GoogleSignInButton />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  forgotBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgot: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navyLift,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.tealStrong,
  },
});
