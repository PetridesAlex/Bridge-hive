import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useShifts } from '@/hooks/useShifts';
import { buildMonthGrid } from '@/utils/calendar';
import { isoDateFromTimestamp } from '@/utils/format';

export default function ShiftCalendarScreen() {
  const { shifts, loading, error, refresh } = useShifts();
  const cells = useMemo(() => buildMonthGrid(new Date()), []);
  const yearMonth = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const datesWithShifts = useMemo(() => {
    const set = new Set<string>();
    for (const shift of shifts) {
      set.add(isoDateFromTimestamp(shift.starts_at));
    }
    return set;
  }, [shifts]);

  return (
    <AppScreen>
      <ScreenHeader
        title="Calendar"
        showBack
        subtitle={`Published shifts · ${yearMonth.year}-${String(yearMonth.month).padStart(2, '0')}`}
      />
      {error ? (
        <EmptyState
          title="Could not load calendar"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : (
        <View style={styles.grid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Text key={`${d}-${i}`} style={styles.dow}>
              {d}
            </Text>
          ))}
          {cells.map((cell) => {
            const has = cell.inMonth && datesWithShifts.has(cell.iso);
            return (
              <View
                key={cell.key}
                style={[styles.cell, !cell.inMonth && styles.cellMuted, has && styles.cellActive]}
              >
                <Text style={[styles.day, has && styles.dayActive]}>{cell.day}</Text>
              </View>
            );
          })}
        </View>
      )}
      {loading ? <Text style={styles.loading}>Refreshing…</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dow: {
    width: '13%',
    textAlign: 'center',
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  cell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellMuted: { opacity: 0.35 },
  cellActive: {
    backgroundColor: colors.yellowLight,
    borderColor: colors.yellow,
  },
  day: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  dayActive: {
    fontFamily: typography.fonts.bold,
    color: colors.navy,
  },
  loading: {
    marginTop: spacing.lg,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
});
