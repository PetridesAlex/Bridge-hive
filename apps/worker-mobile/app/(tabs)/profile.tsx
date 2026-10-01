import {
  accountSetupMenuTrailingStatus,
  billingStandingLabel,
  credentialsMenuTrailingStatus,
  earningsMenuTrailingStatus,
  invoicesMenuTrailingStatus,
  notificationsMenuTrailingStatus,
  payoutMenuTrailingStatus,
  personalInformationTrailingStatus,
  profileInitials,
  type CredentialSummary,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileMenuRow } from '@/components/profile/ProfileMenuRow';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { AppScreen } from '@/components/ui/AppScreen';
import { Avatar } from '@/components/ui/Avatar';
import { ListGroup } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useCredentials } from '@/hooks/useCredentials';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayouts } from '@/hooks/usePayouts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getAvatarSignedUrl } from '@/lib/avatar';
import { getMyNotifications } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';

function verificationTone(status?: string | null) {
  if (status === 'verified') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'under_review' || status === 'submitted') return 'info' as const;
  return 'warning' as const;
}

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

export default function AccountHubScreen() {
  const {
    profile,
    workerProfile,
    roleLabel,
    signOut,
    user,
    isVerified,
  } = useAuth();
  const reducedMotion = useReducedMotion();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const workerId = user?.id;
  const { credentials } = useCredentials(workerId);
  const { account, payouts } = usePayouts(workerId);
  const { allInvoices } = useInvoices(workerId);
  const { summary: billing } = useBillingRestriction(Boolean(workerId));

  const credentialSummaries: CredentialSummary[] = useMemo(
    () =>
      credentials.map((c) => {
        const paths = Array.isArray(c.storage_paths) ? c.storage_paths : [];
        return {
          credentialType: c.credential_type,
          status: c.status as CredentialSummary['status'],
          hasFile: Boolean(c.storage_path) || paths.length > 0,
        };
      }),
    [credentials],
  );

  const initials = profileInitials(profile?.full_name);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        if (!workerId) return;
        setAvatarLoading(true);
        const [signed, notifications] = await Promise.all([
          getAvatarSignedUrl(profile?.avatar_path, workerId),
          getMyNotifications(workerId),
        ]);
        if (!active) return;
        setAvatarUrl(signed);
        setAvatarLoading(false);
        if (!notifications.error) {
          setUnreadCount(notifications.data.filter((n) => !n.read_at).length);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [workerId, profile?.avatar_path]),
  );

  const personalTrailing = personalInformationTrailingStatus(profile?.phone);
  const setupTrailing = accountSetupMenuTrailingStatus({
    verificationStatus: workerProfile?.verification_status ?? 'draft',
    accountStatus: profile?.account_status,
    role: workerProfile?.worker_role,
    credentials: credentialSummaries,
    payoutStatus: account?.status,
  });
  const credentialsTrailing = credentialsMenuTrailingStatus({
    role: workerProfile?.worker_role,
    credentials: credentialSummaries,
  });
  const payoutTrailing = payoutMenuTrailingStatus({
    maskedIban: account?.masked_iban,
    status: account?.status,
  });
  const notificationsTrailing = notificationsMenuTrailingStatus(unreadCount);
  const awaitingPayouts = payouts.filter((p) =>
    ['approved', 'payment_instruction_ready', 'reconciliation_pending', 'overdue'].includes(
      p.status,
    ),
  ).length;
  const earningsTrailing = earningsMenuTrailingStatus(awaitingPayouts);
  const invoicesTrailing = invoicesMenuTrailingStatus(allInvoices);
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0';

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/welcome');
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' && window.confirm('End your Bridge Hive session?');
      if (confirmed) void onSignOut();
      return;
    }

    Alert.alert('Sign out', 'End your Bridge Hive session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void onSignOut() },
    ]);
  };

  return (
    <AppScreen edges={['top']}>
      <ScreenHeader
        title="Account"
        subtitle="Manage your profile, verification, and preferences."
      />

      <LinearGradient
        colors={['#0B2A43', '#0E4A5C', '#0F6B6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, !reducedMotion && styles.heroEnter]}
      >
        <Pressable
          onPress={() => router.push('/profile/personal-information')}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          style={styles.avatarPress}
        >
          <View style={styles.avatarWrap}>
            {avatarLoading && !avatarUrl ? (
              <View style={[styles.avatarPlaceholder, { width: 92, height: 92 }]}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : (
              <Avatar
                initials={initials}
                size={92}
                imageUri={avatarUrl}
                backgroundColor="rgba(255,255,255,0.18)"
                textColor={colors.white}
              />
            )}
            <View style={styles.cameraBadge} accessibilityElementsHidden>
              <Ionicons name="camera" size={16} color={colors.navy} />
            </View>
          </View>
        </Pressable>

        <Text style={styles.heroName}>{profile?.full_name ?? 'Worker'}</Text>
        <Text style={styles.heroRole}>{roleLabel}</Text>
        <View style={styles.pillRow}>
          <StatusBadge
            label={verificationLabel(workerProfile?.verification_status)}
            tone={verificationTone(workerProfile?.verification_status)}
            icon="shield-checkmark-outline"
          />
          <StatusBadge
            label={billingStandingLabel(billing?.standing)}
            tone={billing?.standing === 'restricted' ? 'danger' : 'success'}
            icon="card-outline"
          />
        </View>
      </LinearGradient>

      <Text style={styles.group}>Account</Text>
      <ListGroup>
        <ProfileMenuRow
          icon="person-outline"
          label="Personal information"
          trailing={personalTrailing}
          onPress={() => router.push('/profile/personal-information')}
          tint="navy"
        />
        {!isVerified ? (
          <ProfileMenuRow
            icon="clipboard-outline"
            label="Account Setup"
            trailing={setupTrailing}
            onPress={() => router.push('/auth/worker/pending')}
            tint="navy"
          />
        ) : null}
        <ProfileMenuRow
          icon="document-text-outline"
          label="Credentials"
          trailing={credentialsTrailing}
          onPress={() => router.push('/documents')}
          tint="indigo"
        />
        <ProfileMenuRow
          icon="card-outline"
          label="Payout account"
          trailing={payoutTrailing}
          onPress={() => router.push('/payout-setup')}
          tint="navy"
          last
        />
      </ListGroup>

      <Text style={styles.group}>Activity</Text>
      <ListGroup>
        <ProfileMenuRow
          icon="notifications-outline"
          label="Notifications"
          trailing={notificationsTrailing}
          onPress={() => router.push('/notifications')}
          tint="orange"
        />
        <ProfileMenuRow
          icon="wallet-outline"
          label="Earnings"
          trailing={earningsTrailing}
          onPress={() => router.push('/(tabs)/payments')}
          tint="green"
        />
        <ProfileMenuRow
          icon="receipt-outline"
          label="Bridge Hive invoices"
          trailing={invoicesTrailing}
          onPress={() => router.push('/(tabs)/invoices')}
          tint="indigo"
          last
        />
      </ListGroup>

      <Text style={styles.group}>Help</Text>
      <ListGroup>
        <ProfileMenuRow
          icon="help-circle-outline"
          label="Support"
          onPress={() => router.push('/support')}
          tint="navy"
        />
        <ProfileMenuRow
          icon="information-circle-outline"
          label="App information"
          trailing={`v${appVersion}`}
          onPress={() => router.push('/profile/app-information')}
          tint="gray"
          last
        />
      </ListGroup>

      <Text style={styles.group}>Session</Text>
      <SignOutButton onPress={confirmSignOut} loading={signingOut} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroEnter: {
    // Soft presence without bounce; ScreenEnter already handles page fade.
    opacity: 1,
  },
  avatarPress: {
    marginBottom: spacing.xs,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPlaceholder: {
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0E4A5C',
  },
  heroName: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
  },
  heroRole: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  group: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
