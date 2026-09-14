import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';

import { ShiftCard } from '@/components/shifts/ShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useShifts } from '@/hooks/useShifts';

export default function ShiftsScreen() {
  const {
    shifts,
    loading,
    error,
    offline,
    refresh,
    workerRole,
    isVerified,
  } = useShifts();

  const roleLabel =
    workerRole && workerRole in WORKER_ROLE_LABELS
      ? WORKER_ROLE_LABELS[workerRole]
      : 'Worker';

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Open shifts" subtitle="Published marketplace shifts" />
      {offline ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>You appear to be offline. Pull to retry.</Text>
        </View>
      ) : null}

      {loading && shifts.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.navy} />
          <Text style={styles.loadingText}>Loading shifts…</Text>
        </View>
      ) : error && shifts.length === 0 ? (
        <EmptyState
          title="We couldn’t load shifts"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : !isVerified ? (
        <EmptyState
          title="Marketplace access pending"
          description="Complete verification, required credentials, and payout approval before open shifts appear."
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title={`No open ${roleLabel} shifts are available right now.`}
              description="Published shifts disappear from this list when their acceptance window closes, they start, or they are filled."
              actionLabel="Retry"
              onAction={refresh}
            />
          }
          renderItem={({ item }) => (
            <ShiftCard
              shift={item}
              onPress={() => router.push(`/shifts/${item.id}`)}
            />
          )}
        />
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
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
  },
  bannerText: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  loading: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
});
