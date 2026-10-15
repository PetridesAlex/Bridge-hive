import {
  canWorkerEditCredentialFile,
  credentialRequiresKnownExpiry,
  credentialTypeLabel,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useCredentials } from '@/hooks/useCredentials';
import {
  buildCredentialChecklist,
  deletePendingCredentialFile,
  pickCredentialFile,
  pickCredentialImage,
  submitCredentialForReview,
  resolveCredentialExpiresAt,
  uploadCredentialDocument,
  type ChecklistRow,
} from '@/lib/credentials';
import { useAuth } from '@/providers/AuthProvider';

type UploadState = {
  type: string | null;
  uploading: boolean;
  error: string | null;
};

function statusLabel(status: ChecklistRow['itemStatus']): string {
  switch (status) {
    case 'not_uploaded':
      return 'Not uploaded';
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under review';
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    case 'suspended':
      return 'Suspended';
    default:
      return status;
  }
}

function statusTone(status: ChecklistRow['itemStatus']): {
  fg: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string, ...string[]];
} {
  switch (status) {
    case 'verified':
      return {
        fg: colors.tealStrong,
        bg: colors.tealSoft,
        icon: 'shield-checkmark',
        gradient: [colors.tealStrong, '#0A6C78'],
      };
    case 'submitted':
    case 'under_review':
      return {
        fg: '#8A6410',
        bg: colors.yellowLight,
        icon: 'time',
        gradient: [colors.navy, '#0C3E56', colors.tealStrong],
      };
    case 'rejected':
    case 'expired':
    case 'suspended':
      return {
        fg: colors.error,
        bg: colors.errorLight,
        icon: 'alert-circle',
        gradient: ['#8E1B14', '#B42318', '#D1432F'],
      };
    default:
      return {
        fg: colors.textSecondary,
        bg: 'rgba(11, 42, 67, 0.06)',
        icon: 'cloud-upload-outline',
        gradient: [colors.navy, '#0C3E56', colors.tealStrong],
      };
  }
}

