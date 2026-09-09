import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CredentialCard } from '@/components/credentials/CredentialCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useCredentials } from '@/hooks/useCredentials';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Credential display screen.
 * Document upload is deferred to a future phase. This screen shows existing
 * credentials but does not create new records until a real file upload succeeds.
 */
export default function DocumentsScreen() {
  const { user } = useAuth();
  const { credentials, loading, error, refresh } = useCredentials(user?.id);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Credentials" showBack subtitle="Identity and licence documents" />

      <View style={styles.form}>
        <Text style={styles.hint}>
          Document upload will be available in a future update. No verification request has been
          submitted yet.
        </Text>
        <Text style={styles.hint}>
          Workers can create pending credentials only. Platform verifiers set verified status after
          reviewing uploaded documents.
        </Text>
        <Button label="Document upload coming soon" variant="secondary" disabled onPress={() => {}} />
      </View>

      {loading && credentials.length === 0 ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      ) : error && credentials.length === 0 ? (
        <EmptyState title="Could not load credentials" description={error} actionLabel="Retry" onAction={refresh} />
      ) : (
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No credentials yet"
              description="Register your nursing licence or identity document to begin verification."
            />
          }
          renderItem={({ item }) => <CredentialCard credential={item} />}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
});
