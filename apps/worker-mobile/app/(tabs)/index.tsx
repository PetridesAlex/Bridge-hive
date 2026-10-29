import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { GreetingHeader } from '@/components/home/GreetingHeader';
import { QuickAccess } from '@/components/home/QuickAccess';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { ShiftNotificationPrompt } from '@/components/push/ShiftNotificationPrompt';
import { NextShiftCard } from '@/components/home/NextShiftCard';
import { ShiftCalendar } from '@/components/home/ShiftCalendar';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { ContextualActionCard } from '@/components/ui/ContextualActionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListGroup, ListGroupSeparator } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAssignments } from '@/hooks/useAssignments';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useInvoices } from '@/hooks/useInvoices';
import { useShifts } from '@/hooks/useShifts';
import {
  canSubmitCompletedHours,
  getWorkerShiftDetails,
  shiftHasEnded,
  type WorkerShiftDetails,
} from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';
import { formatDayLabel, formatTimeRange, isoDateFromTimestamp } from '@/utils/format';

function assignmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    accepted: 'Booked',
    checked_in: 'Booked',
    checked_out: 'Booked',
    submitted: 'Hours submitted',
    approved: 'Approved',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export default function HomeScreen() {
  const { user, firstName, roleLabel, profile, isVerified, isAppReviewDemo } =
    useAuth();
  const { assignments, loading, error, refresh } = useAssignments(user?.id);
  const { isRestricted, refresh: refreshBilling } = useBillingRestriction(
    isVerified && !isAppReviewDemo,
  );
  const { allInvoices, refresh: refreshInvoices } = useInvoices(user?.id);
  const { shifts: openShifts, refresh: refreshOpenShifts } = useShifts();
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
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

  const openDates = useMemo(
    () => openShifts.map((shift) => isoDateFromTimestamp(shift.starts_at)),
    [openShifts],
  );

  const dayAssignments = useMemo(() => {
    if (!selectedDay) return [];
    return activeAssignments
      .filter((assignment) => {
        const start = assignment.shifts?.starts_at;
        return start && isoDateFromTimestamp(start) === selectedDay;
      })
      .sort((a, b) => (a.shifts?.starts_at ?? '').localeCompare(b.shifts?.starts_at ?? ''));
  }, [activeAssignments, selectedDay]);

  const dayOpens = useMemo(() => {
    if (!selectedDay) return [];
    return openShifts
      .filter((shift) => isoDateFromTimestamp(shift.starts_at) === selectedDay)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [openShifts, selectedDay]);

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
    if (!nextShift || !canSubmitCompletedHours(nextStatus)) return;
    const timer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [nextStatus, nextShift]);

  const nextShiftEnded = useMemo(() => {
    if (!nextShift || !canSubmitCompletedHours(nextStatus)) return false;
    return shiftHasEnded(nextShift.ends_at, new Date(nowTick));
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
    // Billing restriction ("Marketplace access paused") surfaces on the notifications bell.
    if (nextShift && canSubmitCompletedHours(nextStatus) && nextShiftEnded) {
      return {
        eyebrow: 'Timesheet',
        title: 'Submit completed hours',
        body: 'Your shift has ended — submit hours for organization review.',
        actionLabel: 'Submit hours',
        onAction: () => router.push(`/shifts/${nextShift.shift_id}`),
        icon: 'document-text-outline' as const,
        variant: 'emphasis' as const,
        live: true,
        liveLabel: 'Action needed',
      };
    }
    // Commission invoice alerts surface on the notifications bell, not here.
    if (nextShift) {
      const role = nextShift.title?.trim() || nextShift.required_role?.replace(/_/g, ' ');
      const when = formatTimeRange(nextShift.starts_at, nextShift.ends_at);
      return {
        eyebrow: 'Next shift',
        title: nextShift.organization_name,
        body: [role, when].filter(Boolean).join(' · ') || undefined,
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
      onPressCard: () => router.push('/(tabs)/shifts'),
      icon: 'calendar-outline' as const,
      variant: 'light' as const,
      live: true,
      liveLabel: 'Waiting',
      stats: [
        { value: '0', label: 'Open' },
        { value: roleLabel || 'Role', label: 'Matched' },
      ],
    };
  }, [
    isVerified,
    nextShift,
    nextStatus,
    nextShiftEnded,
    openShiftCount,
    roleLabel,
  ]);

  const notificationAlertCount = useMemo(() => {
    let count = 0;
    if (pastDueCount > 0) count += pastDueCount;
    else if (dueSoon) count += 1;
    if (isRestricted) count += 1;
    return count;
  }, [pastDueCount, dueSoon, isRestricted]);

  const onRefresh = () => {
    void refresh();
    void refreshBilling();
    void refreshInvoices();
    void refreshOpenShifts();
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabScrollInset }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        <GreetingHeader
          firstName={firstName}
          roleLabel={roleLabel}
          initials={initials}
          unreadCount={notificationAlertCount}
          verified={isVerified}
          alertTone={pastDueCount > 0 || isRestricted ? 'danger' : dueSoon ? 'money' : 'default'}
        />

        {isAppReviewDemo ? <AppReviewDemoBanner /> : null}

        {isAppReviewDemo ? null : !isVerified ? (
          <Banner
            variant="warning"
            title="Account setup required"
            body="Complete credentials and payout review before marketplace access."
            actionLabel="Continue setup"
            onAction={() => router.push('/auth/worker/pending')}
          />
        ) : (
          <ShiftNotificationPrompt verified={isVerified} />
        )}

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

        <ShiftCalendar
          selectedIso={selectedDay}
          workDates={workDates}
          openDates={openDates}
          onSelect={setSelectedDay}
        />

        {nextShift && !selectedDay ? (
          <View style={styles.scheduleBlock}>
            <NextShiftCard shift={nextShift} assignmentStatus={nextStatus} />
          </View>
        ) : null}

        {selectedDay ? (
          dayAssignments.length === 0 && dayOpens.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Nothing on this day"
              description="Booked shifts and open shifts for your role appear here."
              actionLabel="Browse open shifts"
              onAction={() => router.push('/(tabs)/shifts')}
            />
          ) : (
            <View style={styles.dayPlan}>
              <Text style={styles.dayPlanTitle}>{formatDayLabel(selectedDay)}</Text>
              {dayAssignments.length > 0 ? (
                <ListGroup>
                  {dayAssignments.map((assignment, index) => (
                    <React.Fragment key={assignment.id}>
                      {index > 0 ? <ListGroupSeparator /> : null}
                      <ListRow
                        icon="briefcase"
                        iconColor={colors.white}
                        iconBackground={colors.tealStrong}
                        title={assignment.shifts?.title?.trim() || 'Booked shift'}
                        subtitle={
                          assignment.shifts
                            ? `${formatTimeRange(assignment.shifts.starts_at, assignment.shifts.ends_at)} · ${assignmentStatusLabel(assignment.status)}`
                            : assignmentStatusLabel(assignment.status)
                        }
                        onPress={() => router.push(`/shifts/${assignment.shift_id}`)}
                      />
                    </React.Fragment>
                  ))}
                </ListGroup>
              ) : null}
              {dayOpens.length > 0 ? (
                <ListGroup>
                  {dayOpens.map((shift, index) => (
                    <React.Fragment key={shift.id}>
                      {index > 0 ? <ListGroupSeparator /> : null}
                      <ListRow
                        icon="flash"
                        iconColor={colors.navy}
                        iconBackground={colors.yellowLight}
                        title={shift.title?.trim() || 'Open shift'}
                        subtitle={`${formatTimeRange(shift.starts_at, shift.ends_at)} · Open to claim`}
                        onPress={() => router.push(`/shifts/${shift.id}`)}
                      />
                    </React.Fragment>
                  ))}
                </ListGroup>
              ) : null}
            </View>
          )
        ) : null}

        <QuickAccess />

        {openInvoices.length > 0 ? (
          <InvoiceSummaryCard
            openCount={openInvoices.length}
            pastDueCount={pastDueCount}
          />
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

function InvoiceSummaryCard({
  openCount,
  pastDueCount,
}: {
  openCount: number;
  pastDueCount: number;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const urgent = pastDueCount > 0;
  const gradient: [string, string] = urgent
    ? ['#9B1C1C', colors.error]
    : [colors.navy, colors.tealStrong];
  const stubCount = urgent ? pastDueCount : openCount;
  const subtitle =
    pastDueCount > 0
      ? `${openCount} open · ${pastDueCount} past due`
      : openCount === 1
        ? '1 invoice needs attention'
        : `${openCount} invoices need attention`;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(160).duration(360)}
      style={motionStyle}
    >
      <Pressable
        onPress={() => router.push('/(tabs)/invoices')}
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.975, { damping: 16, stiffness: 340 });
        }}
        onPressOut={() => {
          if (!reduced) scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        }}
        accessibilityRole="button"
        accessibilityLabel="View invoices"
        style={({ pressed }) => [
          styles.invoiceCard,
          { shadowColor: gradient[0] },
          pressed && styles.invoiceCardPressed,
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.invoiceStub}
        >
          <Ionicons
            name={urgent ? 'alert-circle' : 'receipt-outline'}
            size={18}
            color="rgba(255,255,255,0.85)"
          />
          <Text style={styles.invoiceStubCount}>{stubCount}</Text>
          <Text style={styles.invoiceStubLabel}>{urgent ? 'Past due' : 'Open'}</Text>
        </LinearGradient>

        <View style={styles.invoiceCopy}>
          <Text style={[styles.invoiceEyebrow, urgent && styles.invoiceEyebrowUrgent]}>
            Commission
          </Text>
          <Text style={styles.invoiceTitle}>Invoices</Text>
          <Text style={styles.invoiceSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.invoiceAction}>
          <Text style={styles.invoiceActionText}>{urgent ? 'Pay' : 'Review'}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.navy} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  scheduleBlock: {
    gap: spacing.lg,
  },
  dayPlan: {
    gap: spacing.sm,
  },
  dayPlanTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
  },
  invoiceCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 92,
    marginTop: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.sm,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  invoiceCardPressed: {
    opacity: 0.92,
  },
  invoiceStub: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.md,
  },
  invoiceStubCount: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 28,
    lineHeight: 32,
    color: colors.white,
  },
  invoiceStubLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 9.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.78)',
  },
  invoiceCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  invoiceEyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  invoiceEyebrowUrgent: {
    color: colors.error,
  },
  invoiceTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.25,
    color: colors.text,
  },
  invoiceSubtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  invoiceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    marginRight: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.yellow,
  },
  invoiceActionText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12.5,
    color: colors.navy,
  },
});
