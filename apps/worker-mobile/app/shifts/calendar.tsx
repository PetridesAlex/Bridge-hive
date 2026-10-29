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

import { ShiftCard } from '@/components/shifts/ShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroupSeparator } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useShifts } from '@/hooks/useShifts';
import type { MarketplaceShift } from '@/lib/queries';
import {
  WEEKDAY_LABELS,
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

export default function ShiftCalendarScreen() {
  const { shifts, loading, error, refresh, workerRole } = useShifts();
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedIso, setSelectedIso] = useState<string | null>(() => toIsoDate(new Date()));

  const todayIso = toIsoDate(new Date());
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const byDate = useMemo(() => shiftsByDate(shifts), [shifts]);

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

  const selectedShifts = useMemo(() => {
    if (!selectedIso) return [];
    return byDate.get(selectedIso) ?? [];
  }, [byDate, selectedIso]);

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
    if (!stillVisible) setSelectedIso(null);
  };

  const goToday = () => {
    const now = new Date();
    setMonthCursor(startOfMonth(now));
    setSelectedIso(toIsoDate(now));
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Shift calendar"
          showBack
          subtitle={`Browse open ${roleLabel} shifts by month. Tap a day for details.`}
          titleSize="detail"
        />

        {error ? (
          <EmptyState
            title="Could not load calendar"
            description={error}
            actionLabel="Retry"
            onAction={refresh}
          />
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.hero}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.monthNav}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    onPress={() => moveMonth(-1)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.navBtn, pressed && styles.navPressed]}
                  >
                    <Ionicons name="chevron-back" size={22} color={colors.white} />
                  </Pressable>
                  <View style={styles.monthHeading}>
                    <Text style={styles.kicker}>Month view</Text>
                    <Text style={styles.monthTitle}>{formatMonthYear(monthCursor)}</Text>
                    <Text style={styles.monthSummary}>
                      {monthShiftCount === 0
                        ? 'No open shifts this month'
                        : `${monthShiftCount} open shift${monthShiftCount === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    onPress={() => moveMonth(1)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.navBtn, pressed && styles.navPressed]}
                  >
                    <Ionicons name="chevron-forward" size={22} color={colors.white} />
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Jump to today"
                  onPress={goToday}
                  style={({ pressed }) => [styles.todayBtn, pressed && styles.navPressed]}
                >
                  <Ionicons name="today-outline" size={14} color={colors.white} />
                  <Text style={styles.todayText}>Today</Text>
                </Pressable>
              </View>

              <View style={styles.body}>
                <View style={styles.dowRow}>
                  {WEEKDAY_LABELS.map((label) => (
                    <Text key={label} style={styles.dow}>
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {cells.map((cell) => {
                    const dayShifts = cell.inMonth ? byDate.get(cell.iso) ?? [] : [];
                    const count = dayShifts.length;
                    const selected = selectedIso === cell.iso;
                    const isToday = cell.iso === todayIso;
                    return (
                      <Pressable
                        key={cell.key}
                        disabled={!cell.inMonth}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled: !cell.inMonth }}
                        accessibilityLabel={`${cell.day}${count ? `, ${count} open` : ''}`}
                        onPress={() =>
                          setSelectedIso((prev) => (prev === cell.iso ? null : cell.iso))
                        }
                        style={[
                          styles.cell,
                          !cell.inMonth && styles.cellMuted,
                          isToday && !selected && styles.cellToday,
                          selected && styles.cellSelected,
                          count > 0 && !selected && styles.cellHasShifts,
                        ]}
                      >
                        {selected ? (
                          <LinearGradient
                            pointerEvents="none"
                            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.dayNum,
                            !cell.inMonth && styles.dayMuted,
                            selected && styles.daySelected,
                            count > 0 && !selected && styles.dayHasShifts,
                          ]}
                        >
                          {cell.day}
                        </Text>
                        {count > 0 ? (
                          <View style={styles.dots}>
                            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                              <View
                                key={i}
                                style={[styles.dot, selected && styles.dotSelected]}
                              />
                            ))}
                          </View>
                        ) : (
                          <View style={styles.dotsSpacer} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSwatch, styles.legendOpen]} />
                    <Text style={styles.legendText}>Open to claim</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSwatch, styles.legendToday]} />
                    <Text style={styles.legendText}>Today</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.daySection}>
              <Text style={styles.daySectionTitle}>
                {selectedIso
                  ? formatDayLabel(selectedIso)
                  : 'Select a day'}
              </Text>
              <Text style={styles.daySectionSub}>
                {selectedIso
                  ? selectedShifts.length === 0
                    ? 'No open shifts on this day.'
                    : `${selectedShifts.length} open shift${selectedShifts.length === 1 ? '' : 's'} available`
                  : 'Tap a highlighted day to review open shifts.'}
              </Text>

              {selectedIso && selectedShifts.length > 0 ? (
                <View style={styles.cardStack}>
                  {selectedShifts.map((shift) => (
                    <React.Fragment key={shift.id}>
                      <ShiftCard
                        shift={shift}
                        organizationName={shift.organization_name ?? undefined}
                        locationName={
                          [shift.location_name, shift.ward_name]
                            .filter(Boolean)
                            .join(' · ') || undefined
                        }
                        onPress={() => router.push(`/shifts/${shift.id}`)}
                      />
                    </React.Fragment>
                  ))}
                </View>
              ) : selectedIso && selectedShifts.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Ionicons name="calendar-outline" size={22} color={colors.tealStrong} />
                  <Text style={styles.emptyDayText}>
                    Nothing open on {formatDayLabel(selectedIso)}. Try another day or
                    month.
                  </Text>
                </View>
              ) : null}
            </View>

            {!selectedIso && monthShiftCount > 0 ? (
              <View style={styles.upcoming}>
                <Text style={styles.daySectionTitle}>Coming up this month</Text>
                <Text style={styles.daySectionSub}>
                  Next open shifts in {formatMonthYear(monthCursor)}.
                </Text>
                <View style={styles.listCard}>
                  {shifts
                    .filter((s) => {
                      const d = new Date(s.starts_at);
                      return (
                        d.getFullYear() === monthCursor.getFullYear() &&
                        d.getMonth() === monthCursor.getMonth()
                      );
                    })
                    .slice(0, 5)
                    .map((shift, index) => (
                      <React.Fragment key={shift.id}>
                        {index > 0 ? <ListGroupSeparator /> : null}
                        <Pressable
                          style={styles.compactRow}
                          onPress={() => router.push(`/shifts/${shift.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={shift.title ?? 'Open shift'}
                        >
                          <View style={styles.compactDate}>
                            <Text style={styles.compactDay}>
                              {new Date(shift.starts_at).getDate()}
                            </Text>
                          </View>
                          <View style={styles.compactMain}>
                            <Text style={styles.compactTitle} numberOfLines={1}>
                              {shift.title?.trim() ||
                                WORKER_ROLE_LABELS[
                                  shift.required_role as keyof typeof WORKER_ROLE_LABELS
                                ] ||
                                shift.required_role}
                            </Text>
                            <View style={styles.compactMetaRow}>
                              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                              <Text style={styles.compactMeta} numberOfLines={1}>
                                {formatTimeRange(shift.starts_at, shift.ends_at)}
                              </Text>
                            </View>
                            <View style={styles.compactMetaRow}>
                              <Ionicons name="location" size={12} color={colors.tealStrong} />
                              <Text style={styles.compactLocation} numberOfLines={1}>
                                {shift.location_name?.trim() || 'Location not listed'}
                                {shift.ward_name ? ` · ${shift.ward_name}` : ''}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.compactRate}>
                            {formatMoney(shift.rate_minor, shift.currency)}/hr
                          </Text>
                        </Pressable>
                      </React.Fragment>
                    ))}
                </View>
              </View>
            ) : null}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.2)',
    overflow: 'hidden',
    ...shadows.lg,
  },
  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  navPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    transform: [{ scale: 0.96 }],
  },
  monthHeading: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  kicker: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  monthTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.3,
  },
  monthSummary: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.78)',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  todayText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.white,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.card,
  },
  dowRow: {
    flexDirection: 'row',
  },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.tealStrong,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: 4,
    gap: 2,
    overflow: 'hidden',
  },
  cellMuted: {
    opacity: 0.28,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.tealStrong,
  },
  cellHasShifts: {
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.35)',
  },
  cellSelected: {
    borderColor: 'transparent',
  },
  dayNum: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  dayMuted: {
    color: colors.textMuted,
  },
  dayHasShifts: {
    color: colors.tealStrong,
    fontFamily: typography.fonts.bold,
  },
  daySelected: {
    color: colors.white,
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
    alignItems: 'center',
  },
  dotsSpacer: {
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  dotSelected: {
    backgroundColor: colors.white,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendOpen: {
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealStrong,
  },
  legendToday: {
    borderWidth: 1.5,
    borderColor: colors.tealStrong,
    backgroundColor: colors.white,
  },
  legendText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  daySection: {
    gap: spacing.sm,
  },
  daySectionTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  daySectionSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  cardStack: {
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  listCard: {
    marginTop: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.14)',
    overflow: 'hidden',
    ...shadows.sm,
  },
  emptyDay: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyDayText: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  upcoming: {
    gap: spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  compactDate: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  compactDay: {
    fontFamily: typography.fonts.bold,
    fontSize: 16,
    color: colors.tealStrong,
  },
  compactMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMeta: {
    flexShrink: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  compactLocation: {
    flexShrink: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.tealStrong,
  },
  compactRate: {
    fontFamily: typography.fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  loading: {
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
