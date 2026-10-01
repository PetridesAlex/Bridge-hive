import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { BillingRestrictionBanner } from '@/components/invoices/BillingRestrictionBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { ContextualActionCard } from '@/components/ui/ContextualActionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListGroup, ListGroupSeparator } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAssignments } from '@/hooks/useAssignments';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useInvoices } from '@/hooks/useInvoices';
import { useShifts } from '@/hooks/useShifts';
import { getCheckInWindow, getWorkerShiftDetails, type WorkerShiftDetails } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';
import { isoDateFromTimestamp } from '@/utils/format';

export default function HomeScreen() {
  const { user, firstName, roleLabel, profile, isVerified } = useAuth();
  const { assignments, loading, error, refresh } = useAssignments(user?.id);
  const { summary, isRestricted, refresh: refreshBilling } = useBillingRestriction(isVerified);
  const { allInvoices, refresh: refreshInvoices } = useInvoices(user?.id);
  const { shifts: openShifts, refresh: refreshOpenShifts } = useShifts();
  const [nextShift, setNextShift] = useState<WorkerShiftDetails | null>(null);
  const [nextStatus, setNextStatus] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const initials =
    (profile?.full_name ?? 'BH')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BH';

  const activeAssignments = useMemo(
    () =>
      assignments.filter((a) =>
        ['accepted', 'checked_in', 'checked_out', 'submitted', 'approved'].includes(a.status),
      ),
    [assignments],
  );

  const upcoming = activeAssignments.find((a) =>
    ['accepted', 'checked_in', 'checked_out'].includes(a.status),
  );

  const workDates = useMemo(() => {
    const dates: string[] = [];
    for (const a of activeAssignments) {
      const start = a.shifts?.starts_at;
      if (start) dates.push(isoDateFromTimestamp(start));
    }
    return dates;
  }, [activeAssignments]);

  const dayFiltered = useMemo(() => {
    if (!selectedDay) return activeAssignments.filter((a) =>
      ['accepted', 'checked_in', 'checked_out'].includes(a.status),
    );
    return activeAssignments.filter((a) => {
      const start = a.shifts?.starts_at;
      return start && isoDateFromTimestamp(start) === selectedDay;
    });
  }, [activeAssignments, selectedDay]);

  const openInvoices = allInvoices.filter(
    (i) => i.status === 'open' || i.status === 'past_due' || i.status === 'payment_processing',
  );
  const pastDueCount = allInvoices.filter((i) => i.status === 'past_due').length;
  const dueSoon = allInvoices.find((i) => i.status === 'open');

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

  useEffect(() => {
    if (nextStatus !== 'accepted' || !nextShift) return;
    const timer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [nextStatus, nextShift]);

  const checkInWindow = useMemo(() => {
    if (!nextShift || nextStatus !== 'accepted') return null;
    return getCheckInWindow(nextShift.starts_at, nextShift.ends_at, new Date(nowTick));
  }, [nextShift, nextStatus, nowTick]);

  const openShiftCount = openShifts.length;

  const nextAction = useMemo(() => {
    if (!isVerified) {
      return {
        eyebrow: 'Next action',
        title: 'Continue account setup',
        body: 'Finish credentials and payout review for marketplace access.',
        actionLabel: 'Continue setup',
        onAction: () => router.push('/auth/worker/pending'),
        icon: 'shield-checkmark-outline' as const,
        variant: 'emphasis' as const,
        live: false,
      };
    }
    if (isRestricted) {
      return {
        eyebrow: 'Billing',
        title: 'Pay overdue invoice',
        body: 'New shift claims are paused until past-due commission is paid.',
        actionLabel: 'View invoices',
        onAction: () => router.push('/(tabs)/invoices'),
        icon: 'alert-circle-outline' as const,
        variant: 'emphasis' as const,
        live: false,
      };
    }
    if (nextShift && nextStatus === 'accepted' && checkInWindow?.isOpen) {
      return {
        eyebrow: 'Workday',
        title: 'Check in to your shift',
        body: 'Your check-in window is open.',
        actionLabel: 'Check in',
        onAction: () => router.push(`/shifts/${nextShift.shift_id}`),
        icon: 'enter-outline' as const,
        variant: 'emphasis' as const,
        live: true,
        liveLabel: 'Window open',
      };
    }
    if (nextShift && nextStatus === 'checked_in') {
      return {
        eyebrow: 'Workday',
        title: 'Check out & submit timesheet',
        body: 'You are currently checked in.',
        actionLabel: 'Open shift',
        onAction: () => router.push(`/shifts/${nextShift.shift_id}`),
        icon: 'exit-outline' as const,
        variant: 'emphasis' as const,
        live: true,
        liveLabel: 'On shift',
      };
    }
    if (nextShift && nextStatus === 'checked_out') {
      return {
        eyebrow: 'Timesheet',
        title: 'Submit your timesheet',
        body: 'Checkout is done — submit hours for organization review.',
        actionLabel: 'Submit timesheet',
        onAction: () => router.push(`/shifts/${nextShift.shift_id}`),
        icon: 'document-text-outline' as const,
        variant: 'light' as const,
        live: true,
        liveLabel: 'Action needed',
      };
    }
    if (pastDueCount === 0 && dueSoon) {
      return {
        eyebrow: 'Money',
        title: 'Commission invoice due soon',
        body: 'Bridge Hive invoices are separate from organization earnings.',
        actionLabel: 'View invoice',
        onAction: () => router.push(`/invoices/${dueSoon.id}`),
        icon: 'receipt-outline' as const,
        variant: 'light' as const,
        live: false,
      };
    }
    if (nextShift) {
      return {
        eyebrow: 'Next shift',
        title: nextShift.organization_name,
        body: 'Open your assignment for details and workday actions.',
        actionLabel: 'View shift',
        onAction: () => router.push(`/shifts/${nextShift.shift_id}`),
        onPressCard: () => router.push(`/shifts/${nextShift.shift_id}`),
        icon: 'calendar-outline' as const,
        variant: 'light' as const,
        live: false,
      };
    }
    if (openShiftCount > 0) {
      return {
        eyebrow: 'Marketplace',
        title:
          openShiftCount === 1
            ? '1 open shift matches your role'
            : `${openShiftCount} open shifts match your role`,
        body: 'Browse role-matched openings and claim when ready.',
        actionLabel: 'Browse shifts',
        onAction: () => router.push('/(tabs)/shifts'),
        onPressCard: () => router.push('/(tabs)/shifts'),
        icon: 'flash-outline' as const,
        variant: 'light' as const,
        live: true,
        liveLabel: 'Open now',
        stats: [
          { value: String(openShiftCount), label: 'Open' },
          { value: roleLabel || 'Role', label: 'Matched' },
        ],
      };
    }
    return {
      eyebrow: 'Schedule',
      title: 'No upcoming assignments',
      body: 'New role-matched shifts will appear here when hospitals publish them.',
      actionLabel: 'Browse shifts',
      onAction: () => router.push('/(tabs)/shifts'),
      icon: 'search-outline' as const,
      variant: 'light' as const,
      live: false,
      stats: [
        { value: '0', label: 'Open' },
        { value: roleLabel || 'Role', label: 'Matched' },
      ],
    };
  }, [
    isVerified,
    isRestricted,
    nextShift,
    nextStatus,
    checkInWindow?.isOpen,
    pastDueCount,
    dueSoon,
    openShiftCount,
    roleLabel,
  ]);

  const onRefresh = () => {
    void refresh();
    void refreshBilling();
    void refreshInvoices();
    void refreshOpenShifts();
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        <GreetingHeader firstName={firstName} roleLabel={roleLabel} initials={initials} />

        {isRestricted && summary ? <BillingRestrictionBanner summary={summary} /> : null}

        {!isVerified ? (
          <Banner
            variant="warning"
            title="Account setup required"
            body="Complete credentials and payout review before marketplace access."
            actionLabel="Continue setup"
            onAction={() => router.push('/auth/worker/pending')}
          />
        ) : null}

        {loading || detailLoading ? (
          <SkeletonCard />
        ) : error ? (
          <ErrorState
            title="Could not load assignments"
            description="Check your connection and try again."
            onRetry={refresh}
          />
        ) : (
          <ContextualActionCard {...nextAction} />
        )}

        <SectionHeader title="This week" />
        <WeekStrip
          selectedIso={selectedDay}
          workDates={workDates}
          onSelect={setSelectedDay}
        />

        {nextShift && !selectedDay ? (
          <View style={styles.scheduleBlock}>
            <NextShiftCard shift={nextShift} assignmentStatus={nextStatus} />
          </View>
        ) : null}

        {selectedDay ? (
          dayFiltered.length === 0 ? (
            <EmptyState
              title="No work on this day"
              description="Select another day or clear the filter to see all upcoming assignments."
              actionLabel="Show all"
              onAction={() => setSelectedDay(null)}
            />
          ) : (
            <ListGroup>
              {dayFiltered.map((a, index) => (
                <React.Fragment key={a.id}>
                  {index > 0 ? <ListGroupSeparator /> : null}
                  <ListRow
                    icon="briefcase-outline"
                    title={a.shifts?.title?.trim() || 'Assignment'}
                    subtitle={a.status.replace(/_/g, ' ')}
                    onPress={() => router.push(`/shifts/${a.shift_id}`)}
                  />
                </React.Fragment>
              ))}
            </ListGroup>
          )
        ) : null}

        <SectionHeader title="Quick access" />
        <ListGroup>
          <ListRow
            icon="calendar-outline"
            title="Open shifts"
            subtitle="Role-matched marketplace"
            onPress={() => router.push('/(tabs)/shifts')}
          />
          <ListGroupSeparator />
          <ListRow
            icon="briefcase-outline"
            title="My work"
            subtitle="Accepted assignments"
            onPress={() => router.push('/(tabs)/work')}
          />
          <ListGroupSeparator />
          <ListRow
            icon="wallet-outline"
            title="Money"
            subtitle="Earnings and invoices"
            onPress={() => router.push('/(tabs)/payments')}
          />
        </ListGroup>

        {openInvoices.length > 0 ? (
          <Pressable
            style={styles.moneySummary}
            onPress={() => router.push('/(tabs)/invoices')}
            accessibilityRole="button"
            accessibilityLabel="View invoices"
          >
            <Text style={styles.moneyTitle}>Invoices</Text>
            <Text style={styles.moneyBody}>
              {openInvoices.length} open
              {pastDueCount > 0 ? ` · ${pastDueCount} past due` : ''}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  scheduleBlock: {
    gap: spacing.lg,
  },
  moneySummary: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  moneyTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  moneyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
