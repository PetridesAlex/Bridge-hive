import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  WEEKDAY_LABELS,
  buildMonthGrid,
  type CalendarDayCell,
} from '@/utils/calendar';

export type DayShiftCounts = {
  available: number;
  booked: number;
};

type Props = {
  month: Date;
  selectedIso: string;
  countsByDate: Record<string, DayShiftCounts>;
  onSelectDay: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  monthLabel: string;
};

function DayCell({
  cell,
  selected,
  counts,
  onPress,
}: {
  cell: CalendarDayCell;
  selected: boolean;
  counts?: DayShiftCounts;
  onPress: () => void;
}) {
  const available = counts?.available ?? 0;
  const booked = counts?.booked ?? 0;
  const hasShifts = available > 0 || booked > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${cell.iso}${available ? `, ${available} available` : ''}`}
      style={({ pressed }) => [
        styles.day,
        selected && styles.daySelected,
        cell.isToday && !selected && styles.dayToday,
        pressed && styles.dayPressed,
      ]}
    >
      <Text
        style={[
          styles.dayNum,
          !cell.inMonth && styles.dayNumMuted,
          selected && styles.dayNumSelected,
          cell.isToday && !selected && styles.dayNumToday,
        ]}
      >
        {cell.day}
      </Text>
      {(cell.inMonth || hasShifts) && hasShifts ? (
        <View style={styles.dots}>
          {available > 0 ? (
            <View style={[styles.dotAvailable, selected && styles.dotOnSelected]} />
          ) : null}
          {booked > 0 ? (
            <View style={[styles.dotBooked, selected && styles.dotBookedOnSelected]} />
          ) : null}
          {available > 1 ? (
            <Text style={[styles.dotCount, selected && styles.dotCountSelected]}>
              {available > 9 ? '9+' : available}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.dotsSpacer} />
      )}
    </Pressable>
  );
}

export function ShiftCalendarMonth({
  month,
  selectedIso,
  countsByDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  monthLabel,
}: Props) {
  const cells = useMemo(() => buildMonthGrid(month), [month]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Book in advance</Text>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>
        <View style={styles.nav}>
          <Pressable
            onPress={onToday}
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
          >
            <Text style={styles.todayLabel}>Today</Text>
          </Pressable>
          <Pressable
            onPress={onPrevMonth}
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={colors.yellow} />
          </Pressable>
          <Pressable
            onPress={onNextMonth}
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.yellow} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => (
          <DayCell
            key={cell.key}
            cell={cell}
            selected={cell.iso === selectedIso}
            counts={countsByDate[cell.iso]}
            onPress={() => onSelectDay(cell.iso)}
          />
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.dotAvailable} />
          <Text style={styles.legendText}>Available to book</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.dotBooked} />
          <Text style={styles.legendText}>On your schedule</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  month: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors.white,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.yellow,
  },
  todayLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 0.92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: 4,
    gap: 2,
  },
  daySelected: {
    backgroundColor: colors.yellow,
  },
  dayToday: {
    backgroundColor: 'rgba(245,176,0,0.14)',
  },
  dayPressed: {
    opacity: 0.9,
  },
  dayNum: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    color: colors.white,
  },
  dayNumMuted: {
    color: 'rgba(255,255,255,0.22)',
  },
  dayNumSelected: {
    color: colors.navy,
  },
  dayNumToday: {
    color: colors.yellow,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 10,
  },
  dotsSpacer: {
    minHeight: 10,
  },
  dotAvailable: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.yellow,
  },
  dotOnSelected: {
    backgroundColor: colors.navy,
  },
  dotBooked: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7EB6FF',
  },
  dotBookedOnSelected: {
    backgroundColor: colors.navyLift,
  },
  dotCount: {
    fontFamily: typography.fonts.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  dotCountSelected: {
    color: colors.navy,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
});
