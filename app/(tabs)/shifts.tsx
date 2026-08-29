import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ShiftCard } from '@/components/shifts/ShiftCard';
import { ShiftFilterSheet } from '@/components/shifts/ShiftFilterSheet';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { colors } from '@/constants/theme';
import {
  selectAvailableShifts,
  selectCompletedShifts,
  selectTransferredShifts,
  selectUpcomingShifts,
  useShiftStore,
} from '@/store/shiftStore';
import {
  EMPTY_FILTERS,
  filterShifts,
  hasActiveFilters,
  sortShiftsByDate,
  type ShiftFilters,
} from '@/utils/shiftFilters';

const SHIFT_VIEWS = [
  {
    key: 'available',
    label: 'Available',
    description: 'Open shifts you can accept now',
    icon: 'search-outline' as const,
    iconFocused: 'search' as const,
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    description: 'Confirmed shifts on your schedule',
    icon: 'calendar-outline' as const,
    iconFocused: 'calendar' as const,
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Shifts you have already worked',
    icon: 'checkmark-done-outline' as const,
    iconFocused: 'checkmark-done' as const,
  },
  {
    key: 'transferred',
    label: 'Transferred',
    description: 'Shifts moved to another professional',
    icon: 'swap-horizontal-outline' as const,
    iconFocused: 'swap-horizontal' as const,
  },
];

export default function ShiftsScreen() {
  const router = useRouter();
  const shifts = useShiftStore((s) => s.shifts);
  const memberId = useShiftStore((s) => s.activeMemberId);
  const [tab, setTab] = useState('available');
  const [filters, setFilters] = useState<ShiftFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const options = useMemo(() => {
    return SHIFT_VIEWS.map((item) => {
      let badge = 0;
      switch (item.key) {
        case 'upcoming':
          badge = selectUpcomingShifts(shifts, memberId).length;
          break;
        case 'completed':
          badge = selectCompletedShifts(shifts, memberId).length;
          break;
        case 'transferred':
          badge = selectTransferredShifts(shifts).length;
          break;
        default:
          badge = selectAvailableShifts(shifts).length;
      }
      return { ...item, badge };
    });
  }, [shifts, memberId]);

  const list = useMemo(() => {
    let base;
    switch (tab) {
      case 'upcoming':
        base = selectUpcomingShifts(shifts, memberId);
        break;
      case 'completed':
        base = selectCompletedShifts(shifts, memberId);
        break;
      case 'transferred':
        base = selectTransferredShifts(shifts);
        break;
      default:
        base = selectAvailableShifts(shifts);
    }
    return sortShiftsByDate(filterShifts(base, tab === 'available' ? filters : EMPTY_FILTERS));
  }, [shifts, tab, filters, memberId]);

  return (
    <AppScreen>
      <ScreenHeader
        title="Shifts"
        subtitle="Marketplace & schedule"
        right={
          <View style={styles.headerActions}>
            {tab === 'available' ? (
              <Pressable
                onPress={() => setFilterOpen(true)}
                style={[styles.iconBtn, hasActiveFilters(filters) && styles.iconBtnActive]}
                accessibilityRole="button"
                accessibilityLabel="Filter shifts"
              >
                <Ionicons
                  name="options-outline"
                  size={17}
                  color={hasActiveFilters(filters) ? colors.yellow : colors.white}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push('/shifts/calendar')}
              style={[styles.iconBtn, styles.calendarBtn]}
              accessibilityRole="button"
              accessibilityLabel="Open shift calendar"
            >
              <Ionicons name="calendar" size={18} color={colors.navy} />
            </Pressable>
          </View>
        }
      />

      <SelectMenu
        title="Shift list"
        accessibilityLabel="Choose shift list"
        options={options}
        value={tab}
        onChange={setTab}
      />

      {list.length === 0 ? (
        <EmptyState
          title="No shifts found"
          description={
            tab === 'available'
              ? 'Try the calendar to browse by day, or adjust your filters.'
              : 'Nothing in this list yet.'
          }
          icon="briefcase-outline"
        />
      ) : (
        <View>
          {list.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              showStatus={tab !== 'available'}
              ctaLabel="View Shift"
            />
          ))}
        </View>
      )}

      <ShiftFilterSheet
        visible={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(7,26,47,0.12)',
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: colors.yellow,
    backgroundColor: colors.navySoft,
  },
  calendarBtn: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
});
