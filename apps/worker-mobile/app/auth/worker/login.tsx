import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AuthField } from '@/components/auth/AuthField';
import { AuthHandoffLoader } from '@/components/auth/AuthHandoffLoader';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
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
  const { signIn, session, loading, homeRoute, isVerified, googleSignInCompleting } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (googleSignInCompleting || (session && loading)) {
    return <AuthHandoffLoader />;
  }

  if (session) {
    const pending = peekPendingShiftRoute();
    if (pending && isVerified) {
      return <Redirect href={pending as never} />;
    }
    return <Redirect href={homeRoute as never} />;
  }

  const onSubmit = async () => {
    setError(undefined);
    if (!email.trim() || !password) {
      setError(t('auth.enterEmailPassword'));
      return;
    }
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Session publish triggers Redirect above on the next render.
  };

  return (
    <AuthShell
      title={t('auth.welcomeBack')}
      subtitle={t('auth.signInSubtitle')}
      tone="navy"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.newToBridgeHive')}</Text>
          <DynamicPressable
            onPress={() => router.push('/auth/worker/register')}
            accessibilityRole="link"
            accessibilityLabel={t('auth.createProfessionalAccount')}
            style={styles.footerLinkHit}
          >
            <Text style={styles.footerLink}>{t('auth.createProfessionalAccount')}</Text>
          </DynamicPressable>
        </View>
      }
    >
      <AuthField
        tone="navy"
        label={t('common.email')}
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder={t('auth.emailPlaceholder')}
      />
      <AuthField
        tone="navy"
        label={t('common.password')}
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        placeholder={t('auth.passwordPlaceholder')}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <AuthPrimaryButton
        label={t('auth.signIn')}
        onPress={() => {
          void onSubmit();
        }}
        loading={submitting}
      />
      <Pressable
        onPress={() => router.push('/auth/worker/forgot-password')}
        accessibilityRole="link"
        accessibilityLabel={t('auth.forgotPassword')}
        style={styles.forgotBtn}
      >
        <Text style={styles.forgot}>{t('auth.forgotPassword')}</Text>
      </Pressable>
      <GoogleSignInButton glass />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
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
