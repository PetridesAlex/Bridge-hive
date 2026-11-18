import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';

import { PrivacyPolicyDocument } from '@/components/legal/PrivacyPolicyDocument';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

export default function PrivacyPolicyScreen() {
  const { t, language } = useTranslation();
  const { session, homeRoute } = useAuth();

  const backFallback = (session ? homeRoute : '/auth/worker/login') as Href;

  const labels = useMemo(
    () => ({
      legalDocument: t('privacyPolicy.legalDocument'),
      onThisPage: t('privacyPolicy.onThisPage'),
      tocSubtitle: t('privacyPolicy.tocSubtitle'),
      dataController: t('privacyPolicy.dataController'),
      metaVersion: t('privacyPolicy.metaVersion'),
      metaUpdated: t('privacyPolicy.metaUpdated'),
      metaTaxId: t('privacyPolicy.metaTaxId'),
      viewOnline: t('privacyPolicy.viewOnline'),
      offlineNote: t('privacyPolicy.offlineNote'),
      greekNote: t('privacyPolicy.greekNote'),
      statusFinal: t('privacyPolicy.statusFinal'),
      linkFailed: t('privacyPolicy.linkFailed'),
      backToTop: t('privacyPolicy.backToTop'),
    }),
    [t],
  );

  return (
    <AppScreen scroll={false} padded={false} contentKind="detail" contentStyle={styles.fill}>
      <View style={styles.headerPad}>
        <ScreenHeader
          title={t('privacyPolicy.title')}
          showBack
          titleSize="detail"
          backFallback={backFallback}
        />
      </View>
      <PrivacyPolicyDocument labels={labels} showGreekNote={language === 'el'} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerPad: {
    paddingHorizontal: spacing.lg,
  },
});
