import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ShiftCard } from '@/components/shifts/ShiftCard';
import {
  ShiftCalendarMonth,
  type DayShiftCounts,
} from '@/components/shifts/ShiftCalendarMonth';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  selectAvailableShifts,
  selectUpcomingShifts,
  useShiftStore,
} from '@/store/shiftStore';
import {
  addMonths,
  formatMonthYear,
  startOfMonth,
  toIsoDate,
} from '@/utils/calendar';
import { formatDate, parseLocalDate } from '@/utils/format';
import { sortShiftsByDate } from '@/utils/shiftFilters';

export default function ShiftsCalendarScreen() {
  const router = useRouter();
  const shifts = useShiftStore((s) => s.shifts);
  const memberId = useShiftStore((s) => s.activeMemberId);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedIso, setSelectedIso] = useState(() => toIsoDate(new Date()));

  const available = useMemo(() => selectAvailableShifts(shifts), [shifts]);
  const upcoming = useMemo(
    () => selectUpcomingShifts(shifts, memberId),
    [shifts, memberId],
  );

  const countsByDate = useMemo(() => {
    const map: Record<string, DayShiftCounts> = {};
    for (const shift of available) {
      const entry = map[shift.date] ?? { available: 0, booked: 0 };
      entry.available += 1;
      map[shift.date] = entry;
    }
    for (const shift of upcoming) {
      const entry = map[shift.date] ?? { available: 0, booked: 0 };
      entry.booked += 1;
      map[shift.date] = entry;
    }
    return map;
  }, [available, upcoming]);

  const dayAvailable = useMemo(
    () => sortShiftsByDate(available.filter((s) => s.date === selectedIso)),
    [available, selectedIso],
  );

  const dayBooked = useMemo(
    () => sortShiftsByDate(upcoming.filter((s) => s.date === selectedIso)),
    [upcoming, selectedIso],
  );

  const monthAvailableCount = useMemo(() => {
    const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    return available.filter((s) => s.date.startsWith(prefix)).length;
  }, [available, month]);

  const goToday = () => {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelectedIso(toIsoDate(now));
  };

  const selectDay = (iso: string) => {
    setSelectedIso(iso);
    const date = parseLocalDate(iso);
    if (
      date.getMonth() !== month.getMonth() ||
      date.getFullYear() !== month.getFullYear()
    ) {
      setMonth(startOfMonth(date));
    }
  };

  const dayCounts = countsByDate[selectedIso] ?? { available: 0, booked: 0 };

  return (
    <AppScreen>
      <ScreenHeader
        title="Shift calendar"
        showBack
        subtitle="Find & book shifts by day"
      />

      <ShiftCalendarMonth
        month={month}
        selectedIso={selectedIso}
        countsByDate={countsByDate}
        monthLabel={formatMonthYear(month)}
        onSelectDay={selectDay}
        onPrevMonth={() => setMonth((m) => addMonths(m, -1))}
        onNextMonth={() => setMonth((m) => addMonths(m, 1))}
        onToday={goToday}
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{monthAvailableCount}</Text>
          <Text style={styles.summaryLabel}>Open this month</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryAccent]}>
          <Text style={[styles.summaryValue, styles.summaryValueAccent]}>
            {dayCounts.available}
          </Text>
          <Text style={[styles.summaryLabel, styles.summaryLabelAccent]}>
            On selected day
          </Text>
        </View>
      </View>

      <Text style={styles.dayTitle}>{formatDate(selectedIso)}</Text>
      <Text style={styles.daySub}>
        {dayCounts.available > 0
          ? `${dayCounts.available} open shift${dayCounts.available === 1 ? '' : 's'} you can book`
          : 'No open shifts on this day — pick another date to book ahead'}
      </Text>

      {dayBooked.length > 0 ? (
        <View style={styles.bookedBanner}>
          <Text style={styles.bookedTitle}>Already on your schedule</Text>
          {dayBooked.map((shift) => (
            <ShiftCard
              key={`booked-${shift.id}`}
              shift={shift}
              showStatus
              ctaLabel="View Shift"
              onPress={() => router.push(`/shifts/${shift.id}`)}
            />
          ))}
        </View>
      ) : null}

      {dayAvailable.length === 0 ? (
        <EmptyState
          title="No available shifts"
          description="Swipe months or tap another day to find openings you can book in advance."
          icon="calendar-outline"
        />
      ) : (
        <View>
          {dayAvailable.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              showStatus={false}
              ctaLabel="View & book"
              onPress={() => router.push(`/shifts/${shift.id}`)}
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  summaryAccent: {
    backgroundColor: colors.navy,
  },
  summaryValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  summaryValueAccent: {
    color: colors.yellow,
  },
  summaryLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryLabelAccent: {
    color: 'rgba(255,255,255,0.65)',
  },
  dayTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.navy,
    marginBottom: 4,
  },
  daySub: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  bookedBanner: {
    marginBottom: spacing.md,
  },
  bookedTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: colors.navyLift,
    marginBottom: spacing.sm,
  },
});
