import {
  commissionFromGross,
  DEFAULT_COMMISSION_RATE_BPS,
  estimatedWorkerShiftPayMinor,
  SHIFT_UNAVAILABLE_TITLE,
  shiftNotificationUrl,
} from '@bridge-hive/domain';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getCalendarPromptSeen,
  getCalendarSyncEnabled,
  setCalendarPromptSeen,
  setCalendarSyncEnabled,
} from '@/lib/calendar/mapping';
import {
  addShiftToCalendarManually,
  requestCalendarPermission,
  writeAcceptedShiftToCalendar,
} from '@/lib/calendar/sync';
import { useTranslation } from '@/i18n/locale-provider';

import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { ShiftPriceBreakdown } from '@/components/shifts/ShiftPriceBreakdown';
import { WorkplaceLocationCard } from '@/components/shifts/WorkplaceLocationCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { AssignmentTimeline } from '@/components/ui/AssignmentTimeline';
import { Ionicons } from '@expo/vector-icons';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PremiumActionButton } from '@/components/ui/PremiumActionButton';
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
import { getOrCreateConversation } from '@/lib/messaging';
import { getMyAssignments, getShiftById, type ShiftAssignment } from '@/lib/queries';
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
import { canClaimWithAvailability } from '@/lib/shift-availability';
import { clearPendingShiftRoute, peekPendingShiftRoute } from '@/lib/push/pending-shift';
import { useAuth } from '@/providers/AuthProvider';
import {
  formatDate,
  formatDurationMinutes,
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
        <Ionicons name={icon} size={15} color={colors.tealStrong} />
      </View>
      <View style={styles.metaCopy}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
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
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const { user, isVerified, isAppReviewDemo, canPerformLiveMarketplaceActions } =
    useAuth();
  const { t, language } = useTranslation();
  const [shift, setShift] = useState<WorkerShiftDetails | null>(null);
  const [assignment, setAssignment] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [messagingBusy, setMessagingBusy] = useState(false);
  const [successKind, setSuccessKind] = useState<'claim' | 'hours' | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [hoursText, setHoursText] = useState('0');
  const [minutesText, setMinutesText] = useState('0');
  const [hoursPrefillKey, setHoursPrefillKey] = useState<string | null>(null);
  const demoShift = isAppReviewDemo || isAppReviewDemoShiftId(id);
  const refreshRequestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!id) return;
    const currentRequest = ++refreshRequestId.current;
    setLoading(true);
    setError(undefined);

    if (isAppReviewDemo || isAppReviewDemoShiftId(id)) {
      const catalog = await fetchAppReviewDemoCatalog();
      if (currentRequest !== refreshRequestId.current) return;
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
    if (currentRequest !== refreshRequestId.current) return;
    if (detail.error || !detail.data) {
      setError(detail.error ?? 'Shift not found');
      setShift(null);
      setLoading(false);
      return;
    }
    setShift(detail.data);

    if (user?.id) {
      const mine = await getMyAssignments(user.id);
      if (currentRequest !== refreshRequestId.current) return;
      const match = mine.data.find((a) => a.shift_id === id) ?? null;
      setAssignment(match);
    }
    if (currentRequest === refreshRequestId.current) {
      setLoading(false);
    }
  }, [id, user?.id, isAppReviewDemo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
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
    setSuccessKind(null);
    const result = await claimShift(id);
    setClaiming(false);
    if (result.error) {
      const message = claimErrorMessage(result.error, shift?.required_role);
      setActionError(message);
      Alert.alert(t('shifts.claimFailedTitle'), message);
      void refresh();
      return;
    }
    setSuccessKind('claim');

    const assignmentId = result.data?.id;
    let calendarNote = '';
    if (user?.id && assignmentId && shift) {
      const calInput = {
        workerId: user.id,
        assignmentId,
        organizationName: shift.organization_name,
        startsAt: shift.starts_at,
        endsAt: shift.ends_at,
        location: [shift.ward_name, shift.location_name].filter(Boolean).join(' · ') || null,
        roleLabel: WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ?? null,
        locale: language,
        deepLink: shiftNotificationUrl(shift.shift_id),
      };
      const written = await writeAcceptedShiftToCalendar(calInput);
      if (written.ok) {
        calendarNote = t('calendar.addedToast');
      } else {
        const syncOn = await getCalendarSyncEnabled(user.id);
        const promptSeen = await getCalendarPromptSeen(user.id);
        if (!syncOn && !promptSeen) {
          await setCalendarPromptSeen(user.id);
          Alert.alert(t('calendar.softPromptTitle'), t('calendar.softPromptBody'), [
            { text: t('common.notNow'), style: 'cancel' },
            {
              text: t('calendar.enableSync'),
              onPress: () => {
                void (async () => {
                  const permission = await requestCalendarPermission();
                  if (permission !== 'granted') {
                    Alert.alert(t('calendar.permissionDeniedTitle'), t('calendar.permissionDeniedBody'), [
                      { text: t('common.ok') },
                      {
                        text: t('calendar.addManually'),
                        onPress: () => {
                          void addShiftToCalendarManually(calInput).then((manual) => {
                            if (manual.ok) {
                              setActionSuccess(t('calendar.addedToast'));
                            }
                          });
                        },
                      },
                    ]);
                    return;
                  }
                  await setCalendarSyncEnabled(user.id, true);
                  const again = await writeAcceptedShiftToCalendar(calInput);
                  if (again.ok) setActionSuccess(t('calendar.addedToast'));
                })();
              },
            },
          ]);
        } else if (!syncOn) {
          // Offer a non-blocking manual add when sync stays off.
          Alert.alert(t('shifts.claimedTitle'), t('shifts.claimedBody'), [
            { text: t('common.ok') },
            {
              text: t('calendar.addManually'),
              onPress: () => {
                void addShiftToCalendarManually(calInput).then((manual) => {
                  if (manual.ok) setActionSuccess(t('calendar.addedToast'));
                });
              },
            },
          ]);
          void refresh();
          return;
        }
      }
    }

    setActionSuccess(
      calendarNote
        ? `${t('shifts.claimedBody')} ${calendarNote}`
        : t('shifts.claimedBody'),
    );
    if (!calendarNote) {
      Alert.alert(t('shifts.claimedTitle'), t('shifts.claimedBody'));
    } else {
      Alert.alert(t('shifts.claimedTitle'), `${t('shifts.claimedBody')}\n${calendarNote}`);
    }
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
    setSuccessKind(null);
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
    setSuccessKind('hours');
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
  const requiredPositions = shift.required_positions ?? 1;
  const openPositionsKnown =
    shift.availability_known && typeof shift.open_positions === 'number';
  const openPositions = openPositionsKnown ? shift.open_positions : null;
  const availabilityUnavailable =
    !assignment &&
    shift.status === 'published' &&
    !openPositionsKnown;
  const canClaim = canClaimWithAvailability({
    liveActionsAllowed: canPerformLiveMarketplaceActions,
    shiftPublished: shift.status === 'published',
    alreadyAssigned: Boolean(assignment),
    availabilityKnown: openPositionsKnown,
    openPositions,
  });
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
          : availabilityUnavailable
            ? t('shifts.availabilityUnavailableBody')
            : openPositionsKnown && (openPositions ?? 0) < 1
              ? t('shifts.allPositionsFilled')
              : undefined;
  const positionsMetaValue = assignment
    ? t('shifts.youveAccepted')
    : availabilityUnavailable
      ? t('shifts.availabilityUnavailableShort')
      : shift.status === 'published' && openPositionsKnown && openPositions != null
        ? openPositions === 1
          ? t('shifts.onePositionOpen')
          : t('shifts.nPositionsOpen', { count: openPositions })
        : t('shifts.positionsTotal', { count: requiredPositions });

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
        label: claiming ? t('shifts.claiming') : t('shifts.claim'),
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
        contentContainerStyle={[styles.scroll, { paddingBottom: tabScrollInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {demoShift ? <AppReviewDemoBanner /> : null}
        <View style={styles.heroCard}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(11, 42, 67, 0.06)', 'rgba(20, 169, 181, 0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orgPill}>
            <View style={styles.orgDot} />
            <Text style={styles.orgEyebrow} numberOfLines={1}>
              {shift.organization_name}
            </Text>
          </View>
          <Text style={styles.shiftTitle}>{shift.title || roleLabel}</Text>
          <View style={styles.heroRule} />
          <View style={styles.badgeRow}>
            <StatusBadge label={roleLabel} tone="info" icon="medkit-outline" solid />
            {assignment ? (
              <StatusBadge
                label={t('shifts.youveAccepted')}
                tone="accent"
                icon="checkmark-circle-outline"
                solid
              />
            ) : openPositionsKnown && (openPositions ?? 0) > 0 ? (
              <StatusBadge
                label={t('shifts.open')}
                tone="accent"
                icon="calendar-outline"
                solid
              />
            ) : openPositionsKnown ? (
              <StatusBadge
                label={t('shifts.fullyBooked')}
                tone="neutral"
                icon="calendar-outline"
              />
            ) : (
              <StatusBadge
                label={t('shifts.availabilityChecking')}
                tone="neutral"
                icon="refresh-outline"
              />
            )}
          </View>
        </View>

        <View style={styles.scheduleCard}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(20, 169, 181, 0.07)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.55 }}
            style={styles.scheduleWash}
          />
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleHeaderIcon}>
              <Ionicons name="map" size={14} color={colors.white} />
            </View>
            <View style={styles.scheduleHeaderCopy}>
              <Text style={styles.scheduleEyebrow}>When & where</Text>
              <Text style={styles.scheduleHeaderHint}>Shift schedule and workplace</Text>
            </View>
          </View>

          <View style={styles.scheduleHero}>
            <View style={styles.scheduleChip}>
              <LinearGradient
                colors={[colors.navy, colors.navyLift]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.scheduleIconWrap}
              >
                <Ionicons name="calendar" size={16} color={colors.white} />
              </LinearGradient>
              <View style={styles.scheduleChipText}>
                <Text style={styles.scheduleChipLabel}>Date</Text>
                <Text style={styles.scheduleChipValue}>
                  {formatDate(shift.starts_at)}
                </Text>
              </View>
            </View>
            <View style={styles.scheduleChip}>
              <LinearGradient
                colors={[colors.tealStrong, '#0E7A8A']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.scheduleIconWrap}
              >
                <Ionicons name="time" size={16} color={colors.white} />
              </LinearGradient>
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
              label={t('shifts.positions')}
              value={positionsMetaValue}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Price overview</Text>
          <ShiftPriceBreakdown
            rateMinor={shift.rate_minor}
            currency={shift.currency}
            estimatedPayMinor={estimatedPayMinor}
            commissionMinor={commissionMinor}
            netMinor={netAfterCommissionMinor}
            commissionPercent={commissionPercent}
          />
          <View style={styles.payNote}>
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(11, 42, 67, 0.06)',
                'rgba(20, 169, 181, 0.10)',
                'rgba(224, 170, 24, 0.08)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={[colors.navy, '#0C3E56', colors.tealStrong]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.payNoteIcon}
            >
              <Ionicons name="shield-checkmark" size={15} color={colors.white} />
            </LinearGradient>
            <View style={styles.payNoteCopy}>
              <Text style={styles.payNoteEyebrow}>{t('payments.howPayWorks')}</Text>
              <View style={styles.payNoteRule} />
              <View style={styles.payNoteBullets} accessibilityRole="summary">
                {(
                  [
                    {
                      key: 'orgPays',
                      icon: 'wallet' as const,
                      text: t('payments.howPayWorksBullets.orgPays'),
                    },
                    {
                      key: 'commissionSeparate',
                      icon: 'receipt' as const,
                      text: t('payments.howPayWorksBullets.commissionSeparate'),
                    },
                    {
                      key: 'approvedHours',
                      icon: 'time' as const,
                      text: t('payments.howPayWorksBullets.approvedHours'),
                    },
                  ] as const
                ).map((item, index, list) => (
                  <View
                    key={item.key}
                    style={[
                      styles.payNoteBullet,
                      index < list.length - 1 && styles.payNoteBulletBorder,
                    ]}
                  >
                    <LinearGradient
                      colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.payNoteBulletMark}
                    >
                      <Ionicons name={item.icon} size={11} color={colors.white} />
                    </LinearGradient>
                    <Text style={styles.payNoteBulletText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <WorkplaceLocationCard
            locationName={shift.location_name}
            wardName={shift.ward_name}
            addressLine1={shift.location_address_line1}
            addressLine2={shift.location_address_line2}
            city={shift.location_city}
            postalCode={shift.location_postal_code}
            countryCode={shift.location_country_code}
            latitude={shift.location_latitude}
            longitude={shift.location_longitude}
          />
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

        {assignment?.status === 'approved' && !demoShift && user?.id ? (
          <View style={styles.section}>
            <PremiumActionButton
              label={t('messages.messageOrganization')}
              loading={messagingBusy}
              disabled={messagingBusy}
              icon="chatbubbles-outline"
              onPress={() => {
                void (async () => {
                  if (!id || !user.id || messagingBusy) return;
                  setMessagingBusy(true);
                  setActionError(undefined);
                  try {
                    const shiftRow = await getShiftById(id);
                    const organizationId = shiftRow.data?.organization_id;
                    if (!organizationId) {
                      setActionError(t('messages.loadError'));
                      return;
                    }
                    const created = await getOrCreateConversation(
                      organizationId,
                      user.id,
                    );
                    if (created.error || !created.data) {
                      setActionError(created.error ?? t('messages.loadError'));
                      return;
                    }
                    router.push(`/messages/${created.data.id}`);
                  } finally {
                    setMessagingBusy(false);
                  }
                })();
              }}
            />
          </View>
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
            {primaryAction && canComplete ? (
              <View style={styles.inlineAction}>
                <PremiumActionButton
                  label={primaryAction.label}
                  loading={primaryAction.loading}
                  disabled={primaryAction.disabled}
                  onPress={primaryAction.onPress}
                  icon="checkmark-circle-outline"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {!canClaim && claimBlockedReason ? (
          <Banner
            variant="warning"
            title={
              availabilityUnavailable
                ? t('shifts.availabilityUnavailableTitle')
                : 'Claim unavailable'
            }
            body={claimBlockedReason}
            actionLabel={
              availabilityUnavailable
                ? t('shifts.retryAvailability')
                : !isVerified
                  ? 'Continue account setup'
                  : shift.status !== 'published'
                    ? 'View invoices'
                    : undefined
            }
            onAction={
              availabilityUnavailable
                ? () => void refresh()
                : !isVerified
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
            title={
              successKind === 'claim'
                ? t('shifts.claimedTitle')
                : t('shifts.hoursSubmittedTitle')
            }
            body={actionSuccess}
            actionLabel="View My shifts"
            onAction={() => router.push('/(tabs)/work')}
          />
        ) : null}

        {primaryAction && canClaim ? (
          <View style={styles.inlineAction}>
            <PremiumActionButton
              label={primaryAction.label}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
              onPress={primaryAction.onPress}
              icon="flash-outline"
            />
          </View>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  inlineAction: {
    paddingTop: spacing.xs,
  },
  heroCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  orgPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
  },
  orgDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  orgEyebrow: {
    flexShrink: 1,
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  shiftTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    color: colors.navy,
    letterSpacing: -0.5,
  },
  heroRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.sm,
  },
  scheduleWash: {
    ...StyleSheet.absoluteFillObject,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.sm,
  },
  scheduleHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  scheduleHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  scheduleEyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  scheduleHeaderHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(11, 42, 67, 0.04)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  scheduleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scheduleChipText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  scheduleChipLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  scheduleChipValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.navy,
    letterSpacing: -0.25,
  },
  scheduleMeta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
    backgroundColor: 'rgba(11, 42, 67, 0.03)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  metaRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.07)',
  },
  metaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    flexShrink: 0,
  },
  metaCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  metaLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  metaValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.navy,
    letterSpacing: -0.1,
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
  payNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  payNoteIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  payNoteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  payNoteEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  payNoteRule: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
  },
  payNoteBullets: {
    gap: 0,
    marginTop: 2,
  },
  payNoteBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  payNoteBulletBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.08)',
  },
  payNoteBulletMark: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  payNoteBulletText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: colors.navySoft,
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
    ...shadows.sm,
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
