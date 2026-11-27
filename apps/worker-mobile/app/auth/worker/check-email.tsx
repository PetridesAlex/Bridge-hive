import { WORKER_CONFIRM_RESEND_COOLDOWN_MS } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG } from '@/constants/config';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
import {
  clearPendingConfirmEmail,
  getPendingConfirmEmail,
  setPendingConfirmEmail,
} from '@/lib/pending-confirm-email';
import { useAuth } from '@/providers/AuthProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ActionLink({
  label,
  onPress,
  reduced,
}: {
  label: string;
  onPress: () => void;
  reduced: boolean;
}) {
  const scale = useSharedValue(1);
  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) scale.value = withSpring(0.96, { damping: 16, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      style={[styles.linkHit, shell]}
    >
      <Text style={styles.linkText}>{label}</Text>
    </AnimatedPressable>
  );
}

export default function WorkerCheckEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { resendSignupConfirmation } = useAuth();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [email, setEmail] = useState(() => getPendingConfirmEmail() ?? '');
  const [editing, setEditing] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [resending, setResending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const resendLock = useRef(false);

  const enter = (delay: number) =>
    reduced ? undefined : FadeInDown.delay(delay).springify().damping(16).stiffness(160);

  // Strip legacy ?email= from the URL into memory, then clear the query.
  useEffect(() => {
    const fromQuery = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
    if (fromQuery) {
      setPendingConfirmEmail(fromQuery);
      setEmail(fromQuery);
      setDraftEmail(fromQuery);
      router.replace('/auth/worker/check-email');
      return;
    }
    const stored = getPendingConfirmEmail();
    if (stored) {
      setEmail(stored);
      setDraftEmail(stored);
    }
  }, [params.email]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const canResend = Boolean(email.includes('@')) && cooldownLeftSec === 0 && !resending;

  const onSaveEmail = () => {
    const next = draftEmail.trim().toLowerCase();
    if (!next.includes('@')) {
      setError(t('auth.enterValidEmail'));
      return;
    }
    setPendingConfirmEmail(next);
    setEmail(next);
    setEditing(false);
    setError(undefined);
    setMessage(t('auth.addressUpdated'));
  };

  const onResend = async () => {
    if (!canResend || resendLock.current) return;
    resendLock.current = true;
    setResending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await resendSignupConfirmation(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCooldownUntil(Date.now() + WORKER_CONFIRM_RESEND_COOLDOWN_MS);
      setMessage(t('auth.invitationDeliveryNote'));
    } finally {
      setResending(false);
      resendLock.current = false;
    }
  };

  return (
    <AuthShell
      title={t('auth.confirmEmailTitle')}
      subtitle={t('auth.confirmEmailSubtitle')}
      showBack={false}
      centered
    >
      <View style={styles.body}>
        <Animated.View
          entering={enter(40)}
          style={styles.inviteCard}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(25, 135, 84, 0.14)', 'rgba(255,255,255,0.35)', 'rgba(25, 135, 84, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.inviteHeader}>
            <Animated.View
              entering={
                reduced
                  ? undefined
                  : ZoomIn.delay(80).springify().damping(12).stiffness(180)
              }
              style={styles.tickHalo}
            >
              <LinearGradient
                colors={['#1B8A52', colors.success]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tickBadge}
              >
                <Ionicons name="checkmark" size={18} color={colors.white} />
              </LinearGradient>
            </Animated.View>
            <View style={styles.inviteCopy}>
              <Text style={styles.inviteTitle}>{t('auth.invitationSent')}</Text>
              <Text style={styles.inviteWaiting}>{t('auth.invitationWaitingLabel')}</Text>
            </View>
          </View>
          {email ? (
            <View style={styles.emailChip} accessibilityLabel={email}>
              <Ionicons name="mail-outline" size={13} color="#146C43" />
              <Text style={styles.emailChipText} numberOfLines={1}>
                {email}
              </Text>
            </View>
          ) : null}
          <Text style={styles.inviteBody}>
            {email
              ? t('auth.invitationBodyWithEmail', { email })
              : t('auth.invitationBody')}{' '}
            {t('auth.invitationNextStep')}
          </Text>
          <Text style={styles.deliveryNote}>{t('auth.invitationDeliveryNote')}</Text>
        </Animated.View>

        {!email ? (
          <Text style={styles.hint}>{t('auth.enterRegisterEmail')}</Text>
        ) : null}

        {editing ? (
          <Animated.View entering={enter(80)} style={styles.editBlock}>
            <TextInput
              label={t('common.email')}
              value={draftEmail}
              onChangeText={setDraftEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button label={t('auth.saveAddress')} variant="secondary" onPress={onSaveEmail} />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => {
                setEditing(false);
                setDraftEmail(email);
                setError(undefined);
              }}
            />
          </Animated.View>
        ) : null}
      </View>

      {message ? (
        <Animated.Text entering={enter(60)} style={styles.message}>
          {message}
        </Animated.Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Animated.View entering={enter(120)}>
          <Button
            label={t('auth.continueToSignIn')}
            variant="primary"
            size="lg"
            onPress={() => {
              clearPendingConfirmEmail();
              router.replace('/auth/worker/login');
            }}
          />
        </Animated.View>

        <Animated.View entering={enter(180)}>
          <Button
            label={
              cooldownLeftSec > 0
                ? t('auth.resendAvailableIn', { seconds: cooldownLeftSec })
                : t('auth.resendConfirmation')
            }
            variant="secondary"
            loading={resending}
            disabled={!canResend}
            onPress={() => void onResend()}
          />
        </Animated.View>

        {!editing ? (
          <Animated.View entering={enter(240)} style={styles.linkRow}>
            <ActionLink
              label={t('auth.wrongEmailEdit')}
              reduced={reduced}
              onPress={() => {
                setEditing(true);
                setDraftEmail(email);
              }}
            />
            <Text style={styles.linkDot} accessibilityElementsHidden>
              ·
            </Text>
            <ActionLink
              label={t('auth.backToRegistration')}
              reduced={reduced}
              onPress={() => {
                router.replace({
                  pathname: '/auth/worker/register',
                  params: email ? { email } : {},
                } as never);
              }}
            />
          </Animated.View>
        ) : null}
      </View>

      <Text style={styles.support}>
        {t('auth.supportLabel', { email: APP_CONFIG.supportEmail })}
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm, width: '100%' },
  inviteCard: {
    width: '100%',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 108, 67, 0.28)',
    backgroundColor: '#E8F7EE',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tickHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 135, 84, 0.12)',
  },
  tickBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  inviteTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: '#0B3D24',
  },
  inviteWaiting: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: '#146C43',
  },
  inviteBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#1F5C3A',
  },
  emailChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 108, 67, 0.22)',
  },
  emailChipText: {
    flexShrink: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    lineHeight: 15,
    color: '#0B3D24',
  },
  deliveryNote: {
    fontFamily: typography.fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(31, 92, 58, 0.72)',
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  editBlock: { gap: spacing.sm, marginTop: spacing.sm },
  message: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.success,
    textAlign: 'center',
  },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.xs,
  },
  linkHit: {
    minHeight: 36,
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: colors.navy,
    letterSpacing: -0.1,
  },
  linkDot: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