export default function DocumentsScreen() {
  const { user, workerProfile } = useAuth();
  const { credentials, loading, error, refresh } = useCredentials(user?.id);
  const [uploadState, setUploadState] = useState<UploadState>({
    type: null,
    uploading: false,
    error: null,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [practisingLicenceExpiryYmd, setPractisingLicenceExpiryYmd] =
    useState('');

  const checklist = useMemo(
    () =>
      buildCredentialChecklist({
        role: workerProfile?.worker_role,
        credentials,
      }),
    [workerProfile?.worker_role, credentials],
  );

  const readyToSubmit = checklist.filter(
    (row) =>
      row.isRequired &&
      row.credential?.status === 'pending' &&
      row.itemStatus === 'draft',
  );
  const requiredRows = checklist.filter((row) => row.isRequired);
  const verifiedRequired = requiredRows.filter((row) => row.itemStatus === 'verified').length;
  const progress =
    requiredRows.length === 0 ? 0 : verifiedRequired / requiredRows.length;

  const handlePick = useCallback(
    async (row: ChecklistRow, mode: 'document' | 'image') => {
      setUploadState({ type: row.credentialType, uploading: false, error: null });

      const expiryYmd = credentialRequiresKnownExpiry(row.credentialType)
        ? practisingLicenceExpiryYmd
        : undefined;
      const expiryCheck = resolveCredentialExpiresAt({
        credentialType: row.credentialType,
        expiresAtYmd: expiryYmd,
      });
      if ('error' in expiryCheck) {
        setUploadState({
          type: row.credentialType,
          uploading: false,
          error: expiryCheck.error,
        });
        return;
      }

      const picked =
        mode === 'image' ? await pickCredentialImage() : await pickCredentialFile();
      if (!picked.ok) {
        if (!picked.cancelled) {
          setUploadState({
            type: row.credentialType,
            uploading: false,
            error: picked.error,
          });
        }
        return;
      }

      setUploadState({ type: row.credentialType, uploading: true, error: null });
      const result = await uploadCredentialDocument({
        credentialType: row.credentialType,
        uri: picked.uri,
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
        fileName: picked.fileName,
        existingCredential: row.credential,
        expiresAtYmd: expiryYmd,
      });

      if (result.error) {
        setUploadState({
          type: row.credentialType,
          uploading: false,
          error: result.error,
        });
        return;
      }

      setUploadState({ type: null, uploading: false, error: null });
      await refresh();
    },
    [practisingLicenceExpiryYmd, refresh],
  );

  const handleDelete = useCallback(
    async (row: ChecklistRow) => {
      if (!row.credential) return;
      setBusyId(row.credential.id);
      const result = await deletePendingCredentialFile({
        credential: row.credential,
      });
      setBusyId(null);
      if (result.error) {
        Alert.alert('Could not delete', result.error);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const handleSubmit = useCallback(
    async (row: ChecklistRow) => {
      if (!row.credential) return;
      setBusyId(row.credential.id);
      const result = await submitCredentialForReview(row.credential.id);
      setBusyId(null);
      if (result.error) {
        Alert.alert('Submit failed', result.error);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const handleSubmitAllReady = useCallback(async () => {
    for (const row of readyToSubmit) {
      if (!row.credential) continue;
      setBusyId(row.credential.id);
      const result = await submitCredentialForReview(row.credential.id);
      if (result.error) {
        setBusyId(null);
        Alert.alert('Submit failed', result.error);
        await refresh();
        return;
      }
    }
    setBusyId(null);
    await refresh();
  }, [readyToSubmit, refresh]);

  if (!workerProfile?.worker_role) {
    return (
      <AppScreen scroll={false} edges={['top']}>
        <ScreenHeader title="Credentials" showBack />
        <EmptyState
          title="Choose a worker role first"
          description="Complete onboarding so we can show the correct document checklist."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        title="Credentials"
        showBack
        subtitle="Private documents for verification"
      />

      {loading && credentials.length === 0 ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      ) : error && credentials.length === 0 ? (
        <EmptyState
          title="Could not load credentials"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
        >
          <View style={styles.intro}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.96)', 'rgba(243,250,252,0.92)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.introTop}>
              <LinearGradient
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.introIcon}
              >
                <Ionicons name="documents" size={18} color={colors.white} />
              </LinearGradient>
              <View style={styles.introCopy}>
                <Text style={styles.introTitle}>Document checklist</Text>
                <Text style={styles.hint}>
                  Upload PDF, JPEG, or PNG files up to 10 MB. Identity card front and back are
                  separate. Tax and social-insurance requirements are proof documents only — do not
                  type raw numbers here.
                </Text>
              </View>
            </View>
            <View style={styles.progressBlock}>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>
                  {verifiedRequired} of {requiredRows.length} required verified
                </Text>
                <Text style={styles.progressValue}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
            </View>
            {readyToSubmit.length > 0 ? (
              <Button
                label={`Submit ${readyToSubmit.length} ready document${readyToSubmit.length === 1 ? '' : 's'}`}
                onPress={() => void handleSubmitAllReady()}
                disabled={busyId != null || uploadState.uploading}
              />
            ) : null}
          </View>

          {checklist.map((row) => {
            const editable = canWorkerEditCredentialFile(row.credential?.status);
            const isUploading =
              uploadState.uploading && uploadState.type === row.credentialType;
            const rowBusy = busyId === row.credential?.id;
            const requiresExpiry = credentialRequiresKnownExpiry(
              row.credentialType,
            );
            const expiryGate = requiresExpiry
              ? resolveCredentialExpiresAt({
                  credentialType: row.credentialType,
                  expiresAtYmd: practisingLicenceExpiryYmd,
                })
              : null;
            const expiryReady = !expiryGate || !('error' in expiryGate);
            // Only block while an upload/submit is in flight. Expiry is validated in
            // handlePick so an empty date shows an error instead of a dead control.
            const uploadDisabled = uploadState.uploading || rowBusy;

            const tone = statusTone(row.itemStatus);

            return (
              <View key={row.credentialType} style={styles.card}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.96)', 'rgba(248,251,253,0.92)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={tone.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.docIcon}
                  >
                    <Ionicons name={tone.icon} size={18} color={colors.white} />
                  </LinearGradient>
                  <View style={styles.cardCopy}>
                    <Text style={styles.title}>{row.displayName}</Text>
                    <View style={styles.pillRow}>
                      <View style={styles.requirementPill}>
                        <Text style={styles.requirementText}>
                          {row.isRequired ? 'Required' : 'Optional'}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.statusText, { color: tone.fg }]}>
                          {statusLabel(row.itemStatus)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {row.fileName ? (
                  <View style={styles.fileChip}>
                    <Ionicons name="document-attach-outline" size={14} color={colors.navy} />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {row.fileName}
                    </Text>
                  </View>
                ) : null}
                {row.credential?.rejection_reason ? (
                  <Text style={styles.reject}>{row.credential.rejection_reason}</Text>
                ) : null}
                {uploadState.type === row.credentialType && uploadState.error ? (
                  <Text style={styles.reject} accessibilityLiveRegion="polite">
                    {uploadState.error}
                  </Text>
                ) : null}

                {isUploading ? (
                  <View style={styles.rowActions}>
                    <ActivityIndicator color={colors.navy} />
                    <Text style={styles.meta}>Uploading…</Text>
                  </View>
                ) : editable ? (
                  <View style={styles.rowActions}>
                    {requiresExpiry ? (
                      <TextInput
                        label="Licence expiry date"
                        value={practisingLicenceExpiryYmd}
                        onChangeText={setPractisingLicenceExpiryYmd}
                        placeholder="YYYY-MM-DD"
                        autoCapitalize="none"
                        keyboardType="numbers-and-punctuation"
                        containerStyle={styles.expiryField}
                        helpText="Required before upload. Valid through the end of that Cyprus business day (Europe/Nicosia)."
                      />
                    ) : null}
                    {requiresExpiry && expiryGate && 'error' in expiryGate ? (
                      <Text style={styles.expiryGateHint} accessibilityLiveRegion="polite">
                        {expiryGate.error}
                      </Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        row.fileName ? 'Replace photo' : 'Upload photo'
                      }
                      accessibilityHint={
                        requiresExpiry && !expiryReady
                          ? 'Enter the licence expiry date first'
                          : undefined
                      }
                      style={[
                        styles.secondaryBtn,
                        uploadDisabled && styles.btnDisabled,
                      ]}
                      onPress={() => void handlePick(row, 'image')}
                      disabled={uploadDisabled}
                    >
                      <Text style={styles.secondaryBtnText}>
                        {row.fileName ? 'Replace photo' : 'Upload photo'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={row.fileName ? 'Replace PDF' : 'Upload PDF'}
                      accessibilityHint={
                        requiresExpiry && !expiryReady
                          ? 'Enter the licence expiry date first'
                          : undefined
                      }
                      style={[
                        styles.secondaryBtn,
                        uploadDisabled && styles.btnDisabled,
                      ]}
                      onPress={() => void handlePick(row, 'document')}
                      disabled={uploadDisabled}
                    >
                      <Text style={styles.secondaryBtnText}>
                        {row.fileName ? 'Replace PDF' : 'Upload PDF'}
                      </Text>
                    </Pressable>
                    {row.credential?.status === 'pending' && row.fileName ? (
                      <>
                        <Pressable
                          style={styles.primaryBtn}
                          onPress={() => void handleSubmit(row)}
                          disabled={rowBusy}
                        >
                          <Text style={styles.primaryBtnText}>
                            {rowBusy ? 'Submitting…' : 'Submit'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.dangerBtn}
                          onPress={() => void handleDelete(row)}
                          disabled={rowBusy}
                        >
                          <Text style={styles.dangerBtnText}>Delete</Text>
                        </Pressable>
                      </>
                    ) : null}
                    {row.credential?.status === 'rejected' ? (
                      <Text style={styles.meta}>
                        Upload a new file to resubmit {credentialTypeLabel(row.credentialType)}.
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.lockRow}>
                    <Ionicons name="lock-closed" size={14} color={colors.tealStrong} />
                    <Text style={styles.lockText}>
                      This document is locked while under review or after verification.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  intro: {
    gap: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  introTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  introIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  introTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  progressBlock: {
    gap: 8,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  progressValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 12,
    color: colors.tealStrong,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.tealStrong,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  docIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requirementPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
  requirementText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
  },
  fileName: {
    flexShrink: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.tealSoft,
  },
  lockText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.tealStrong,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  reject: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.error,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  expiryField: {
    width: '100%',
    flexGrow: 1,
    flexBasis: '100%',
    minWidth: 0,
  },
  secondaryBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  expiryGateHint: {
    width: '100%',
    flexBasis: '100%',
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.error,
    lineHeight: 17,
  },
  secondaryBtnText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  primaryBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.navy,
  },
  primaryBtnText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: '#fff',
  },
  dangerBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.errorLight,
  },
  dangerBtnText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.error,
  },
});
