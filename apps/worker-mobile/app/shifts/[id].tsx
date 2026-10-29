import {
  commissionFromGross,
  DEFAULT_COMMISSION_RATE_BPS,
  estimatedWorkerShiftPayMinor,
  openPositionsLabel,
  SHIFT_UNAVAILABLE_TITLE,
} from '@bridge-hive/domain';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { AssignmentTimeline } from '@/components/ui/AssignmentTimeline';
import { Ionicons } from '@expo/vector-icons';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PremiumActionButton } from '@/components/ui/PremiumActionButton';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Surface } from '@/components/ui/Surface';
import { TextInput } from '@/components/ui/TextInput';

import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import {
  fetchAppReviewDemoCatalog,
  isAppReviewDemoShiftId,
  workerShiftDetailsFromDemoCatalog,
} from '@/lib/app-review-demo';
import { getMyAssignments, type ShiftAssignment } from '@/lib/queries';
import {
  assignmentActionErrorMessage,
  canSubmitCompletedHours,
  claimErrorMessage,
  claimShift,
  getWorkerShiftDetails,
  scheduledWorkingMinutes,
  shiftHasEnded,
  submitTimesheetRpc,
  type WorkerShiftDetails,
} from '@/lib/rpcs';
import { clearPendingShiftRoute, peekPendingShiftRoute } from '@/lib/push/pending-shift';
import { useAuth } from '@/providers/AuthProvider';
import {
  formatDate,
  formatDurationMinutes,
  formatMoney,
  formatTimeRange,
} from '@/utils/format';

function minutesToHoursMinutes(total: number): { hours: string; minutes: string } {
  const safe = Math.max(0, Math.floor(total));
  return {
    hours: String(Math.floor(safe / 60)),
    minutes: String(safe % 60),
  };
}

function ScheduleMetaRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <View style={styles.metaIconWrap}>
        <Ionicons name={icon} size={14} color={colors.tealStrong} />
      </View>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function parseCompletedMinutes(hoursText: string, minutesText: string): number | null {
  const hours = Number.parseInt(hoursText.trim() || '0', 10);
  const minutes = Number.parseInt(minutesText.trim() || '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || minutes < 0 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  if (total < 1 || total > 1440) return null;
  return total;
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isVerified, isAppReviewDemo, canPerformLiveMarketplaceActions } =
    useAuth();
  const [shift, setShift] = useState<WorkerShiftDetails | null>(null);
  const [assignment, setAssignment] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [hoursText, setHoursText] = useState('0');
  const [minutesText, setMinutesText] = useState('0');
  const [hoursPrefillKey, setHoursPrefillKey] = useState<string | null>(null);
  const demoShift = isAppReviewDemo || isAppReviewDemoShiftId(id);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);

    if (isAppReviewDemo || isAppReviewDemoShiftId(id)) {
      const catalog = await fetchAppReviewDemoCatalog();
      if (catalog.error || !catalog.data) {
        setError(catalog.error ?? 'Demonstration shift unavailable');
        setShift(null);
        setAssignment(null);
        setLoading(false);
        return;
      }
      setShift(workerShiftDetailsFromDemoCatalog(catalog.data));
      setAssignment(null);
      setLoading(false);
      return;
    }

    const detail = await getWorkerShiftDetails(id);
    if (detail.error || !detail.data) {
      setError(detail.error ?? 'Shift not found');
      setShift(null);
      setLoading(false);
      return;
    }
    setShift(detail.data);

    if (user?.id) {
      const mine = await getMyAssignments(user.id);
      const match = mine.data.find((a) => a.shift_id === id) ?? null;
      setAssignment(match);
    }
    setLoading(false);
  }, [id, user?.id, isAppReviewDemo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const pending = peekPendingShiftRoute();
    if (pending && id && pending.endsWith(String(id).toLowerCase())) {
      clearPendingShiftRoute();
    }
  }, [id]);

  useEffect(() => {
    if (!shift || !canSubmitCompletedHours(assignment?.status)) return;
    const idTimer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(idTimer);
  }, [shift, assignment?.status]);

  useEffect(() => {
    if (!shift || !assignment) return;
    const key = `${assignment.id}:${shift.starts_at}:${shift.ends_at}:${shift.break_minutes}`;
    if (hoursPrefillKey === key) return;
    const pref = minutesToHoursMinutes(
      scheduledWorkingMinutes(shift.starts_at, shift.ends_at, shift.break_minutes),
    );
    setHoursText(pref.hours);
    setMinutesText(pref.minutes);
    setHoursPrefillKey(key);
  }, [assignment, shift, hoursPrefillKey]);

  const ended = useMemo(() => {
    if (!shift) return false;
    return shiftHasEnded(shift.ends_at, new Date(nowTick));
  }, [shift, nowTick]);

  const onClaim = async () => {
    if (!id || !canPerformLiveMarketplaceActions || claiming) return;
    setClaiming(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    const result = await claimShift(id);
    setClaiming(false);
    if (result.error) {
      const message = claimErrorMessage(result.error, shift?.required_role);
      setActionError(message);
      Alert.alert('Claim failed', message);
      return;
    }
    setActionSuccess('Shift accepted. It is now on My shifts.');
    Alert.alert('Shift accepted.', 'This shift is now on your schedule.');
    void refresh();
  };

  const onSubmitHours = async () => {
    if (!assignment || !canPerformLiveMarketplaceActions) return;
    const total = parseCompletedMinutes(hoursText, minutesText);
    if (total == null) {
      const message = 'Enter completed time between 1 minute and 24 hours.';
      setActionError(message);
      Alert.alert('Invalid hours', message);
      return;
    }
    if (!ended) {
      const message = 'You can submit completed hours after the scheduled end time.';
      setActionError(message);
      Alert.alert('Shift not ended', message);
      return;
    }
    setActing(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    const ts = await submitTimesheetRpc(assignment.id, total);
    setActing(false);
    if (ts.error) {
      const message = assignmentActionErrorMessage(ts.error);
      setActionError(message);
      Alert.alert('Timesheet error', message);
      return;
    }

    const minutes = ts.data?.submitted_minutes ?? total;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const durationLabel =
      hours > 0
        ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
        : `${mins} minutes`;
    const message = `${durationLabel} submitted. The organization will review and approve your hours before pay is finalized.`;
    setActionSuccess(message);
    Alert.alert('Hours submitted', message);
    void refresh();
  };

  if (loading) {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Shift details" showBack />
        <SkeletonCard lines={4} />
      </AppScreen>
    );
  }

  if (!shift) {
    if (error) {
      return (
        <AppScreen edges={['top']} contentKind="detail">
          <ScreenHeader title="Shift details" showBack />
          <EmptyState
            title="Shift unavailable"
            description={error}
            actionLabel="Retry"
            onAction={refresh}
          />
        </AppScreen>
      );
    }
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Shift details" showBack />
        <EmptyState
          title={SHIFT_UNAVAILABLE_TITLE}
          description="It may be filled, withdrawn, or no longer open for your role."
        />
      </AppScreen>
    );
  }

  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const openPositions = shift.open_positions ?? 0;
  const canClaim =
    canPerformLiveMarketplaceActions &&
    shift.status === 'published' &&
    !assignment &&
    openPositions > 0;
  const canComplete =
    canPerformLiveMarketplaceActions &&
    canSubmitCompletedHours(assignment?.status) &&
    ended;
  const enteredMinutes = parseCompletedMinutes(hoursText, minutesText);
  const claimBlockedReason = demoShift
    ? 'Demonstration shifts cannot be claimed.'
    : !isVerified
      ? 'Complete account verification before claiming shifts.'
      : assignment
        ? undefined
        : shift.status !== 'published'
          ? 'This shift is no longer open for claims.'
          : openPositions < 1
            ? 'All positions on this shift are filled.'
            : undefined;

  const start = new Date(shift.starts_at);
  const end = new Date(shift.ends_at);
  const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  const estimatedPayMinor = estimatedWorkerShiftPayMinor({
    rateMinor: shift.rate_minor,
    startsAtIso: shift.starts_at,
    endsAtIso: shift.ends_at,
    breakMinutes: shift.break_minutes,
  });
  const commissionMinor =
    estimatedPayMinor > 0 ? commissionFromGross(estimatedPayMinor) : 0;
  const netAfterCommissionMinor = Math.max(0, estimatedPayMinor - commissionMinor);
  const commissionPercent = DEFAULT_COMMISSION_RATE_BPS / 100;
  const notesLong = (shift.notes?.length ?? 0) > 160;
  const notesVisible =
    !shift.notes
      ? ''
      : notesExpanded || !notesLong
        ? shift.notes
        : `${shift.notes.slice(0, 160).trim()}…`;

  const endLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(end);

  const primaryAction = canClaim
    ? {
        label: claiming ? 'Claiming shift…' : 'Claim shift',
        onPress: onClaim,
        loading: claiming,
        disabled: claiming,
      }
    : canComplete
      ? {
          label: acting ? 'Submitting…' : 'Submit completed hours',
          onPress: onSubmitHours,
          loading: acting,
          disabled: acting,
        }
      : null;

  return (
    <AppScreen scroll={false} edges={['top']} contentKind="detail">
      <ScreenHeader title="Shift details" showBack titleSize="detail" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          primaryAction ? styles.scrollSticky : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {demoShift ? <AppReviewDemoBanner /> : null}
        <View style={styles.titleBlock}>
          <Text style={styles.orgEyebrow}>{shift.organization_name}</Text>
          <Text style={styles.shiftTitle}>{shift.title || roleLabel}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge label={roleLabel} tone="info" icon="medkit-outline" solid />
            {assignment ? (
              <StatusBadge
                label={assignment.status.replace(/_/g, ' ')}
                tone="accent"
                icon="briefcase-outline"
                solid
              />
            ) : openPositions > 0 ? (
              <StatusBadge label="Open" tone="accent" icon="calendar-outline" solid />
            ) : (
              <StatusBadge label="Full" tone="neutral" icon="calendar-outline" />
            )}
          </View>
        </View>

        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleEyebrow}>When & where</Text>
            <View style={styles.scheduleAccent} />
          </View>

          <View style={styles.scheduleHero}>
            <View style={styles.scheduleChip}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="calendar" size={16} color={colors.white} />
              </View>
              <View style={styles.scheduleChipText}>
                <Text style={styles.scheduleChipLabel}>Date</Text>
                <Text style={styles.scheduleChipValue}>
                  {formatDate(shift.starts_at)}
                </Text>
              </View>
            </View>
            <View style={styles.scheduleChip}>
              <View style={[styles.scheduleIconWrap, styles.scheduleIconTeal]}>
                <Ionicons name="time" size={16} color={colors.white} />
              </View>
              <View style={styles.scheduleChipText}>
                <Text style={styles.scheduleChipLabel}>Hours</Text>
                <Text style={styles.scheduleChipValue}>
                  {formatTimeRange(shift.starts_at, shift.ends_at)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.scheduleMeta}>
            <ScheduleMetaRow
              icon="location"
              label="Location"
              value={shift.location_name}
            />
            {shift.ward_name ? (
              <ScheduleMetaRow icon="business" label="Ward" value={shift.ward_name} />
            ) : null}
            <ScheduleMetaRow
              icon="hourglass"
              label="Duration"
              value={formatDurationMinutes(durationMin)}
            />
            <ScheduleMetaRow
              icon="people"
              label="Positions"
              value={
                shift.status === 'published'
                  ? openPositionsLabel(openPositions)
                  : `${shift.required_positions ?? 1}`
              }
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Price overview</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <LinearGradient
                colors={[colors.navy, colors.tealStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.priceIcon}
              >
                <Text style={styles.priceIconText}>€</Text>
              </LinearGradient>
              <View style={styles.priceHeaderCopy}>
                <Text style={styles.priceTitle}>Price overview</Text>
                <Text style={styles.priceSubtitle}>
                  Based on scheduled hours at{' '}
                  {formatMoney(shift.rate_minor, shift.currency)}/hr
                </Text>
              </View>
              <View style={styles.rateBadge}>
                <Text style={styles.rateBadgeText}>
                  {formatMoney(shift.rate_minor, shift.currency)}/hr
                </Text>
              </View>
            </View>

            {estimatedPayMinor > 0 ? (
              <View style={styles.priceRows}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total pay</Text>
                  <Text style={styles.priceValue}>
                    {formatMoney(estimatedPayMinor, shift.currency)}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <View style={styles.priceLabelCol}>
                    <Text style={styles.priceLabel}>Commission</Text>
                    <Text style={styles.priceHint}>
                      Bridge Hive invoice · {commissionPercent}%
                    </Text>
                  </View>
                  <Text style={styles.priceCommission}>
                    −{formatMoney(commissionMinor, shift.currency)}
                  </Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceRow}>
                  <View style={styles.priceLabelCol}>
                    <Text style={styles.priceEarningsLabel}>Earnings</Text>
                    <Text style={styles.priceHint}>After commission invoice</Text>
                  </View>
                  <Text style={styles.priceEarnings}>
                    {formatMoney(netAfterCommissionMinor, shift.currency)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.priceEmpty}>
                Estimate unavailable for this schedule.
              </Text>
            )}
          </View>
          <Text style={styles.hint}>
            The organization pays you the full total. Bridge Hive invoices commission
            separately. Final amounts follow approved hours.
          </Text>
        </View>

        {shift.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Additional notes</Text>
            <Surface variant="subtle">
              <Text style={styles.notes}>{notesVisible}</Text>
              {notesLong ? (
                <Pressable
                  onPress={() => setNotesExpanded((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={notesExpanded ? 'Show less notes' : 'Show more notes'}
                  style={styles.notesToggle}
                >
                  <Text style={styles.notesToggleText}>
                    {notesExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              ) : null}
            </Surface>
          </View>
        ) : null}

        {assignment ? (
          <AssignmentTimeline status={assignment.status} shiftEnded={ended} />
        ) : null}

        {canSubmitCompletedHours(assignment?.status) && !ended ? (
          <Banner
            variant="info"
            title="Complete shift after the end time"
            body={`Submit completed hours after ${endLabel}. No invoice is created until the organization approves.`}
          />
        ) : null}

        {canComplete ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Completed hours</Text>
            <View style={styles.hoursCard}>
              <LinearGradient
                pointerEvents="none"
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hoursHero}
              >
                <View style={styles.hoursHeroTop}>
                  <View style={styles.hoursHeroIcon}>
                    <Ionicons name="time" size={16} color={colors.white} />
                  </View>
                  <View style={styles.hoursHeroCopy}>
                    <Text style={styles.hoursKicker}>Completed hours</Text>
                    <Text style={styles.hoursHeroTitle}>
                      {enteredMinutes != null
                        ? formatDurationMinutes(enteredMinutes)
                        : 'Enter time'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.hoursBody}>
                <View style={styles.hoursRow}>
                  <TextInput
                    label="Hours"
                    value={hoursText}
                    onChangeText={setHoursText}
                    keyboardType="number-pad"
                    containerStyle={styles.hoursField}
                  />
                  <TextInput
                    label="Minutes"
                    value={minutesText}
                    onChangeText={setMinutesText}
                    keyboardType="number-pad"
                    helpText="0–59"
                    containerStyle={styles.hoursField}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {!canClaim && claimBlockedReason ? (
          <Banner
            variant="warning"
            title="Claim unavailable"
            body={claimBlockedReason}
            actionLabel={
              !isVerified
                ? 'Continue account setup'
                : shift.status !== 'published'
                  ? 'View invoices'
                  : undefined
            }
            onAction={
              !isVerified
                ? () => router.push('/auth/worker/pending')
                : shift.status !== 'published'
                  ? () => router.push('/(tabs)/invoices')
                  : undefined
            }
          />
        ) : null}

        {actionError ? (
          <Banner
            variant="danger"
            title="Could not complete action"
            body={actionError}
            actionLabel={
              actionError.toLowerCase().includes('conflicts')
                ? 'Open My shifts'
                : undefined
            }
            onAction={
              actionError.toLowerCase().includes('conflicts')
                ? () => router.push('/(tabs)/work')
                : undefined
            }
          />
        ) : null}

        {actionSuccess ? (
          <Banner
            variant="success"
            title="Hours submitted successfully"
            body={actionSuccess}
            actionLabel="View My shifts"
            onAction={() => router.push('/(tabs)/work')}
          />
        ) : null}
      </ScrollView>

      {primaryAction ? (
        <StickyActionBar>
          <PremiumActionButton
            label={primaryAction.label}
            loading={primaryAction.loading}
            disabled={primaryAction.disabled}
            onPress={primaryAction.onPress}
            icon={
              primaryAction.label.includes('Submit')
                ? 'checkmark-circle-outline'
                : primaryAction.label.includes('Claim')
                  ? 'flash-outline'
                  : 'arrow-forward'
            }
          />
        </StickyActionBar>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  scrollSticky: {
    paddingBottom: spacing.huge,
  },
  titleBlock: {
    gap: 6,
  },
  orgEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  shiftTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.navy,
    letterSpacing: -0.4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.16)',
    ...shadows.md,
  },
  scheduleHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  scheduleEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  scheduleAccent: {
    height: 3,
    width: 36,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  scheduleHero: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  scheduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  scheduleIconTeal: {
    backgroundColor: colors.tealStrong,
  },
  scheduleChipText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  scheduleChipLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  scheduleChipValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  scheduleMeta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
  },
  metaRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  metaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  metaLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    width: 78,
  },
  metaValue: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.sm,
    color: colors.navy,
    letterSpacing: -0.1,
    paddingHorizontal: 2,
  },
  priceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceIconText: {
    fontFamily: typography.fonts.bold,
    fontSize: 18,
    color: colors.white,
  },
  priceHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  priceTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.tealStrong,
    letterSpacing: -0.2,
  },
  priceSubtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rateBadge: {
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rateBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  priceRows: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  priceLabelCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  priceLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  priceHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.2,
  },
  priceCommission: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  priceEarningsLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  priceEarnings: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    lineHeight: 26,
    color: colors.success,
    letterSpacing: -0.4,
  },
  priceEmpty: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  notes: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  notesToggle: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  notesToggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.tealStrong,
  },
  hoursCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.2)',
    ...shadows.md,
  },
  hoursHero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  hoursHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hoursHeroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  hoursHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hoursKicker: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  hoursHeroTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.white,
  },
  hoursStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  hoursStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  hoursStatDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  hoursStatLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  hoursStatValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.white,
  },
  hoursBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hoursField: {
    flex: 1,
  },
  hoursTools: {
    flexDirection: 'row',
    gap: 8,
  },
  hoursTool: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubdued,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  hoursToolAccent: {
    backgroundColor: colors.tealSoft,
    borderColor: 'rgba(20, 169, 181, 0.35)',
  },
  hoursToolPressed: {
    opacity: 0.88,
  },
  hoursToolText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  hoursToolTextAccent: {
    color: colors.tealStrong,
  },
  hoursHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
