import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
import {
  createDeletionClientRequestId,
  detectAuthProviderKind,
  requestWorkerAccountDeletion,
} from '@/lib/account-deletion';
import { signInWithGoogleOAuth } from '@/lib/oauth';
import { clearPendingShiftRoute } from '@/lib/push/pending-shift';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'explain' | 'reauth' | 'final' | 'working' | 'done' | 'requested' | 'failed';

const FLOW: Step[] = ['explain', 'reauth', 'final'];

function stepIndex(step: Step) {
  const i = FLOW.indexOf(step);
  if (i >= 0) return i;
  if (step === 'working' || step === 'done' || step === 'requested' || step === 'failed') return 2;
  return 0;
}

function SoftButton({
  label,
  onPress,
  tone = 'quiet',
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'quiet' | 'navy' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const sheen = useSharedValue(reduced ? 0.35 : 0);

  useEffect(() => {
    if (reduced || tone === 'quiet') {
      sheen.value = 0.35;
      return;
    }
    sheen.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, sheen, tone]);

  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 1], [0.18, 0.42]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-28, 36]) }],
  }));

  return (
    <Animated.View style={[styles.btnWrap, motion]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy, disabled: disabled || busy }}
        disabled={disabled || busy}
        onPress={onPress}
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.95, { damping: 14, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 280 });
        }}
        style={[
          styles.btn,
          tone === 'quiet' && styles.btnQuiet,
          tone === 'navy' && styles.btnNavy,
          tone === 'danger' && styles.btnDanger,
          (disabled || busy) && styles.btnDisabled,
        ]}
      >
        {tone === 'navy' ? (
          <LinearGradient
            pointerEvents="none"
            colors={['#072033', '#0B2A43', '#155A6E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {tone === 'danger' ? (
          <LinearGradient
            pointerEvents="none"
            colors={['#7A1410', '#B42318', '#E2553A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {tone === 'navy' || tone === 'danger' ? (
          <Animated.View pointerEvents="none" style={[styles.btnSheenSweep, sheenStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.34)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        {tone === 'navy' || tone === 'danger' ? (
          <View pointerEvents="none" style={styles.btnSheen} />
        ) : null}
        {busy ? (
          <ActivityIndicator color={tone === 'quiet' ? colors.navy : colors.white} />
        ) : (
          <Text
            style={[
              styles.btnLabel,
              tone === 'quiet' && styles.btnLabelQuiet,
              tone !== 'quiet' && styles.btnLabelLight,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function leaveDeleteAccount() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/profile');
}

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { user, signOut, isAppReviewDemo } = useAuth();
  const reduced = useReducedMotion();
  const provider = useMemo(() => detectAuthProviderKind(user), [user]);
  const [step, setStep] = useState<Step>('explain');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const pulse = useSharedValue(0);
  const progress = useSharedValue(0);
  const ambience = useSharedValue(reduced ? 0.5 : 0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    progress.value = withTiming(stepIndex(step) / 2, {
      duration: reduced ? 0 : 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduced, step]);

  useEffect(() => {
    if (reduced) {
      ambience.value = 0.5;
      return;
    }
    ambience.value = withRepeat(
      withTiming(1, { duration: 7200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [ambience, reduced]);

  useEffect(() => {
    if (step !== 'working' || reduced) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse, reduced, step]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + interpolate(pulse.value, [0, 1], [0, 0.08]) }],
    opacity: interpolate(pulse.value, [0, 1], [1, 0.72]),
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: Math.max(trackWidth * 0.08, trackWidth * progress.value),
  }));

  const navyGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ambience.value, [0, 1], [0.22, 0.42]),
    transform: [
      { translateX: interpolate(ambience.value, [0, 1], [-10, 14]) },
      { translateY: interpolate(ambience.value, [0, 1], [6, -10]) },
      { scale: interpolate(ambience.value, [0, 1], [0.94, 1.08]) },
    ],
  }));

  const honeyGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ambience.value, [0, 1], [0.16, 0.34]),
    transform: [
      { translateX: interpolate(ambience.value, [0, 1], [8, -12]) },
      { translateY: interpolate(ambience.value, [0, 1], [-4, 10]) },
      { scale: interpolate(ambience.value, [0, 1], [1, 1.12]) },
    ],
  }));

  const tealGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ambience.value, [0, 1], [0.12, 0.28]),
    transform: [
      { translateX: interpolate(ambience.value, [0, 1], [-6, 10]) },
      { translateY: interpolate(ambience.value, [0, 1], [8, -8]) },
    ],
  }));

  const goWelcome = async () => {
    clearPendingShiftRoute();
    await signOut();
    router.replace('/welcome');
  };

  const beginContinue = () => {
    setError(null);
    if (isAppReviewDemo) {
      setError(t('profile.deleteAccountDemoBlocked'));
      return;
    }
    setStep('reauth');
  };

  const completeReauth = async () => {
    setError(null);
    if (!user?.email) {
      setError(t('profile.deleteAccountReauthFailed'));
      return;
    }

    setReauthBusy(true);
    try {
      if (provider === 'email') {
        if (!password.trim()) {
          setError(t('profile.deleteAccountPasswordRequired'));
          return;
        }
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });
        if (authError) {
          setError(t('profile.deleteAccountReauthFailed'));
          return;
        }
        setStep('final');
        return;
      }

      if (provider === 'google') {
        const result = await signInWithGoogleOAuth();
        if (result.cancelled) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setStep('final');
        return;
      }

      setError(t('profile.deleteAccountReauthFailed'));
    } finally {
      setReauthBusy(false);
    }
  };

  const runDeletion = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStep('working');
    setError(null);

    try {
      if (!requestIdRef.current) {
        requestIdRef.current = createDeletionClientRequestId();
      }
      const result = await requestWorkerAccountDeletion(requestIdRef.current);

      if (result.status === 'completed') {
        setResultMessage(result.message ?? t('profile.deleteAccountSuccessBody'));
        setStep('done');
        await goWelcome();
        return;
      }

      if (result.status === 'deletion_requested') {
        setResultMessage(result.message ?? t('profile.deleteAccountRequestedBody'));
        setStep('requested');
        return;
      }

      setError(result.message ?? t('profile.deleteAccountFailedBody'));
      setStep('failed');
    } finally {
      submittingRef.current = false;
    }
  };

  const onFinalConfirm = () => {
    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(
          `${t('profile.deleteAccountFinalTitle')}\n\n${t('profile.deleteAccountFinalBody')}`,
        );
      if (ok) void runDeletion();
      return;
    }
    Alert.alert(t('profile.deleteAccountFinalTitle'), t('profile.deleteAccountFinalBody'), [
      { text: t('profile.deleteAccountKeep'), style: 'cancel' },
      {
        text: t('profile.deleteAccountPermanently'),
        style: 'destructive',
        onPress: () => void runDeletion(),
      },
    ]);
  };

  const facts = [
    t('profile.deleteAccountBody'),
    t('profile.deleteAccountRetention'),
    t('profile.deleteAccountReregister'),
  ];

  // Entering animations can stick at opacity 0 on RN web; keep them native-only.
  const enter = reduced || Platform.OS === 'web' ? undefined : FadeInDown.duration(340);

  return (
    <AppScreen>
      <ScreenHeader
        title={t('profile.deleteAccount')}
        showBack
        showAccent={false}
        motion={false}
        onBack={() => {
          if (step === 'working') return;
          leaveDeleteAccount();
        }}
      />

      <View
        style={styles.progressTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <View style={styles.panel}>
        <Animated.View pointerEvents="none" style={[styles.panelOrbNavy, navyGlowStyle]} />
        <Animated.View pointerEvents="none" style={[styles.panelOrbHoney, honeyGlowStyle]} />
        <Animated.View pointerEvents="none" style={[styles.panelOrbTeal, tealGlowStyle]} />
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(255,255,255,0.72)',
            'rgba(214,232,242,0.28)',
            'rgba(255,210,90,0.08)',
            'rgba(255,255,255,0.04)',
          ]}
          locations={[0, 0.35, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.panelSheen}
        />

        <Animated.View style={[styles.mark, step === 'working' && pulseStyle]}>
          <LinearGradient
            colors={
              step === 'done'
                ? [colors.tealStrong, colors.teal]
                : step === 'failed'
                  ? ['#8E1B14', '#B42318']
                  : ['rgba(180,35,24,0.12)', 'rgba(180,35,24,0.05)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.markFill}
          >
            <Ionicons
              name={
                step === 'done'
                  ? 'checkmark'
                  : step === 'requested'
                    ? 'time-outline'
                    : step === 'failed'
                      ? 'alert'
                      : 'trash-outline'
              }
              size={18}
              color={step === 'done' || step === 'failed' ? colors.white : colors.error}
            />
          </LinearGradient>
        </Animated.View>

        {step === 'explain' ? (
          <Animated.View key="explain" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountTitle')}</Text>
            <View style={styles.facts}>
              {facts.map((line) => (
                <View key={line.slice(0, 24)} style={styles.factRow}>
                  <View style={styles.factDot} />
                  <Text style={styles.factText}>{line}</Text>
                </View>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <SoftButton
                label={t('profile.deleteAccountContinue')}
                tone="navy"
                onPress={beginContinue}
              />
              <SoftButton label={t('common.cancel')} tone="quiet" onPress={leaveDeleteAccount} />
            </View>
          </Animated.View>
        ) : null}

        {step === 'reauth' ? (
          <Animated.View key="reauth" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountReauthTitle')}</Text>
            <Text style={styles.lead}>
              {provider === 'google'
                ? t('profile.deleteAccountReauthGoogle')
                : t('profile.deleteAccountReauthEmail')}
            </Text>
            {provider === 'email' ? (
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('profile.deleteAccountPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel={t('profile.deleteAccountPasswordPlaceholder')}
              />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <SoftButton
                label={t('profile.deleteAccountContinue')}
                tone="navy"
                busy={reauthBusy}
                onPress={() => void completeReauth()}
              />
              <SoftButton
                label={t('common.cancel')}
                tone="quiet"
                onPress={() => setStep('explain')}
              />
            </View>
          </Animated.View>
        ) : null}

        {step === 'final' ? (
          <Animated.View key="final" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountFinalTitle')}</Text>
            <Text style={styles.lead}>{t('profile.deleteAccountFinalBody')}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <SoftButton
                label={t('profile.deleteAccountPermanently')}
                tone="danger"
                onPress={onFinalConfirm}
              />
              <SoftButton
                label={t('profile.deleteAccountKeep')}
                tone="quiet"
                onPress={leaveDeleteAccount}
              />
            </View>
          </Animated.View>
        ) : null}

        {step === 'working' ? (
          <Animated.View key="working" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountWorking')}</Text>
            <ActivityIndicator color={colors.error} style={{ marginTop: spacing.md }} />
          </Animated.View>
        ) : null}

        {step === 'done' ? (
          <Animated.View key="done" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountSuccessTitle')}</Text>
            <Text style={styles.lead}>
              {resultMessage ?? t('profile.deleteAccountSuccessBody')}
            </Text>
          </Animated.View>
        ) : null}

        {step === 'requested' ? (
          <Animated.View key="requested" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountRequestedTitle')}</Text>
            <Text style={styles.lead}>
              {resultMessage ?? t('profile.deleteAccountRequestedBody')}
            </Text>
            <View style={styles.actions}>
              <SoftButton
                label={t('profile.deleteAccountLeave')}
                tone="navy"
                onPress={() => void goWelcome()}
              />
            </View>
          </Animated.View>
        ) : null}

        {step === 'failed' ? (
          <Animated.View key="failed" entering={enter} style={styles.block}>
            <Text style={styles.title}>{t('profile.deleteAccountFailedTitle')}</Text>
            <Text style={styles.lead}>{error ?? t('profile.deleteAccountFailedBody')}</Text>
            <View style={styles.actions}>
              <SoftButton
                label={t('profile.deleteAccountRetry')}
                tone="navy"
                onPress={() => {
                  setStep('final');
                  setError(null);
                }}
              />
              <SoftButton label={t('common.cancel')} tone="quiet" onPress={leaveDeleteAccount} />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
    overflow: 'hidden',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
    backgroundColor: colors.navy,
  },
  panel: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
    backgroundColor: Platform.OS === 'web' ? 'rgba(245,250,255,0.34)' : 'rgba(255,255,255,0.88)',
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    gap: spacing.md + 2,
    ...shadows.sm,
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(26px) saturate(1.55)' } as object)
      : null),
  },
  panelSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  panelOrbNavy: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -90,
    right: -70,
    backgroundColor: 'rgba(11, 42, 67, 0.18)',
  },
  panelOrbHoney: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    bottom: -60,
    left: -40,
    backgroundColor: 'rgba(224, 170, 24, 0.2)',
  },
  panelOrbTeal: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: '42%',
    right: '18%',
    backgroundColor: 'rgba(22, 166, 182, 0.16)',
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(180, 35, 24, 0.12)',
  },
  markFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  lead: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  facts: {
    gap: spacing.sm,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  factDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
    backgroundColor: colors.navy,
    opacity: 0.35,
  },
  factText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.1)',
    paddingHorizontal: spacing.md,
    fontFamily: typography.fonts.medium,
    fontSize: 16,
    color: colors.navy,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  btnWrap: {
    alignSelf: 'center',
  },
  btn: {
    minHeight: 44,
    minWidth: 148,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnQuiet: {
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.1)',
    minHeight: 40,
    minWidth: 120,
    paddingHorizontal: 22,
  },
  btnNavy: {
    backgroundColor: colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,210,90,0.28)',
    shadowColor: '#0B2A43',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnDanger: {
    backgroundColor: colors.error,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#B42318',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  btnSheenSweep: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: 42,
  },
  btnLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.05,
  },
  btnLabelQuiet: {
    color: colors.navy,
    fontFamily: typography.fonts.medium,
  },
  btnLabelLight: {
    color: colors.white,
  },
});
