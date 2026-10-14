import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { isoDateFromTimestamp, parseLocalDate } from '@/utils/format';

type Props = {
  selectedIso: string | null;
  workDates: string[];
  openDates: string[];
  onSelect: (isoDate: string | null) => void;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayIso(): string {
  return isoDateFromTimestamp(new Date().toISOString());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mondayOf(iso: string): Date {
  const date = parseLocalDate(iso);
  const dow = date.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(date, diff);
}

function counts(dates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const date of dates) map.set(date, (map.get(date) ?? 0) + 1);
  return map;
}

function rangeTitle(start: Date, offset: number): string {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  if (offset === -1) return 'Last week';
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    const month = end.toLocaleDateString('en-CY', { month: 'long' });
    return `${start.getDate()}–${end.getDate()} ${month}`;
  }
  const left = start.toLocaleDateString('en-CY', { day: 'numeric', month: 'short' });
  const right = end.toLocaleDateString('en-CY', { day: 'numeric', month: 'short' });
  return `${left} – ${right}`;
}

/** Week calendar for booked work and open marketplace shifts. */
export function ShiftCalendar({ selectedIso, workDates, openDates, onSelect }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = todayIso();
  const workCount = useMemo(() => counts(workDates), [workDates]);
  const openCount = useMemo(() => counts(openDates), [openDates]);

  const weekStart = useMemo(
    () => addDays(mondayOf(today), weekOffset * 7),
    [today, weekOffset],
  );

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        const iso = toIso(date);
        return {
          iso,
          label: DAY_LABELS[index] ?? '',
          dayNum: date.getDate(),
          isToday: iso === today,
          booked: workCount.get(iso) ?? 0,
          open: openCount.get(iso) ?? 0,
        };
      }),
    [openCount, today, weekStart, workCount],
  );

  const weekBooked = days.reduce((sum, day) => sum + day.booked, 0);
  const weekOpen = days.reduce((sum, day) => sum + day.open, 0);
  const moveWeek = (delta: number) => {
    const nextOffset = weekOffset + delta;
    const start = addDays(mondayOf(today), nextOffset * 7);
    const visible = new Set(Array.from({ length: 7 }, (_, index) => toIso(addDays(start, index))));
    if (selectedIso && !visible.has(selectedIso)) onSelect(null);
    setWeekOffset(nextOffset);
  };

  const showingToday = weekOffset === 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => moveWeek(-1)}
          style={styles.nav}
        >
          <Ionicons name="chevron-back" size={18} color={colors.navy} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.kicker}>Schedule</Text>
          <Text style={styles.title}>{rangeTitle(weekStart, weekOffset)}</Text>
          <Text style={styles.summary}>
            {weekBooked} booked · {weekOpen} open
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => moveWeek(1)}
          style={styles.nav}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.navy} />
        </Pressable>
      </View>

      <View style={styles.tools}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedIso == null }}
          accessibilityLabel="Show all upcoming"
          onPress={() => onSelect(null)}
          style={[styles.tool, selectedIso == null && styles.toolOn]}
        >
          <Text style={[styles.toolText, selectedIso == null && styles.toolTextOn]}>All days</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          onPress={() => {
            setWeekOffset(0);
            onSelect(today);
          }}
          style={[styles.tool, showingToday && selectedIso === today && styles.toolOn]}
        >
          <Ionicons
            name="today-outline"
            size={14}
            color={showingToday && selectedIso === today ? colors.white : colors.tealStrong}
          />
          <Text
            style={[
              styles.toolText,
              showingToday && selectedIso === today && styles.toolTextOn,
            ]}
          >
            Today
          </Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const selected = selectedIso === day.iso;
          return (
            <Pressable
              key={day.iso}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${day.label} ${day.dayNum}${day.booked ? `, ${day.booked} booked` : ''}${day.open ? `, ${day.open} open` : ''}`}
              onPress={() => onSelect(selected ? null : day.iso)}
              style={[styles.day, day.isToday && !selected && styles.dayToday, selected && styles.dayOn]}
            >
              <Text style={[styles.dayLabel, selected && styles.dayLabelOn]}>{day.label}</Text>
              <Text style={[styles.dayNum, selected && styles.dayNumOn]}>{day.dayNum}</Text>
              <View style={styles.marks}>
                {day.booked > 0 ? (
                  <View style={[styles.mark, styles.markBooked, selected && styles.markOn]} />
                ) : null}
                {day.open > 0 ? (
                  <View style={[styles.mark, styles.markOpen, selected && styles.markOn]} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.mark, styles.markBooked]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.mark, styles.markOpen]} />
          <Text style={styles.legendText}>Open to claim</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#D5E2EE',
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8FB',
    borderWidth: 1,
    borderColor: '#E3EEF6',
  },
  heading: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  kicker: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    color: colors.navy,
  },
  summary: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tool: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D5E2EE',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  toolText: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 12,
    color: colors.navy,
  },
  toolTextOn: {
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  day: {
    flex: 1,
    minHeight: 68,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FBFE',
    borderWidth: 1,
    borderColor: '#E3EEF6',
    paddingVertical: 6,
  },
  dayToday: {
    borderColor: colors.tealStrong,
  },
  dayOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  dayLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  dayLabelOn: {
    color: 'rgba(255,255,255,0.72)',
  },
  dayNum: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
  },
  dayNumOn: {
    color: colors.white,
  },
  marks: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  mark: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  markBooked: {
    backgroundColor: colors.tealStrong,
  },
  markOpen: {
    backgroundColor: colors.yellow,
  },
  markOn: {
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
  legendText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
