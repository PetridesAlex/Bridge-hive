import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  runOnJS,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { CalendarAgendaRow } from '@/components/shifts/CalendarAgendaRow';
import { CalendarLegend } from '@/components/shifts/CalendarLegend';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAssignments } from '@/hooks/useAssignments';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useShifts } from '@/hooks/useShifts';
import type { MarketplaceShift } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';
import {
  addMonths,
  buildMonthGrid,
  startOfMonth,
  toIsoDate,
} from '@/utils/calendar';
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

type Density = 'compact' | 'stacked' | 'list';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const OPEN = colors.yellow;
const BOOKED = colors.tealStrong;
/** Today accent — Bridge Hive honey (not Apple red). */
const TODAY = colors.yellow;
const TODAY_SOFT = 'rgba(224, 170, 24, 0.16)';
const TODAY_INK = colors.navy;

function shiftsByDate(shifts: MarketplaceShift[]): Map<string, MarketplaceShift[]> {
  const map = new Map<string, MarketplaceShift[]>();
  for (const shift of shifts) {
    const key = isoDateFromTimestamp(shift.starts_at);
    const list = map.get(key) ?? [];
    list.push(shift);
    map.set(key, list);
  }
  return map;
}

function bookedByDate(
  assignments: { status: string; shifts?: { starts_at?: string | null } | null }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of assignments) {
    if (!['accepted', 'checked_in', 'checked_out', 'submitted', 'approved'].includes(a.status)) {
      continue;
    }
    const start = a.shifts?.starts_at;
    if (!start) continue;
    const key = isoDateFromTimestamp(start);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

const DENSITY_META: Record<
  Density,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  compact: { label: 'Compact', icon: 'grid-outline' },
  stacked: { label: 'Stacked', icon: 'menu' },
  list: { label: 'List', icon: 'list' },
};

