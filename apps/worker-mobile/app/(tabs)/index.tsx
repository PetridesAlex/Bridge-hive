import {
  isMessagingUuid,
  isWorkerRole,
  messagingChannelName,
  subscribeMessagingRealtime,
  sumConversationUnread,
  WORKER_ROLE_LABELS,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { DayShiftCard } from '@/components/home/DayShiftCard';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { NextShiftCard } from '@/components/home/NextShiftCard';
import { QuickAccess } from '@/components/home/QuickAccess';
import { ShiftCalendar } from '@/components/home/ShiftCalendar';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { ShiftNotificationPrompt } from '@/components/push/ShiftNotificationPrompt';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { ContextualActionCard } from '@/components/ui/ContextualActionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useAssignments } from '@/hooks/useAssignments';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useInvoices } from '@/hooks/useInvoices';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useShifts } from '@/hooks/useShifts';
import { useTranslation } from '@/i18n/locale-provider';
import { getAvatarSignedUrl } from '@/lib/avatar';
import { listMyMessagingConversations } from '@/lib/messaging';
import {
  canSubmitCompletedHours,
  getWorkerShiftDetails,
  shiftHasEnded,
  type WorkerShiftDetails,
} from '@/lib/rpcs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { formatDayLabel, formatMoney, formatTimeRange, isoDateFromTimestamp } from '@/utils/format';

function shortPlace(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const letters = trimmed.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, '');
  const shouted = letters.length > 2 && upper.length / letters.length > 0.85;
  const formatted = shouted
    ? trimmed
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
          if (index > 0 && ['and', 'at', 'in', 'of', 'the'].includes(word)) return word;
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ')
    : trimmed;
  const match = formatted.match(/^(.*?)\s+in\s+(.{1,40})$/i);
  if (!match) return formatted;
  const site = match[1].trim();
  const city = match[2].trim();
  if (!site || !city || city.split(' ').length > 3) return formatted;
  return `${site}, ${city}`;
}

function shiftHeadline(title: string | null | undefined, role: string | null | undefined, fallback: string) {
  const name = title?.trim();
  if (name && name.toLowerCase() !== 'shift') return name;
  if (role && isWorkerRole(role)) return WORKER_ROLE_LABELS[role];
  return fallback;
}

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
  const { t } = useTranslation();
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const initials =
    (profile?.full_name ?? 'BH')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BH';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        if (!user?.id) {
          setAvatarUrl(null);
          return;
        }
        const signed = await getAvatarSignedUrl(profile?.avatar_path, user.id);
        if (!active) return;
        setAvatarUrl(signed);
      };
      void load();
      return () => {
        active = false;
      };
    }, [user?.id, profile?.avatar_path]),
  );

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
        live: true,
        liveLabel: 'Upcoming',
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

  const refreshMessageUnread = useCallback(async () => {
    if (isAppReviewDemo || !user?.id) {
      setMessageUnreadCount(0);
      return;
    }
    const result = await listMyMessagingConversations();
    if (result.error) return;
    setMessageUnreadCount(sumConversationUnread(result.data));
  }, [isAppReviewDemo, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshMessageUnread();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refreshMessageUnread();
      });
      return () => sub.remove();
    }, [refreshMessageUnread]),
  );

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !isMessagingUuid(userId) || isAppReviewDemo) return;
    const subscription = subscribeMessagingRealtime({
      client: supabase,
      channelName: messagingChannelName('worker-inbox', { userId }),
      table: 'organization_worker_conversations',
      filter: `worker_id=eq.${userId}`,
      onChange: () => void refreshMessageUnread(),
      onSubscribed: () => void refreshMessageUnread(),
    });
    return () => subscription.unsubscribe();
  }, [isAppReviewDemo, refreshMessageUnread, user?.id]);

  const onRefresh = () => {
    void refresh();
    void refreshBilling();
    void refreshInvoices();
    void refreshOpenShifts();
    void refreshMessageUnread();
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabScrollInset }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <GreetingHeader
          firstName={firstName}
          roleLabel={roleLabel}
          initials={initials}
          imageUri={avatarUrl}
          unreadCount={notificationAlertCount}
          messageUnreadCount={messageUnreadCount}
          verified={isVerified}
          alertTone={pastDueCount > 0 || isRestricted ? 'danger' : dueSoon ? 'money' : 'default'}
          scrollY={scrollY}
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
            title={t('home.loadError')}
            description={t('home.loadErrorBody')}
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
              title={t('home.emptyDay')}
              description={t('home.emptyDayBody')}
              actionLabel={t('home.browseOpen')}
              onAction={() => router.push('/(tabs)/shifts')}
            />
          ) : (
            <View style={styles.dayPlan}>
              <View style={styles.dayPlanHead}>
                <Text style={styles.dayPlanTitle}>{formatDayLabel(selectedDay)}</Text>
                <Text style={styles.dayPlanMeta}>
                  {[
                    dayAssignments.length > 0
                      ? `${dayAssignments.length} booked`
                      : null,
                    dayOpens.length > 0 ? `${dayOpens.length} open` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {dayAssignments.map((assignment) => {
                const shift = assignment.shifts;
                const status = assignmentStatusLabel(assignment.status);
                return (
                  <DayShiftCard
                    key={assignment.id}
                    tone="booked"
                    title={shiftHeadline(shift?.title, shift?.required_role, 'Booked shift')}
                    startsAt={shift?.starts_at ?? `${selectedDay}T08:00:00`}
                    endsAt={shift?.ends_at ?? shift?.starts_at ?? `${selectedDay}T08:00:00`}
                    status={status}
                    rate={
                      shift?.rate_minor
                        ? `${formatMoney(shift.rate_minor, shift.currency)}/hr`
                        : null
                    }
                    onPress={() => router.push(`/shifts/${assignment.shift_id}`)}
                  />
                );
              })}
              {dayOpens.map((shift) => (
                <DayShiftCard
                  key={shift.id}
                  tone="open"
                  title={shiftHeadline(shift.title, shift.required_role, 'Open shift')}
                  startsAt={shift.starts_at}
                  endsAt={shift.ends_at}
                  status="Open to claim"
                  place={
                    shift.location_name?.trim()
                      ? shortPlace(shift.location_name)
                      : shift.organization_name?.trim() || null
                  }
                  rate={
                    shift.rate_minor
                      ? `${formatMoney(shift.rate_minor, shift.currency)}/hr`
                      : null
                  }
                  onPress={() => router.push(`/shifts/${shift.id}`)}
                />
              ))}
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
      </Animated.ScrollView>
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
    gap: spacing.md,
  },
  dayPlanHead: {
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  dayPlanTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  dayPlanMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
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
