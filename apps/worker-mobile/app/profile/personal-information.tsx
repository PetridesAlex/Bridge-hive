import {
  billingStandingLabel,
  profileInitials,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import {
  getAvatarSignedUrl,
  pickAvatarFromCamera,
  pickAvatarFromLibrary,
  removeWorkerAvatar,
  uploadWorkerAvatar,
} from '@/lib/avatar';
import { updateProfile } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';

function verificationLabel(status?: string | null) {
  if (!status) return 'Not started';
  const map: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under review',
    verified: 'Verified',
    rejected: 'Action required',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export default function PersonalInformationScreen() {
  const { user, profile, workerProfile, isVerified, refreshProfile } = useAuth();
  const { summary: billing } = useBillingRestriction(Boolean(user?.id));

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.full_name, profile?.phone]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        if (!user?.id) return;
        const url = await getAvatarSignedUrl(profile?.avatar_path, user.id);
        if (active) setAvatarUrl(url);
      };
      void load();
      return () => {
        active = false;
      };
    }, [user?.id, profile?.avatar_path]),
  );

  const dirty = useMemo(() => {
    const nameChanged = fullName.trim() !== (profile?.full_name ?? '').trim();
    const phoneChanged = phone.trim() !== (profile?.phone ?? '').trim();
    return nameChanged || phoneChanged;
  }, [fullName, phone, profile?.full_name, profile?.phone]);

  const initials = profileInitials(profile?.full_name);
  const roleLabel = workerProfile?.worker_role
    ? WORKER_ROLE_LABELS[workerProfile.worker_role]
    : 'Worker';

  const onSave = async () => {
    if (!user?.id || !dirty) return;
    setSaving(true);
    setSavedFlash(false);
    const patch: { full_name?: string; phone?: string } = {
      phone: phone.trim(),
    };
    if (!isVerified) {
      patch.full_name = fullName.trim();
    }
    const result = await updateProfile(user.id, patch);
    setSaving(false);
    if (result.error) {
      Alert.alert('Could not save', result.error);
      return;
    }
    await refreshProfile();
    setSavedFlash(true);
  };

  const applyPickedUri = async (uri: string) => {
    if (!user?.id) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await uploadWorkerAvatar({
      userId: user.id,
      uri,
      previousPath: profile?.avatar_path,
    });
    setAvatarBusy(false);
    if (result.error) {
      setAvatarError(result.error);
      return;
    }
    await refreshProfile();
    const url = await getAvatarSignedUrl(result.path ?? null, user.id);
    setAvatarUrl(url);
  };

  const onPickLibrary = async () => {
    setSheetOpen(false);
    const picked = await pickAvatarFromLibrary();
    if (!picked.ok) {
      if (picked.cancelled) return;
      setAvatarError(picked.error);
      return;
    }
    await applyPickedUri(picked.uri);
  };

  const onPickCamera = async () => {
    setSheetOpen(false);
    const picked = await pickAvatarFromCamera();
    if (!picked.ok) {
      if (picked.cancelled) return;
      setAvatarError(picked.error);
      return;
    }
    await applyPickedUri(picked.uri);
  };

  const onRemovePhoto = async () => {
    if (!user?.id) return;
    setSheetOpen(false);
    setAvatarBusy(true);
    setAvatarError(null);
    const result = await removeWorkerAvatar({
      userId: user.id,
      path: profile?.avatar_path,
    });
    setAvatarBusy(false);
    if (result.error) {
      setAvatarError(result.error);
      return;
    }
    setAvatarUrl(null);
    await refreshProfile();
  };

  const openPhotoActions = () => {
    if (Platform.OS === 'web') {
      setSheetOpen(true);
      return;
    }
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [
      { text: 'Choose from library', onPress: () => void onPickLibrary() },
      { text: 'Take photo', onPress: () => void onPickCamera() },
    ];
    if (profile?.avatar_path) {
      buttons.push({
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => void onRemovePhoto(),
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile photo', 'Optional personalization — not used for identity verification.', buttons);
  };

  return (
    <AppScreen contentKind="detail">
      <ScreenHeader
        title="Personal information"
        showBack
        titleSize="detail"
        subtitle="Update your contact details and optional profile photo."
      />

      <View style={styles.photoCard}>
        <Text style={styles.sectionTitle}>Profile photo</Text>
        <Text style={styles.photoHint}>
          Optional personalization only. This photo is not used for identity verification or
          credential review.
        </Text>
        <View style={styles.photoRow}>
          <View style={styles.photoPreview}>
            {avatarBusy ? (
              <View style={styles.photoBusy}>
                <ActivityIndicator color={colors.navy} />
              </View>
            ) : (
              <Avatar
                initials={initials}
                size={88}
                imageUri={avatarUrl}
                backgroundColor={colors.tealSoft}
                textColor={colors.tealStrong}
              />
            )}
          </View>
          <View style={styles.photoActions}>
            <Button
              label={profile?.avatar_path ? 'Change photo' : 'Add photo'}
              variant="secondary"
              size="sm"
              fullWidth
              onPress={openPhotoActions}
              disabled={avatarBusy}
            />
            {profile?.avatar_path ? (
              <Button
                label="Remove"
                variant="ghost"
                size="sm"
                fullWidth
                onPress={() => void onRemovePhoto()}
                disabled={avatarBusy}
              />
            ) : null}
          </View>
        </View>
        {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        {isVerified ? (
          <>
            <Text style={styles.lockedLabel}>Full name</Text>
            <Text style={styles.lockedValue}>{profile?.full_name ?? '—'}</Text>
            <Text style={styles.lockedHint}>
              Your verified name is locked. Contact Support if a correction is required.
            </Text>
            <Button
              label="Contact Support"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/support')}
            />
          </>
        ) : (
          <TextInput label="Full name" value={fullName} onChangeText={setFullName} />
        )}

        <Text style={styles.lockedLabel}>Email</Text>
        <Text style={styles.lockedValue}>{user?.email ?? '—'}</Text>
        <Text style={styles.lockedHint}>Email is managed by authentication and cannot be edited here.</Text>

        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.lockedLabel}>Role</Text>
        <Text style={styles.lockedValue}>{roleLabel}</Text>

        <Text style={styles.lockedLabel}>Verification</Text>
        <Text style={styles.lockedValue}>
          {verificationLabel(workerProfile?.verification_status)}
        </Text>

        <Text style={styles.lockedLabel}>Billing standing</Text>
        <Text style={styles.lockedValue}>{billingStandingLabel(billing?.standing)}</Text>

        <Button
          label={savedFlash && !dirty ? 'Saved' : 'Save changes'}
          variant="primary"
          loading={saving}
          disabled={!dirty || saving}
          onPress={() => void onSave()}
        />
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Profile photo</Text>
            <Pressable style={styles.sheetRow} onPress={() => void onPickLibrary()}>
              <Ionicons name="images-outline" size={20} color={colors.navy} />
              <Text style={styles.sheetRowLabel}>Choose from library</Text>
            </Pressable>
            {Platform.OS !== 'web' ? (
              <Pressable style={styles.sheetRow} onPress={() => void onPickCamera()}>
                <Ionicons name="camera-outline" size={20} color={colors.navy} />
                <Text style={styles.sheetRowLabel}>Take photo</Text>
              </Pressable>
            ) : null}
            {profile?.avatar_path ? (
              <Pressable style={styles.sheetRow} onPress={() => void onRemovePhoto()}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.sheetRowLabel, { color: colors.error }]}>Remove photo</Text>
              </Pressable>
            ) : null}
            <Button label="Cancel" variant="ghost" onPress={() => setSheetOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  photoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  photoHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  photoPreview: {
    width: 88,
    height: 88,
  },
  photoBusy: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flex: 1,
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  lockedLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  lockedValue: {
    fontFamily: typography.fonts.regular,
    fontSize: 16,
    color: colors.text,
    marginTop: -spacing.sm,
  },
  lockedHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: 16,
    color: colors.navy,
  },
});
