import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { APP_BOOT_BG } from '@/components/brand/AppBootCover';
import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { colors, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { hasCompletedOnboarding } from '@/lib/onboarding-preference';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexScreen() {
  const { loading, session, homeRoute, bootstrapError, retryBootstrap } = useAuth();
  const { t } = useTranslation();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [seenWelcome, setSeenWelcome] = useState(false);

  useEffect(() => {
    let alive = true;
    void hasCompletedOnboarding().then((done) => {
      if (!alive) return;
      setSeenWelcome(done);
      setOnboardingReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (bootstrapError) {
    return (
      <View style={styles.boot} accessibilityRole="alert">
        <Text style={styles.errorText}>{t('boot.bootstrapError')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('boot.retrySetup')}
          onPress={() => {
            void retryBootstrap();
          }}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  // Signed-in hydrate: soft loader — never a blank navy canvas.
  if (session && (loading || !onboardingReady)) {
    return (
      <View style={styles.sessionLoading}>
        <HiveFlowBackground />
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (loading || !onboardingReady) {
    return (
      <View style={styles.sessionLoading}>
        <HiveFlowBackground />
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (session) {
    return <Redirect href={homeRoute as never} />;
  }

  if (!seenWelcome) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/auth/worker/login" />;
}

const styles = StyleSheet.create({
  sessionLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  boot: {
    flex: 1,
    backgroundColor: APP_BOOT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  errorText: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(244, 250, 252, 0.88)',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(21, 150, 181, 0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244, 197, 66, 0.4)',
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: '#F4FAFC',
  },
});
