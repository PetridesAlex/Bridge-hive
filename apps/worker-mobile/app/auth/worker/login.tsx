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
import { spacing, typography } from '@/constants/theme';
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
      tone="navy"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to BridgeHive?</Text>
          <DynamicPressable
            onPress={() => router.push('/auth/worker/register')}
            accessibilityRole="link"
            accessibilityLabel="Create professional account"
            style={styles.footerLinkHit}
          >
            <Text style={styles.footerLink}>Create professional account</Text>
          </DynamicPressable>
        </View>
      }
    >
      <AuthField
        tone="navy"
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
        tone="navy"
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
        <GoogleSignInButton glass />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: '#FF8A80',
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
    color: '#B8E4EA',
    textAlign: 'center',
  },
  /** One line on standard phones; wraps gracefully with large text. */
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  footerLinkHit: {
    minHeight: 44,
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(184, 228, 234, 0.78)',
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#D7EEF2',
  },
});
