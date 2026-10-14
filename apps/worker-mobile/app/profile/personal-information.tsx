import {
  billingStandingLabel,
  profileInitials,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppScreen } from '@/components/ui/AppScreen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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

function statusTone(status?: string | null): 'success' | 'info' | 'danger' | 'neutral' {
  if (status === 'verified' || status === 'good_standing') return 'success';
  if (status === 'submitted' || status === 'under_review') return 'info';
  if (status === 'rejected' || status === 'restricted') return 'danger';
  return 'neutral';
}

function DetailField({
  icon,
  label,
  value,
  hint,
  locked,
  tone = 'neutral',
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  locked?: boolean;
  tone?: 'success' | 'info' | 'danger' | 'neutral';
  index: number;
}) {
  const reduced = useReducedMotion();
  const rise = useSharedValue(reduced ? 0 : 10);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    const delay = reduced ? 0 : index * 50;
    rise.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 220 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: reduced ? 0 : 240 }));
  }, [index, opacity, reduced, rise]);

  const motion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }],
  }));

  const toneColor =
    tone === 'success' ? colors.success : tone === 'info' ? colors.info : tone === 'danger' ? colors.error : colors.navy;

  return (
    <Animated.View style={[styles.field, motion]}>
      <LinearGradient
        colors={locked ? [colors.navy, colors.navyLift] : [colors.tealStrong, '#0A6C78']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fieldMark}
      >
        <Ionicons name={icon} size={15} color={colors.white} />
      </LinearGradient>
      <View style={styles.fieldCopy}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {locked ? (
            <View style={styles.lockChip}>
              <Ionicons name="lock-closed" size={11} color={colors.navy} />
              <Text style={styles.lockText}>Locked</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.fieldValue, tone !== 'neutral' && { color: toneColor }]}>{value}</Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      </View>
    </Animated.View>
  );
}

function SupportLink() {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const nudge = useSharedValue(0);
  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Contact Support"
        onPress={() => router.push('/support')}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(5, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={styles.supportLink}
      >
        <LinearGradient
          pointerEvents="none"
          colors={hovered ? ['#F4F9FD', '#E7F3FB'] : ['#FFFFFF', '#F3F7FB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.tealStrong} />
        <Text style={styles.supportLinkLabel}>Contact Support</Text>
        <Animated.View style={iconStyle}>
          <Ionicons name="arrow-forward" size={16} color={colors.navy} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
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
        <Text style={styles.photoTitle}>Profile photo</Text>
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
        <View style={styles.cardHead}>
          <LinearGradient
            colors={[colors.navy, colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardMark}
          >
            <Ionicons name="id-card" size={16} color={colors.yellow} />
          </LinearGradient>
          <View style={styles.cardHeadCopy}>
            <Text style={styles.sectionKicker}>Account</Text>
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
        </View>

        {isVerified ? (
          <DetailField
            index={0}
            icon="person"
            label="Full name"
            value={profile?.full_name?.trim() || '—'}
            hint="Your verified name is locked. Contact Support if a correction is required."
            locked
          />
        ) : (
          <TextInput label="Full name" value={fullName} onChangeText={setFullName} />
        )}
        {isVerified ? <SupportLink /> : null}

        <DetailField
          index={1}
          icon="mail"
          label="Email"
          value={(user?.email ?? '—').replace('@', '\u200b@')}
          hint="Email is managed by authentication and cannot be edited here."
          locked
        />

        <View style={styles.phoneBlock}>
          <View style={styles.phoneHead}>
            <Ionicons name="call-outline" size={14} color={colors.tealStrong} />
            <Text style={styles.phoneKicker}>Editable</Text>
          </View>
          <TextInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <DetailField index={2} icon="briefcase-outline" label="Role" value={roleLabel} />
        <DetailField
          index={3}
          icon="shield-checkmark"
          label="Verification"
          value={verificationLabel(workerProfile?.verification_status)}
          tone={statusTone(workerProfile?.verification_status)}
        />
        <DetailField
          index={4}
          icon="card-outline"
          label="Billing standing"
          value={billingStandingLabel(billing?.standing)}
          tone={statusTone(billing?.standing)}
        />

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
  photoTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navy,
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
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#D5E2EE',
    ...shadows.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadCopy: {
    flex: 1,
    gap: 1,
  },
  sectionKicker: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  sectionTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    color: colors.navy,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: '#F7FBFE',
    borderWidth: 1,
    borderColor: '#E3EEF6',
  },
  fieldMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fieldCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  fieldValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
  },
  fieldHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D5E2EE',
  },
  lockText: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: colors.navy,
  },
  supportLink: {
    minHeight: 46,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D5E2EE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  supportLinkLabel: {
    flex: 1,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    color: colors.navy,
  },
  phoneBlock: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#D7EBE8',
    backgroundColor: '#F4FBFA',
  },
  phoneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneKicker: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
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
