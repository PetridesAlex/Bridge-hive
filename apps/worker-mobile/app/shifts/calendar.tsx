import { Ionicons } from '@expo/vector-icons';
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
  runOnJS,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAssignments } from '@/hooks/useAssignments';
import { useShifts } from '@/hooks/useShifts';
import type { MarketplaceShift } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
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

export default function ShiftCalendarScreen() {
  const { user } = useAuth();
  const { shifts, loading, error, refresh, workerRole } = useShifts();
  const { assignments, refresh: refreshAssignments } = useAssignments(user?.id);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedIso, setSelectedIso] = useState<string | null>(() => toIsoDate(new Date()));
  const [density, setDensity] = useState<Density>('list');
  const dragX = useSharedValue(0);

  const todayIso = toIsoDate(new Date());
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
        contentContainerStyle={styles.scroll}
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
              {/* iPhone-style month chrome */}
              <View style={styles.monthChrome}>
                <View style={styles.monthTitleBlock}>
                  <Text style={styles.monthTitle}>{formatMonthYear(monthCursor)}</Text>
                  <Text style={styles.monthMeta}>
                    {monthShiftCount === 0
                      ? 'No open shifts'
                      : `${monthShiftCount} open`}
                    {density === 'list' ? ' · List' : density === 'stacked' ? ' · Stacked' : ' · Compact'}
                  </Text>
                </View>
                <View style={styles.monthActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change calendar density"
                    onPress={densifyCycle}
                    hitSlop={8}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  >
                    <Ionicons
                      name={
                        density === 'list'
                          ? 'list'
                          : density === 'stacked'
                            ? 'menu'
                            : 'grid-outline'
                      }
                      size={20}
                      color={colors.navy}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    onPress={() => moveMonth(-1)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  >
                    <Ionicons name="chevron-back" size={22} color={colors.navy} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    onPress={() => moveMonth(1)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  >
                    <Ionicons name="chevron-forward" size={22} color={colors.navy} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Jump to today"
                    onPress={goToday}
                    hitSlop={8}
                    style={({ pressed }) => [styles.todayChip, pressed && styles.iconBtnPressed]}
                  >
                    <Text style={styles.todayChipText}>Today</Text>
                  </Pressable>
                </View>
              </View>

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

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: OPEN }]} />
                  <Text style={styles.legendText}>Open</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BOOKED }]} />
                  <Text style={styles.legendText}>Booked</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendToday} />
                  <Text style={styles.legendText}>Today</Text>
                </View>
              </View>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View my shifts"
                  onPress={() => router.push('/(tabs)/work')}
                  style={styles.agendaRow}
                >
                  <View style={[styles.agendaRail, { backgroundColor: BOOKED }]} />
                  <View style={styles.agendaCopy}>
                    <Text style={styles.agendaRowTitle}>
                      {selectedBooked} booked shift{selectedBooked === 1 ? '' : 's'}
                    </Text>
                    <Text style={styles.agendaRowSub}>View in My shifts</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}

              {selectedOpens.map((shift) => (
                <Pressable
                  key={shift.id}
                  accessibilityRole="button"
                  accessibilityLabel={shift.title ?? 'Open shift'}
                  onPress={() => router.push(`/shifts/${shift.id}`)}
                  style={styles.agendaRow}
                >
                  <View style={[styles.agendaRail, { backgroundColor: OPEN }]} />
                  <View style={styles.agendaCopy}>
                    <Text style={styles.agendaTime}>
                      {formatTimeRange(shift.starts_at, shift.ends_at)}
                    </Text>
                    <Text style={styles.agendaRowTitle} numberOfLines={1}>
                      {shift.title?.trim() ||
                        WORKER_ROLE_LABELS[
                          shift.required_role as keyof typeof WORKER_ROLE_LABELS
                        ] ||
                        shift.required_role}
                    </Text>
                    <Text style={styles.agendaRowSub} numberOfLines={1}>
                      {shift.location_name?.trim() || 'Location not listed'}
                      {shift.ward_name ? ` · ${shift.ward_name}` : ''}
                      {' · '}
                      {formatMoney(shift.rate_minor, shift.currency)}/hr
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
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
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
  monthChrome: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.sm,
  },
  monthTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  monthTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: colors.navy,
  },
  monthMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  monthActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    opacity: 0.55,
  },
  todayChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TODAY_SOFT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 170, 24, 0.45)',
  },
  todayChipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendToday: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TODAY,
  },
  legendText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
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
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    overflow: 'hidden',
  },
  agendaRail: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginVertical: 4,
  },
  agendaCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  agendaTime: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  agendaRowTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  agendaRowSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  loading: {
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
