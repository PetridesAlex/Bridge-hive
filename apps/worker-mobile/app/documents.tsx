import {
  canWorkerEditCredentialFile,
  credentialTypeLabel,
} from '@bridge-hive/domain';
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
import { colors, spacing, typography } from '@/constants/theme';
import { useCredentials } from '@/hooks/useCredentials';
import {
  buildCredentialChecklist,
  deletePendingCredentialFile,
  pickCredentialFile,
  pickCredentialImage,
  submitCredentialForReview,
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

export default function DocumentsScreen() {
  const { user, workerProfile } = useAuth();
  const { credentials, loading, error, refresh } = useCredentials(user?.id);
  const [uploadState, setUploadState] = useState<UploadState>({
    type: null,
    uploading: false,
    error: null,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const handlePick = useCallback(
    async (row: ChecklistRow, mode: 'document' | 'image') => {
      setUploadState({ type: row.credentialType, uploading: false, error: null });
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
    [refresh],
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
            <Text style={styles.introTitle}>Document checklist</Text>
            <Text style={styles.hint}>
              Upload PDF, JPEG, or PNG files up to 10 MB. Identity card front and
              back are separate. Tax and social-insurance requirements are proof
              documents only — do not type raw numbers here.
            </Text>
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

            return (
              <View key={row.credentialType} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.title}>{row.displayName}</Text>
                    <Text style={styles.meta}>
                      {row.isRequired ? 'Required' : 'Optional'} ·{' '}
                      {statusLabel(row.itemStatus)}
                    </Text>
                    {row.fileName ? (
                      <Text style={styles.fileName} numberOfLines={1}>
                        {row.fileName}
                      </Text>
                    ) : null}
                    {row.credential?.rejection_reason ? (
                      <Text style={styles.reject}>
                        {row.credential.rejection_reason}
                      </Text>
                    ) : null}
                    {uploadState.type === row.credentialType && uploadState.error ? (
                      <Text style={styles.reject}>{uploadState.error}</Text>
                    ) : null}
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{statusLabel(row.itemStatus)}</Text>
                  </View>
                </View>

                {isUploading ? (
                  <View style={styles.rowActions}>
                    <ActivityIndicator color={colors.navy} />
                    <Text style={styles.meta}>Uploading…</Text>
                  </View>
                ) : editable ? (
                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() => void handlePick(row, 'image')}
                      disabled={uploadState.uploading || rowBusy}
                    >
                      <Text style={styles.secondaryBtnText}>
                        {row.fileName ? 'Replace photo' : 'Upload photo'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() => void handlePick(row, 'document')}
                      disabled={uploadState.uploading || rowBusy}
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
                  <Text style={styles.meta}>
                    This document is locked while under review or after verification.
                  </Text>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  intro: {
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  introTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  fileName: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reject: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.error,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.blueLight,
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  secondaryBtnText: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.navy,
  },
  primaryBtnText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: '#fff',
  },
  dangerBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fee2e2',
  },
  dangerBtnText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.error,
  },
});
