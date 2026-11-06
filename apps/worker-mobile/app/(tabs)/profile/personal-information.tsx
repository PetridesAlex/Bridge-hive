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
        onPress={() => router.push('/profile/support')}
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
    <AppScreen contentKind="detail" clearTabBar>
      <ScreenHeader
        title="Personal information"
        showBack
        titleSize="detail"
        subtitle="Update your contact details and optional profile photo."
      />

      <View style={styles.photoCard}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(11, 42, 67, 0.05)',
            'rgba(20, 169, 181, 0.10)',
            'rgba(224, 170, 24, 0.12)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.photoHead}>
          <LinearGradient
            colors={[colors.navy, colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.photoMark}
          >
            <Ionicons name="camera" size={15} color={colors.yellow} />
          </LinearGradient>
          <View style={styles.photoHeadCopy}>
            <Text style={styles.photoKicker}>Personalization</Text>
            <Text style={styles.photoTitle}>Profile photo</Text>
          </View>
          <View style={styles.optionalChip}>
            <Text style={styles.optionalChipText}>Optional</Text>
          </View>
        </View>

        <Text style={styles.photoHint}>
          For your worker profile only — not used for identity verification or credential review.
        </Text>

        <View style={styles.photoRow}>
          <View style={styles.photoPreview}>
            <LinearGradient
              colors={[colors.yellow, colors.honeyStrong, colors.tealStrong]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.photoRing}
            >
              <View style={styles.photoRingInner}>
                {avatarBusy ? (
                  <View style={styles.photoBusy}>
                    <ActivityIndicator color={colors.navy} />
                  </View>
                ) : (
                  <Avatar
                    initials={initials}
                    size={84}
                    imageUri={avatarUrl}
                    backgroundColor={colors.tealSoft}
                    textColor={colors.tealStrong}
                  />
                )}
              </View>
            </LinearGradient>
            {!avatarBusy ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={profile?.avatar_path ? 'Change photo' : 'Add photo'}
                onPress={openPhotoActions}
                disabled={avatarBusy}
                style={({ pressed }) => [
                  styles.photoFab,
                  pressed && styles.photoFabPressed,
                ]}
              >
                <LinearGradient
                  colors={[colors.navy, '#123A5C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.photoFabFill}
                >
                  <Ionicons
                    name={profile?.avatar_path ? 'create' : 'add'}
                    size={16}
                    color={colors.yellow}
                  />
                </LinearGradient>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.photoActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={profile?.avatar_path ? 'Change photo' : 'Add photo'}
              onPress={openPhotoActions}
              disabled={avatarBusy}
              style={({ pressed }) => [
                styles.photoPrimaryBtn,
                pressed && styles.photoBtnPressed,
                avatarBusy && styles.photoBtnDisabled,
              ]}
            >
              <LinearGradient
                colors={['#2A6BD6', colors.navy]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoPrimaryFill}
              >
                <Ionicons
                  name={profile?.avatar_path ? 'images' : 'cloud-upload'}
                  size={16}
                  color={colors.white}
                />
                <Text style={styles.photoPrimaryLabel}>
                  {profile?.avatar_path ? 'Change photo' : 'Add photo'}
                </Text>
              </LinearGradient>
            </Pressable>

            {profile?.avatar_path ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                onPress={() => void onRemovePhoto()}
                disabled={avatarBusy}
                style={({ pressed }) => [
                  styles.photoRemoveBtn,
                  pressed && styles.photoBtnPressed,
                  avatarBusy && styles.photoBtnDisabled,
                ]}
              >
                <Ionicons name="trash-outline" size={15} color={colors.error} />
                <Text style={styles.photoRemoveLabel}>Remove</Text>
              </Pressable>
            ) : (
              <View style={styles.photoSafeNote}>
                <Ionicons name="shield-checkmark" size={14} color={colors.tealStrong} />
                <Text style={styles.photoSafeNoteText}>Stays on your profile only</Text>
              </View>
            )}
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
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profile photo</Text>
            <Text style={styles.sheetSubtitle}>
              Optional personalization — not used for verification.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.sheetRow, pressed && styles.photoBtnPressed]}
              onPress={() => void onPickLibrary()}
            >
              <LinearGradient
                colors={[colors.tealStrong, '#0E7A8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sheetRowIcon}
              >
                <Ionicons name="images" size={18} color={colors.white} />
              </LinearGradient>
              <Text style={styles.sheetRowLabel}>Choose from library</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            {Platform.OS !== 'web' ? (
              <Pressable
                style={({ pressed }) => [styles.sheetRow, pressed && styles.photoBtnPressed]}
                onPress={() => void onPickCamera()}
              >
                <LinearGradient
                  colors={['#2A6BD6', colors.navy]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sheetRowIcon}
                >
                  <Ionicons name="camera" size={18} color={colors.white} />
                </LinearGradient>
                <Text style={styles.sheetRowLabel}>Take photo</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
            {profile?.avatar_path ? (
              <Pressable
                style={({ pressed }) => [
                  styles.sheetRow,
                  styles.sheetRowDanger,
                  pressed && styles.photoBtnPressed,
                ]}
                onPress={() => void onRemovePhoto()}
              >
                <View style={styles.sheetRowIconDanger}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </View>
                <Text style={[styles.sheetRowLabel, { color: colors.error }]}>
                  Remove photo
                </Text>
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
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  photoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHeadCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  photoKicker: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  photoTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  optionalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(224, 170, 24, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 170, 24, 0.4)',
  },
  optionalChipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  photoHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  photoPreview: {
    width: 96,
    height: 96,
    position: 'relative',
  },
  photoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoBusy: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFab: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.card,
    overflow: 'hidden',
  },
  photoFabFill: {
    width: 30,
    height: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  photoActions: {
    flex: 1,
    gap: spacing.sm,
  },
  photoPrimaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...shadows.sm,
  },
  photoPrimaryFill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  photoPrimaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.15,
    color: colors.white,
  },
  photoRemoveBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 68, 68, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(220, 68, 68, 0.22)',
  },
  photoRemoveLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.error,
  },
  photoSafeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  photoSafeNoteText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.tealStrong,
  },
  photoBtnPressed: {
    opacity: 0.88,
  },
  photoBtnDisabled: {
    opacity: 0.5,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11, 42, 67, 0.16)',
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  sheetSubtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 42, 67, 0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
  },
  sheetRowDanger: {
    backgroundColor: 'rgba(220, 68, 68, 0.06)',
    borderColor: 'rgba(220, 68, 68, 0.18)',
  },
  sheetRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowIconDanger: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 68, 68, 0.12)',
  },
  sheetRowLabel: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    letterSpacing: -0.1,
    color: colors.navy,
  },
});
