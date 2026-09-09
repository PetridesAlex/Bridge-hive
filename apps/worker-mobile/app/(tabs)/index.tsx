import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { GreetingHeader } from '@/components/home/GreetingHeader';
import { NextShiftCard } from '@/components/home/NextShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, spacing, typography } from '@/constants/theme';
import { useAssignments } from '@/hooks/useAssignments';
import { getWorkerShiftDetails, type WorkerShiftDetails } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';

export default function HomeScreen() {
  const { user, firstName, roleLabel, profile } = useAuth();
  const { assignments, loading, error, refresh } = useAssignments(user?.id);
  const [nextShift, setNextShift] = useState<WorkerShiftDetails | null>(null);
  const [nextStatus, setNextStatus] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);

  const initials =
    (profile?.full_name ?? 'BH')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BH';

  const upcoming = assignments.find((a) =>
    ['accepted', 'checked_in', 'checked_out'].includes(a.status),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!upcoming) {
        setNextShift(null);
        setNextStatus(undefined);
        return;
      }
      setDetailLoading(true);
      const result = await getWorkerShiftDetails(upcoming.shift_id);
      if (!cancelled) {
        setNextShift(result.data);
        setNextStatus(upcoming.status);
        setDetailLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [upcoming]);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <GreetingHeader firstName={firstName} roleLabel={roleLabel} initials={initials} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your schedule</Text>
          {loading || detailLoading ? (
            <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
          ) : error ? (
            <EmptyState
              title="Could not load assignments"
              description={error}
              actionLabel="Retry"
              onAction={refresh}
            />
          ) : nextShift ? (
            <NextShiftCard shift={nextShift} assignmentStatus={nextStatus} />
          ) : (
            <EmptyState
              title="No upcoming shifts"
              description="Browse open shifts and claim one when you are ready."
              actionLabel="Browse shifts"
              onAction={() => router.push('/(tabs)/shifts')}
            />
          )}
        </View>

        <Pressable style={styles.linkCard} onPress={() => router.push('/documents')}>
          <Text style={styles.linkTitle}>Credentials</Text>
          <Text style={styles.linkBody}>Manage licence and identity documents</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    color: colors.text,
  },
  linkCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  linkBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
