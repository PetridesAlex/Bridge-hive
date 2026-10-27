import { type PayoutAccountStatusInput } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG } from '@/constants/config';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { usePayouts } from '@/hooks/usePayouts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  canEditPayoutAccount,
  payoutAccountScreenStatusLabel,
  validatePayoutAccountForm,
} from '@/lib/payout-account-ui';
import {
  pickPayoutProofFile,
  pickPayoutProofImage,
  uploadPayoutProof,
} from '@/lib/payout';
import { submitPayoutAccount } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';

function statusTone(status: PayoutAccountStatusInput): {
  label: string;
  fg: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  const label = payoutAccountScreenStatusLabel(status);
  if (status === 'pending') {
    return {
      label,
      fg: '#8A6410',
      bg: colors.yellowLight,
      icon: 'time',
    };
  }
  if (status === 'verified') {
    return {
      label,
      fg: colors.white,
      bg: colors.success,
      icon: 'checkmark-circle',
    };
  }
  if (status === 'rejected' || status === 'failed') {
    return {
      label,
      fg: colors.white,
      bg: colors.error,
      icon: 'alert-circle',
    };
  }
  if (status === 'suspended') {
    return {
      label,
      fg: colors.white,
      bg: colors.error,
      icon: 'ban',
    };
  }
  return {
    label,
    fg: colors.navy,
    bg: colors.tealSoft,
    icon: 'card-outline',
  };
}

function SubmitPayoutButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const sheen = useSharedValue(0);
  const disabled = loading;

  useEffect(() => {
    if (reduced || disabled) {
      sheen.value = 0;
      return;
    }
    sheen.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [disabled, reduced, sheen]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.05 + sheen.value * 0.12,
    transform: [{ translateX: -24 + sheen.value * 48 }],
  }));

  return (
    <Animated.View style={[styles.submitWrap, motionStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading, disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (reduced || disabled) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(4, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={[styles.submitBtn, disabled && styles.submitDisabled]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View pointerEvents="none" style={[styles.submitSheen, sheenStyle]} />
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={styles.submitLabel}>{label}</Text>
            <Animated.View style={iconStyle}>
              <Ionicons name="arrow-forward" size={15} color={colors.yellow} />
            </Animated.View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function PayoutSetupScreen() {
  const { session, user, loading, isVerified, accountRejectionReason } = useAuth();
  const { account, refresh } = usePayouts(user?.id);
  const [holderName, setHolderName] = useState('');
  const [ibanInput, setIbanInput] = useState('');
  const [proofPath, setProofPath] = useState<string>();
  const [proofMime, setProofMime] = useState<string>();
  const [proofLabel, setProofLabel] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (account?.account_holder_name) {
      setHolderName(account.account_holder_name);
    }
  }, [account?.account_holder_name]);

  const returnToAccountSetup = !isVerified;
  const goBack = () => {
    if (returnToAccountSetup) {
      router.replace('/auth/worker/pending');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  };

  // Resubmit only when unset or correction required — pending/verified stay view-only.
  const canEdit = canEditPayoutAccount(
    account?.status as PayoutAccountStatusInput | undefined,
  );

  const tone = useMemo(
    () => statusTone((account?.status as PayoutAccountStatusInput) ?? null),
    [account?.status],
  );

  const onPickProof = useCallback(async (source: 'file' | 'image') => {
    if (!user?.id) return;
    setMessage(undefined);
    const picked =
      source === 'file' ? await pickPayoutProofFile() : await pickPayoutProofImage();
    if (!picked.ok) {
      if (!picked.cancelled) setMessage(picked.error);
      return;
    }
    setUploading(true);
    const uploaded = await uploadPayoutProof({
      userId: user.id,
      uri: picked.uri,
      mimeType: picked.mimeType,
    });
    setUploading(false);
    if (uploaded.error || !uploaded.path) {
      setMessage(uploaded.error ?? 'Upload failed.');
      return;
    }
    setProofPath(uploaded.path);
    setProofMime(picked.mimeType);
    setProofLabel(picked.fileName);
  }, [user?.id]);

  const onSubmit = async () => {
    setMessage(undefined);
    const validated = validatePayoutAccountForm({
      holderName,
      ibanInput,
      proofPath,
      proofMime,
    });
    if (!validated.ok) {
      setMessage(validated.error);
      return;
    }

    setSaving(true);
    const result = await submitPayoutAccount({
      country: validated.country,
      currency: APP_CONFIG.currency,
      iban: validated.iban,
      accountHolderName: validated.holderName,
      proofStoragePath: proofPath!,
      proofMimeType: proofMime!,
    });
    setSaving(false);

    if (result.error) {
      const code = result.error.split(':')[0]?.trim() ?? result.error;
      if (code === 'INVALID_IBAN') {
        setMessage('That IBAN is not valid. Check the number and try again.');
      } else if (code === 'PAYOUT_ACCOUNT_LOCKED') {
        setMessage('This payout account cannot be changed while under approval.');
      } else {
        setMessage(result.error);
      }
      return;
    }

    setIbanInput('');
    setProofPath(undefined);
    setProofMime(undefined);
    setProofLabel(undefined);
    await refresh();
    setMessage(
      'Your payout account has been submitted for BridgeHive review. Returning to Account Setup…',
    );
    if (returnToAccountSetup) {
      router.replace('/auth/worker/pending');
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  if (!loading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  if (!loading && accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }

  return (
    <AppScreen>
      <ScreenHeader
        title="Payout account"
        subtitle="Needed for account activation — separate from your credentials"
        showBack
        onBack={goBack}
      />

      <View style={styles.hero}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="card" size={18} color={colors.white} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Receive shift earnings</Text>
            <Text style={styles.heroBody}>
              Organizations pay approved shift earnings directly to your approved account.
              BridgeHive stores only a masked IBAN.
            </Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={13} color={tone.fg} />
            <Text style={[styles.statusText, { color: tone.fg }]}>{tone.label}</Text>
          </View>
          {account?.masked_iban ? (
            <Text style={styles.maskedIban}>{account.masked_iban}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        {(account?.account_holder_name || account?.created_at || account?.verified_at) && (
          <View style={styles.metaBlock}>
            {account?.account_holder_name ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Holder</Text>
                <Text style={styles.metaValue}>{account.account_holder_name}</Text>
              </View>
            ) : null}
            {account?.created_at ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Submitted</Text>
                <Text style={styles.metaValue}>
                  {new Date(account.created_at).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
            {account?.verified_at ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Approved</Text>
                <Text style={styles.metaValue}>
                  {new Date(account.verified_at).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {account?.rejection_reason ||
        account?.status === 'rejected' ||
        account?.status === 'failed' ? (
          <View style={styles.rejectBox}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <View style={styles.rejectCopy}>
              {account?.rejection_reason ? (
                <Text style={styles.reason}>{account.rejection_reason}</Text>
              ) : null}
              <Text style={styles.reasonFollowUp}>
                Update your details and submit again.
              </Text>
            </View>
          </View>
        ) : null}

        {canEdit ? (
          <View style={styles.hintBox}>
            <Ionicons name="document-attach-outline" size={16} color={colors.tealStrong} />
            <Text style={styles.hint}>
              Upload a bank certificate, account confirmation, or statement that clearly shows
              the account holder name and IBAN.
            </Text>
          </View>
        ) : null}

        {canEdit ? (
          <>
            <TextInput
              label="Account holder name"
              value={holderName}
              onChangeText={setHolderName}
              autoCapitalize="words"
            />
            <TextInput
              label="IBAN"
              value={ibanInput}
              onChangeText={setIbanInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Enter your IBAN"
              helpText="Use an account in your own name. We will review your account details before activation."
            />

            <View style={styles.proofBlock}>
              <Text style={styles.proofLabel}>Proof of bank account</Text>
              {proofLabel ? (
                <View style={styles.fileChip}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {proofLabel}
                  </Text>
                </View>
              ) : (
                <Text style={styles.proofHelp}>PDF, JPEG or PNG · up to 10 MB</Text>
              )}
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Upload PDF or image"
                  disabled={uploading}
                  onPress={() => void onPickProof('file')}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    pressed && styles.uploadBtnPressed,
                    uploading && styles.uploadBtnDisabled,
                  ]}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={colors.navy} />
                  <Text style={styles.uploadBtnText}>
                    {uploading ? 'Uploading…' : 'Upload file'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose from photo library"
                  disabled={uploading}
                  onPress={() => void onPickProof('image')}
                  style={({ pressed }) => [
                    styles.uploadBtnGhost,
                    pressed && styles.uploadBtnPressed,
                    uploading && styles.uploadBtnDisabled,
                  ]}
                >
                  <Ionicons name="images-outline" size={16} color={colors.tealStrong} />
                  <Text style={styles.uploadBtnGhostText}>Photo library</Text>
                </Pressable>
              </View>
            </View>

            {message ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {message}
              </Text>
            ) : null}

            <SubmitPayoutButton
              label={
                account?.status === 'rejected'
                  ? 'Resubmit payout'
                  : 'Submit payout'
              }
              loading={saving}
              onPress={() => void onSubmit()}
            />
          </>
        ) : (
          <View style={styles.lockBox}>
            <Ionicons
              name={account?.status === 'verified' ? 'lock-closed' : 'time'}
              size={16}
              color={account?.status === 'verified' ? colors.success : colors.tealStrong}
            />
            <Text style={styles.lockText}>
              {account?.status === 'pending'
                ? 'Your payout account has been submitted for BridgeHive review. You can safely sign out and return later to check your status.'
                : account?.status === 'suspended'
                  ? 'This payout account is suspended. Contact BridgeHive support for help.'
                  : 'Your payout account is approved for platform use.'}
              {account?.status === 'verified' && isVerified
                ? ' Earnings history is available under Money.'
                : ''}
            </Text>
          </View>
        )}
        {message && !canEdit ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    ...shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.white,
  },
  heroBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.86)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
  },
  maskedIban: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.16)',
    ...shadows.sm,
  },
  metaBlock: {
    gap: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubdued,
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  metaValue: {
    flexShrink: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
    textAlign: 'right',
  },
  rejectBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.errorLight,
  },
  rejectCopy: {
    flex: 1,
    gap: 4,
  },
  reason: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  reasonFollowUp: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.22)',
  },
  hint: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.navy,
    lineHeight: 18,
  },
  proofBlock: {
    gap: 10,
  },
  proofLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  proofHelp: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E8F7EE',
  },
  fileName: {
    maxWidth: 240,
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: '#146C43',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  uploadBtn: {
    flexGrow: 1,
    minHeight: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadBtnGhost: {
    flexGrow: 1,
    minHeight: 44,
    borderRadius: radii.full,
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadBtnPressed: {
    opacity: 0.88,
  },
  uploadBtnDisabled: {
    opacity: 0.55,
  },
  uploadBtnText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  uploadBtnGhostText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.tealStrong,
  },
  lockBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.tealSoft,
  },
  lockText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navy,
  },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.error,
  },
  submitWrap: {
    alignSelf: 'center',
    marginTop: 4,
    ...shadows.md,
    borderRadius: radii.full,
  },
  submitBtn: {
    minHeight: 40,
    borderRadius: radii.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  submitSheen: {
    position: 'absolute',
    top: -10,
    left: 0,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  submitLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: colors.white,
  },
  submitDisabled: {
    opacity: 0.6,
  },
});
