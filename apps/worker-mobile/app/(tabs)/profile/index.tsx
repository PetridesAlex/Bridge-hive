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
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileMenuRow, type MenuTone } from '@/components/profile/ProfileMenuRow';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { ListGroup } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useCredentials } from '@/hooks/useCredentials';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayouts } from '@/hooks/usePayouts';
import { useAppLocale, useTranslation } from '@/i18n/locale-provider';
import { getAvatarSignedUrl } from '@/lib/avatar';
import { getMyNotifications } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';

function verificationChipTone(
  status?: string | null,
): 'success' | 'danger' | 'warning' | 'info' {
  if (status === 'verified') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'under_review' || status === 'submitted') return 'info';
  return 'warning';
}

function MenuSection({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionMark} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function credentialsTone(label: string): MenuTone {
  if (label === 'Action required') return 'alert';
  if (label === 'Under review') return 'attention';
  if (label === 'Not required') return 'neutral';
  return 'positive';
}

function payoutTone(status?: string | null): MenuTone {
  if (status === 'verified') return 'positive';
  if (status === 'pending') return 'attention';
  if (status === 'rejected' || status === 'failed' || status === 'suspended') return 'alert';
  return 'neutral';
}

function invoiceTone(label: string): MenuTone {
  if (label.startsWith('Past due')) return 'alert';
  if (label.startsWith('Due') || label === 'Payment due') return 'attention';
  if (label === 'All paid') return 'positive';
  return 'neutral';
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
    isAppReviewDemo,
  } = useAuth();
  const { t } = useTranslation();
  const { language, setLocale } = useAppLocale();
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
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
          hasTextValue: Boolean(
            c.has_text_value ?? c.text_value?.trim(),
          ),
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
      router.replace('/auth/worker/login');
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' &&
        window.confirm(t('profile.signOutConfirmBody'));
      if (confirmed) void onSignOut();
      return;
    }

    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => void onSignOut() },
    ]);
  };

  const languageTrailing =
    language === 'el' ? t('profile.languageGreek') : t('profile.languageEnglish');

  const openLanguageChooser = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('common.english'), t('common.greek')],
          cancelButtonIndex: 0,
          title: t('common.selectLanguage'),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) void setLocale('en');
          if (buttonIndex === 2) void setLocale('el');
        },
      );
      return;
    }

    Alert.alert(t('common.selectLanguage'), undefined, [
      { text: t('common.english'), onPress: () => void setLocale('en') },
      { text: t('common.greek'), onPress: () => void setLocale('el') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <AppScreen
      edges={['top']}
      contentStyle={{ paddingBottom: tabScrollInset }}
    >
      <ScreenHeader
        title={t('profile.account')}
        subtitle={t('profile.subtitle')}
      />
      {isAppReviewDemo ? <AppReviewDemoBanner /> : null}

      <ProfileHero
        name={profile?.full_name ?? t('roles.worker')}
        roleLabel={roleLabel}
        initials={initials}
        imageUri={avatarUrl}
        avatarLoading={avatarLoading}
        changePhotoLabel={t('profile.changePhoto')}
        onPressAvatar={() => router.push('/profile/personal-information')}
        chips={[
          {
            label: verificationLabel(workerProfile?.verification_status),
            icon: 'shield-checkmark-outline',
            tone: verificationChipTone(workerProfile?.verification_status),
            solid: workerProfile?.verification_status === 'verified',
            pulse: workerProfile?.verification_status === 'verified',
          },
          {
            label: billingStandingLabel(billing?.standing),
            icon: 'card-outline',
            tone: billing?.standing === 'restricted' ? 'danger' : 'success',
            solid:
              billing?.standing === 'restricted' ||
              billing?.standing === 'good_standing',
            pulse: billing?.standing === 'good_standing',
          },
        ]}
      />

      <MenuSection title={t('profile.account')} />
      <ListGroup style={styles.menuGroup}>
        <ProfileMenuRow
          grouped
          showDivider
          icon="person-outline"
          label={t('profile.personalInformation')}
          trailing={personalTrailing}
          tone={personalTrailing === 'Complete' ? 'positive' : 'attention'}
          onPress={() => router.push('/profile/personal-information')}
        />
        {!isVerified ? (
          <ProfileMenuRow
            grouped
            showDivider
            icon="clipboard-outline"
            label={t('profile.accountSetup')}
            trailing={setupTrailing}
            tone="attention"
            onPress={() => router.push('/auth/worker/pending')}
          />
        ) : null}
        <ProfileMenuRow
          grouped
          showDivider
          icon="document-text-outline"
          label={t('profile.credentials')}
          trailing={credentialsTrailing}
          tone={credentialsTone(credentialsTrailing)}
          onPress={() => router.push('/profile/documents')}
        />
        <ProfileMenuRow
          grouped
          icon="card-outline"
          label={t('profile.payoutAccount')}
          trailing={payoutTrailing}
          tone={payoutTone(account?.status)}
          onPress={() => router.push('/profile/payout-setup')}
        />
      </ListGroup>

      <MenuSection title={t('profile.activity')} />
      <ListGroup style={styles.menuGroup}>
        <ProfileMenuRow
          grouped
          showDivider
          icon="notifications-outline"
          label={t('notifications.title')}
          trailing={notificationsTrailing}
          tone={unreadCount > 0 ? 'attention' : 'neutral'}
          onPress={() => router.push('/profile/notifications')}
        />
        {!isAppReviewDemo ? (
          <ProfileMenuRow
            grouped
            showDivider
            icon="chatbubbles-outline"
            label={t('messages.title')}
            onPress={() => router.push('/messages')}
          />
        ) : null}
        <ProfileMenuRow
          grouped
          showDivider
          icon="options-outline"
          label={t('profile.notificationPreferences')}
          onPress={() => router.push('/profile/notification-preferences')}
        />
        <ProfileMenuRow
          grouped
          showDivider
          icon="wallet-outline"
          label={t('tabs.earnings')}
          trailing={earningsTrailing}
          tone={awaitingPayouts > 0 ? 'attention' : 'neutral'}
          onPress={() => router.push('/profile/payments')}
        />
        <ProfileMenuRow
          grouped
          icon="receipt-outline"
          label={t('profile.invoices')}
          trailing={invoicesTrailing}
          tone={invoiceTone(invoicesTrailing)}
          onPress={() => router.push('/profile/invoices')}
        />
      </ListGroup>

      <MenuSection title={t('profile.help')} />
      <ListGroup style={styles.menuGroup}>
        <ProfileMenuRow
          grouped
          showDivider
          icon="help-circle-outline"
          label={t('profile.support')}
          onPress={() => router.push('/profile/support')}
        />
        <ProfileMenuRow
          grouped
          showDivider
          icon="language-outline"
          label={t('profile.language')}
          trailing={languageTrailing}
          onPress={openLanguageChooser}
        />
        <ProfileMenuRow
          grouped
          icon="information-circle-outline"
          label={t('profile.appInformation')}
          trailing={`v${appVersion}`}
          onPress={() => router.push('/profile/app-information')}
        />
      </ListGroup>

      <MenuSection title={t('profile.session')} />
      <SignOutButton onPress={confirmSignOut} loading={signingOut} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionMark: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.tealStrong,
  },
  sectionTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    letterSpacing: 0.4,
    color: colors.navy,
  },
  menuGroup: {
    borderRadius: radii.lg,
    borderColor: 'rgba(11, 42, 67, 0.12)',
    marginBottom: spacing.xs,
  },
});
