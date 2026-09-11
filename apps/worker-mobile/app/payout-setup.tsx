import {
  isLikelyValidIbanFormat,
  normalizeIbanInput,
  payoutSummaryLabel,
} from '@bridge-hive/domain';
import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { usePayouts } from '@/hooks/usePayouts';
import {
  pickPayoutProofFile,
  pickPayoutProofImage,
  uploadPayoutProof,
} from '@/lib/payout';
import { submitPayoutAccount } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';

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
  const canEdit =
    !account || account.status === 'rejected' || account.status === 'failed';

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
    const holder = holderName.trim();
    if (holder.length < 2) {
      setMessage('Enter the account holder name.');
      return;
    }
    const iban = normalizeIbanInput(ibanInput);
    if (!isLikelyValidIbanFormat(iban)) {
      setMessage('Enter a valid IBAN.');
      return;
    }
    if (!proofPath || !proofMime) {
      setMessage('Upload proof of bank account before submitting.');
      return;
    }

    setSaving(true);
    const result = await submitPayoutAccount({
      country: APP_CONFIG.countryCode,
      currency: APP_CONFIG.currency,
      iban,
      accountHolderName: holder,
      proofStoragePath: proofPath,
      proofMimeType: proofMime,
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
      'Payout account submitted for administrative approval. Returning to Account Setup…',
    );
    if (returnToAccountSetup) {
      router.replace('/auth/worker/pending');
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }

  if (!loading && accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }

  return (
    <AppScreen>
      <ScreenHeader
        title="Payout account"
        subtitle="Required for marketplace approval — separate from credentials"
        showBack
        onBack={goBack}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Current status</Text>
        <Text style={styles.value}>
          {payoutSummaryLabel(account?.status ?? null)}
          {account?.masked_iban ? ` · ${account.masked_iban}` : ''}
        </Text>
        {account?.account_holder_name ? (
          <Text style={styles.meta}>Holder: {account.account_holder_name}</Text>
        ) : null}
        {account?.created_at ? (
          <Text style={styles.meta}>
            Submitted: {new Date(account.created_at).toLocaleString()}
          </Text>
        ) : null}
        {account?.verified_at ? (
          <Text style={styles.meta}>
            Approved: {new Date(account.verified_at).toLocaleString()}
          </Text>
        ) : null}
        {account?.rejection_reason ? (
          <Text style={styles.reason}>{account.rejection_reason}</Text>
        ) : null}
        <Text style={styles.hint}>
          Proof of bank account: upload a bank certificate, account confirmation, or
          statement showing the account holder’s name and IBAN. The document is private
          and not publicly accessible. Only a masked IBAN is stored.
        </Text>
        <Text style={styles.hintEl}>
          Αποδεικτικό τραπεζικού λογαριασμού: ανεβάστε βεβαίωση τράπεζας ή έγγραφο
          λογαριασμού που εμφανίζει το όνομα δικαιούχου και το IBAN.
        </Text>

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
            />
            <Text style={styles.proofLabel}>
              Proof of bank account {proofLabel ? `· ${proofLabel}` : ''}
            </Text>
            <View style={styles.row}>
              <Button
                label="Upload PDF/image"
                variant="secondary"
                loading={uploading}
                onPress={() => void onPickProof('file')}
              />
              <Button
                label="Photo library"
                variant="ghost"
                loading={uploading}
                onPress={() => void onPickProof('image')}
              />
            </View>
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <Button
              label={
                account?.status === 'rejected'
                  ? 'Resubmit payout account'
                  : 'Submit payout account'
              }
              variant="brand"
              loading={saving}
              onPress={() => void onSubmit()}
            />
          </>
        ) : (
          <Text style={styles.hint}>
            {account?.status === 'pending'
              ? 'Submitted and waiting for administrative approval. You can correct details only if this submission is rejected.'
              : 'This payout account is locked while approved for platform use.'}
            {isVerified
              ? ' Payment history is available under Payments on your Profile.'
              : ''}
          </Text>
        )}
        {message && !canEdit ? <Text style={styles.error}>{message}</Text> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  value: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.navyLift,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  reason: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  hintEl: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  proofLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  row: { gap: spacing.xs },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.error,
  },
});