export default function ShiftCalendarScreen() {
  const { user } = useAuth();
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const { shifts, loading, error, refresh, workerRole } = useShifts();
  const { assignments, refresh: refreshAssignments } = useAssignments(user?.id);
  const reduced = useReducedMotion();
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedIso, setSelectedIso] = useState<string | null>(() => toIsoDate(new Date()));
  const [density, setDensity] = useState<Density>('list');
  const dragX = useSharedValue(0);

  const todayIso = toIsoDate(new Date());
  const viewingCurrentMonth =
    monthCursor.getFullYear() === new Date().getFullYear() &&
    monthCursor.getMonth() === new Date().getMonth();
  const monthName = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(monthCursor),
    [monthCursor],
  );
  const monthYear = String(monthCursor.getFullYear());
  const densityMeta = DENSITY_META[density];
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const byDate = useMemo(() => shiftsByDate(shifts), [shifts]);
  const bookedMap = useMemo(() => bookedByDate(assignments), [assignments]);

  const monthShiftCount = useMemo(() => {
    let count = 0;
    for (const [iso, list] of byDate) {
      const d = new Date(`${iso}T12:00:00`);
      if (
        d.getFullYear() === monthCursor.getFullYear() &&
        d.getMonth() === monthCursor.getMonth()
      ) {
        count += list.length;
      }
    }
    return count;
  }, [byDate, monthCursor]);

  const monthBookedCount = useMemo(() => {
    let count = 0;
    for (const [iso, n] of bookedMap) {
      const d = new Date(`${iso}T12:00:00`);
      if (
        d.getFullYear() === monthCursor.getFullYear() &&
        d.getMonth() === monthCursor.getMonth()
      ) {
        count += n;
      }
    }
    return count;
  }, [bookedMap, monthCursor]);

  const nextOpenIso = useMemo(() => {
    const month = monthCursor.getMonth();
    const year = monthCursor.getFullYear();
    const dates = [...byDate.keys()]
      .filter((iso) => {
        const d = new Date(`${iso}T12:00:00`);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort();
    return dates[0] ?? null;
  }, [byDate, monthCursor]);

  const nextBookedIso = useMemo(() => {
    const month = monthCursor.getMonth();
    const year = monthCursor.getFullYear();
    const dates = [...bookedMap.keys()]
      .filter((iso) => {
        const d = new Date(`${iso}T12:00:00`);
        return (
          d.getFullYear() === year &&
          d.getMonth() === month &&
          (bookedMap.get(iso) ?? 0) > 0
        );
      })
      .sort();
    return dates[0] ?? null;
  }, [bookedMap, monthCursor]);

  const selectedOpens = useMemo(() => {
    if (!selectedIso) return [];
    return byDate.get(selectedIso) ?? [];
  }, [byDate, selectedIso]);

  const selectedBooked = useMemo(() => {
    if (!selectedIso) return 0;
    return bookedMap.get(selectedIso) ?? 0;
  }, [bookedMap, selectedIso]);

  const roleLabel =
    workerRole && workerRole in WORKER_ROLE_LABELS
      ? WORKER_ROLE_LABELS[workerRole as keyof typeof WORKER_ROLE_LABELS]
      : 'your role';

  const moveMonth = (delta: number) => {
    const next = addMonths(monthCursor, delta);
    setMonthCursor(next);
    const stillVisible =
      selectedIso &&
      (() => {
        const d = new Date(`${selectedIso}T12:00:00`);
        return (
          d.getFullYear() === next.getFullYear() && d.getMonth() === next.getMonth()
        );
      })();
    if (!stillVisible) {
      const today = new Date();
      if (
        today.getFullYear() === next.getFullYear() &&
        today.getMonth() === next.getMonth()
      ) {
        setSelectedIso(toIsoDate(today));
      } else {
        setSelectedIso(toIsoDate(next));
      }
    }
  };

  const selectDay = (iso: string, inMonth: boolean) => {
    if (!inMonth) {
      const d = new Date(`${iso}T12:00:00`);
      setMonthCursor(startOfMonth(d));
    }
    setSelectedIso(iso);
  };

  const goToday = () => {
    const now = new Date();
    setMonthCursor(startOfMonth(now));
    setSelectedIso(toIsoDate(now));
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      dragX.value = e.translationX * 0.35;
    })
    .onEnd((e) => {
      const shouldFlip = Math.abs(e.translationX) > 64 || Math.abs(e.velocityX) > 700;
      if (shouldFlip) {
        runOnJS(moveMonth)(e.translationX < 0 ? 1 : -1);
      }
      dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const densifyCycle = () => {
    setDensity((prev) =>
      prev === 'compact' ? 'stacked' : prev === 'stacked' ? 'list' : 'compact',
    );
  };

  const onRefreshAll = () => {
    void refresh();
    void refreshAssignments();
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabScrollInset }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Calendar"
          showBack
          subtitle={`Open ${roleLabel} shifts and your booked work.`}
          titleSize="detail"
        />

        {error ? (
          <EmptyState
            title="Could not load calendar"
            description={error}
            actionLabel="Retry"
            onAction={onRefreshAll}
          />
        ) : (
          <>
            <View style={styles.calendarShell}>
              <Animated.View
                entering={
                  reduced
                    ? undefined
                    : FadeInDown.duration(380).springify().damping(18)
                }
                style={styles.monthChrome}
              >
                <View style={styles.monthTitleBlock}>
                  <View style={styles.monthTitleRow}>
                    <Text style={styles.monthTitle} numberOfLines={1}>
                      {monthName}
                    </Text>
                    <Text style={styles.monthYear}>{monthYear}</Text>
                  </View>
                  <View style={styles.monthStatRow}>
                    <View
                      style={[
                        styles.monthStat,
                        monthShiftCount > 0 && styles.monthStatOpen,
                      ]}
                    >
                      <View
                        style={[
                          styles.monthStatDot,
                          { backgroundColor: OPEN },
                        ]}
                      />
                      <Text style={styles.monthStatText}>
                        {monthShiftCount === 0
                          ? 'No open'
                          : `${monthShiftCount} open`}
                      </Text>
                    </View>
                    {monthBookedCount > 0 ? (
                      <View style={[styles.monthStat, styles.monthStatBooked]}>
                        <View
                          style={[
                            styles.monthStatDot,
                            { backgroundColor: BOOKED },
                          ]}
                        />
                        <Text style={[styles.monthStatText, styles.monthStatBookedText]}>
                          {monthBookedCount} booked
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.monthActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Calendar density: ${densityMeta.label}. Tap to change.`}
                    onPress={densifyCycle}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.densityChip,
                      pressed && styles.controlPressed,
                    ]}
                  >
                    <Ionicons
                      name={densityMeta.icon}
                      size={15}
                      color={colors.navy}
                    />
                    <Text style={styles.densityChipText}>{densityMeta.label}</Text>
                  </Pressable>

                  <View style={styles.navGroup}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Previous month"
                      onPress={() => moveMonth(-1)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.navBtn,
                        pressed && styles.controlPressed,
                      ]}
                    >
                      <Ionicons name="chevron-back" size={18} color={colors.navy} />
                    </Pressable>
                    <View style={styles.navDivider} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Next month"
                      onPress={() => moveMonth(1)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.navBtn,
                        pressed && styles.controlPressed,
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.navy}
                      />
                    </Pressable>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Jump to today"
                    accessibilityState={{ disabled: viewingCurrentMonth && selectedIso === todayIso }}
                    onPress={goToday}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.todayChip,
                      viewingCurrentMonth &&
                        selectedIso === todayIso &&
                        styles.todayChipActive,
                      pressed && styles.controlPressed,
                    ]}
                  >
                    {viewingCurrentMonth && selectedIso === todayIso ? (
                      <LinearGradient
                        colors={['#F0C14B', '#E0AA18']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    ) : (
                      <LinearGradient
                        colors={['rgba(240, 193, 75, 0.22)', 'rgba(224, 170, 24, 0.12)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    )}
                    <Ionicons
                      name="sunny"
                      size={13}
                      color={TODAY_INK}
                    />
                    <Text style={styles.todayChipText}>Today</Text>
                  </Pressable>
                </View>
              </Animated.View>

              <GestureDetector gesture={pan}>
                <Animated.View style={styles.monthBody}>
                  <View style={styles.dowRow}>
                    {DOW.map((label, i) => (
                      <Text
                        key={`${label}-${i}`}
                        style={[styles.dow, i >= 5 && styles.dowWeekend]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.grid}>
                    {cells.map((cell) => {
                      const opens = cell.inMonth ? byDate.get(cell.iso) ?? [] : [];
                      const booked = cell.inMonth ? bookedMap.get(cell.iso) ?? 0 : 0;
                      const openCount = opens.length;
                      const selected = selectedIso === cell.iso;
                      const isToday = cell.iso === todayIso;
                      const hasEvents = openCount > 0 || booked > 0;

                      return (
                        <Pressable
                          key={cell.key}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${cell.day}${openCount ? `, ${openCount} open` : ''}${booked ? `, ${booked} booked` : ''}`}
                          onPress={() => selectDay(cell.iso, cell.inMonth)}
                          style={styles.cell}
                        >
                          <View
                            style={[
                              styles.dayBubble,
                              isToday && !selected && styles.dayBubbleToday,
                              selected && styles.dayBubbleSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNum,
                                !cell.inMonth && styles.dayMuted,
                                isToday && !selected && styles.dayTodayText,
                                selected && styles.daySelectedText,
                              ]}
                            >
                              {cell.day}
                            </Text>
                          </View>

                          {density === 'compact' ? (
                            <View style={styles.dotRow}>
                              {openCount > 0 ? <View style={[styles.dot, { backgroundColor: OPEN }]} /> : null}
                              {booked > 0 ? <View style={[styles.dot, { backgroundColor: BOOKED }]} /> : null}
                              {!hasEvents ? <View style={styles.dotSpacer} /> : null}
                            </View>
                          ) : density === 'stacked' ? (
                            <View style={styles.stackBars}>
                              {openCount > 0 ? (
                                <View style={[styles.stackBar, { backgroundColor: OPEN }]} />
                              ) : null}
                              {booked > 0 ? (
                                <View style={[styles.stackBar, { backgroundColor: BOOKED }]} />
                              ) : null}
                              {!hasEvents ? <View style={styles.stackSpacer} /> : null}
                            </View>
                          ) : (
                            <View style={styles.dotRow}>
                              {openCount > 0 ? <View style={[styles.dot, { backgroundColor: OPEN }]} /> : null}
                              {booked > 0 ? <View style={[styles.dot, { backgroundColor: BOOKED }]} /> : null}
                              {!hasEvents ? <View style={styles.dotSpacer} /> : null}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>
              </GestureDetector>

              <CalendarLegend
                motionKey={`${monthCursor.getFullYear()}-${monthCursor.getMonth()}`}
                openCount={monthShiftCount}
                bookedCount={monthBookedCount}
                todayActive={selectedIso === todayIso}
                openActive={selectedOpens.length > 0}
                bookedActive={selectedBooked > 0}
                onPressOpen={() => {
                  if (nextOpenIso) selectDay(nextOpenIso, true);
                }}
                onPressBooked={() => {
                  if (nextBookedIso) selectDay(nextBookedIso, true);
                }}
                onPressToday={goToday}
              />
            </View>

            {/* List / agenda for selected day — iPhone Calendar list mode */}
            <View style={styles.agenda}>
              <View style={styles.agendaHeader}>
                <Text style={styles.agendaTitle}>
                  {selectedIso ? formatDayLabel(selectedIso) : 'Select a day'}
                </Text>
                {selectedIso === todayIso ? (
                  <View style={styles.agendaTodayPill}>
                    <Text style={styles.agendaTodayText}>Today</Text>
                  </View>
                ) : null}
              </View>

              {selectedIso && selectedOpens.length === 0 && selectedBooked === 0 ? (
                <View style={styles.agendaEmpty}>
                  <Text style={styles.agendaEmptyText}>No shifts on this day</Text>
                </View>
              ) : null}

              {selectedBooked > 0 ? (
                <CalendarAgendaRow
                  key={`booked-${selectedIso}-${selectedBooked}`}
                  tone="booked"
                  live={selectedIso === todayIso}
                  enterDelay={40}
                  eyebrow={`${selectedBooked} booked`}
                  title={
                    selectedBooked === 1 ? 'Your booked shift' : 'Your booked shifts'
                  }
                  subtitle="Open My shifts to review schedule, check-in, and submit hours."
                  accessibilityLabel="View my shifts"
                  onPress={() => router.push('/(tabs)/work')}
                />
              ) : null}

              {selectedOpens.map((shift, index) => {
                const roleTitle =
                  shift.title?.trim() ||
                  WORKER_ROLE_LABELS[
                    shift.required_role as keyof typeof WORKER_ROLE_LABELS
                  ] ||
                  shift.required_role;
                const place = [
                  shift.location_name?.trim() || 'Location not listed',
                  shift.ward_name?.trim() || null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                const rate = `${formatMoney(shift.rate_minor, shift.currency)}/hr`;

                return (
                  <CalendarAgendaRow
                    key={`${selectedIso}-${shift.id}`}
                    tone="open"
                    live={selectedIso === todayIso}
                    enterDelay={80 + index * 55}
                    eyebrow={formatTimeRange(shift.starts_at, shift.ends_at)}
                    title={roleTitle}
                    subtitle={place}
                    metaChip={rate}
                    accessibilityLabel={shift.title ?? 'Open shift'}
                    onPress={() => router.push(`/shifts/${shift.id}`)}
                  />
                );
              })}
            </View>
          </>
        )}

        {loading ? <Text style={styles.loading}>Refreshing…</Text> : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  calendarShell: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
  monthChrome: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 0,
  },
  monthTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
    color: colors.navy,
  },
  monthYear: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: 'rgba(11, 42, 67, 0.42)',
  },
  monthStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
  },
  monthStatOpen: {
    backgroundColor: 'rgba(224, 170, 24, 0.12)',
    borderColor: 'rgba(224, 170, 24, 0.32)',
  },
  monthStatBooked: {
    backgroundColor: 'rgba(20, 169, 181, 0.10)',
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  monthStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthStatText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  monthStatBookedText: {
    color: '#0E7A8A',
  },
  monthActions: {
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 2,
  },
  densityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
  },
  densityChipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    overflow: 'hidden',
  },
  navBtn: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: 'rgba(11, 42, 67, 0.16)',
  },
  controlPressed: {
    opacity: 0.62,
  },
  todayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 170, 24, 0.42)',
  },
  todayChipActive: {
    borderColor: 'rgba(176, 130, 12, 0.55)',
  },
  todayChipText: {
    fontFamily: typography.fonts.bold,
    fontSize: 13,
    letterSpacing: -0.15,
    color: TODAY_INK,
  },
  monthBody: {
    paddingHorizontal: spacing.sm,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  dowWeekend: {
    color: colors.tealStrong,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
    minHeight: 52,
  },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleToday: {
    backgroundColor: TODAY,
  },
  dayBubbleSelected: {
    backgroundColor: colors.navy,
  },
  dayNum: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    color: colors.text,
  },
  dayMuted: {
    color: colors.textMuted,
  },
  dayTodayText: {
    color: colors.navy,
    fontFamily: typography.fonts.bold,
  },
  daySelectedText: {
    color: colors.white,
    fontFamily: typography.fonts.semibold,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotSpacer: {
    height: 6,
    width: 5,
  },
  stackBars: {
    width: '70%',
    gap: 2,
    minHeight: 8,
    justifyContent: 'center',
  },
  stackBar: {
    height: 3,
    borderRadius: 1.5,
    width: '100%',
  },
  stackSpacer: {
    height: 8,
  },
  agenda: {
    gap: spacing.sm,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  agendaTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  agendaTodayPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: TODAY_SOFT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 170, 24, 0.4)',
  },
  agendaTodayText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: TODAY_INK,
  },
  agendaEmpty: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
  },
  agendaEmptyText: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loading: {
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
