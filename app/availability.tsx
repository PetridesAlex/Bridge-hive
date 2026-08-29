import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CYPRUS_CITIES } from '@/constants/market';
import { colors, spacing, typography } from '@/constants/theme';
import type { DayPart } from '@/types';
import { useProfileStore } from '@/store/profileStore';

const DAY_PARTS: { key: DayPart; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

const DEPARTMENTS = ['Ward A', 'Ward B', 'ICU', 'Outpatient', 'Rehab Unit'];
const DISTANCES = [15, 25, 40, 60];

export default function AvailabilityScreen() {
  const availability = useProfileStore((s) => s.availability);
  const setAvailableForShifts = useProfileStore((s) => s.setAvailableForShifts);
  const toggleDayPart = useProfileStore((s) => s.toggleDayPart);
  const setMaxTravelDistance = useProfileStore((s) => s.setMaxTravelDistance);
  const togglePreferredLocation = useProfileStore((s) => s.togglePreferredLocation);
  const togglePreferredDepartment = useProfileStore((s) => s.togglePreferredDepartment);
  const togglePreferredShiftType = useProfileStore((s) => s.togglePreferredShiftType);

  return (
    <AppScreen>
      <ScreenHeader title="My Availability" showBack />

      <Card style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>
              {availability.availableForShifts ? 'Available for Shifts' : 'Not Available'}
            </Text>
            <Text style={styles.toggleHint}>
              Toggle off when you are unavailable for new marketplace shifts.
            </Text>
          </View>
          <Switch
            value={availability.availableForShifts}
            onValueChange={setAvailableForShifts}
            trackColor={{ false: colors.border, true: colors.yellow }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      <Text style={styles.section}>Weekly Availability</Text>
      {availability.weekly.map((day) => (
        <Card key={day.day} style={styles.dayCard}>
          <Text style={styles.dayName}>{day.day}</Text>
          <View style={styles.parts}>
            {DAY_PARTS.map((part) => {
              const active = day[part.key];
              return (
                <Pressable
                  key={part.key}
                  onPress={() => toggleDayPart(day.day, part.key)}
                  style={[styles.part, active && styles.partActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.partLabel, active && styles.partLabelActive]}>
                    {part.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}

      <Text style={styles.section}>Maximum Travel Distance</Text>
      <View style={styles.chips}>
        {DISTANCES.map((km) => (
          <Chip
            key={km}
            label={`${km} km`}
            selected={availability.maxTravelDistanceKm === km}
            onPress={() => setMaxTravelDistance(km)}
          />
        ))}
      </View>

      <Text style={styles.section}>Preferred Locations</Text>
      <View style={styles.chips}>
        {CYPRUS_CITIES.map((city) => (
          <Chip
            key={city}
            label={city}
            selected={availability.preferredLocations.includes(city)}
            onPress={() => togglePreferredLocation(city)}
          />
        ))}
      </View>

      <Text style={styles.section}>Preferred Departments</Text>
      <View style={styles.chips}>
        {DEPARTMENTS.map((dept) => (
          <Chip
            key={dept}
            label={dept}
            selected={availability.preferredDepartments.includes(dept)}
            onPress={() => togglePreferredDepartment(dept)}
          />
        ))}
      </View>

      <Text style={styles.section}>Preferred Shift Types</Text>
      <View style={styles.chips}>
        <Chip
          label="Day"
          selected={availability.preferredShiftTypes.includes('day')}
          onPress={() => togglePreferredShiftType('day')}
        />
        <Chip
          label="Night"
          selected={availability.preferredShiftTypes.includes('night')}
          onPress={() => togglePreferredShiftType('night')}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toggleCard: {
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
    color: colors.navy,
  },
  toggleHint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.md,
    color: colors.navy,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayName: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  parts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  part: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 88,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  partActive: {
    backgroundColor: colors.blueLight,
    borderColor: colors.blue,
  },
  partLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  partLabelActive: {
    color: colors.blue,
    fontFamily: typography.fonts.semibold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
