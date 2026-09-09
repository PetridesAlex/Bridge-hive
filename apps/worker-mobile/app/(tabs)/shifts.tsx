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

import { ShiftCard } from '@/components/shifts/ShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useShifts } from '@/hooks/useShifts';

export default function ShiftsScreen() {
  const { shifts, loading, error, offline, refresh } = useShifts();

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Open shifts" subtitle="Published marketplace shifts" />
      {offline ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>You appear to be offline. Pull to retry.</Text>
        </View>
      ) : null}

      {loading && shifts.length === 0 ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xxxl }} />
      ) : error && shifts.length === 0 ? (
        <EmptyState
          title="Could not load shifts"
          description={error}
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
              title="No open shifts"
              description="Check back soon for new published shifts."
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
});
