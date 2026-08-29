import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';

const CALENDARS = ['Work', 'Personal', 'HealthBridge'] as const;
type CalendarName = (typeof CALENDARS)[number];

const REMINDER_OPTIONS = ['15 minutes before', '30 minutes before', '1 hour before', '2 hours before'] as const;
type ReminderOption = (typeof REMINDER_OPTIONS)[number];

export function CalendarSyncSection() {
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [calendar, setCalendar] = useState<CalendarName>('Work');
  const [addReminder, setAddReminder] = useState(false);
  const [reminder, setReminder] = useState<ReminderOption>('1 hour before');

  const cycleCalendar = () => {
    const index = CALENDARS.indexOf(calendar);
    setCalendar(CALENDARS[(index + 1) % CALENDARS.length]);
  };

  const cycleReminder = () => {
    const index = REMINDER_OPTIONS.indexOf(reminder);
    setReminder(REMINDER_OPTIONS[(index + 1) % REMINDER_OPTIONS.length]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.block}>
        <Card padded={false}>
          <View style={styles.row}>
            <Text style={styles.label}>Add shifts to calendar</Text>
            <Switch
              value={addToCalendar}
              onValueChange={setAddToCalendar}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
          <View style={styles.divider} />
          <Pressable
            onPress={cycleCalendar}
            disabled={!addToCalendar}
            style={({ pressed }) => [
              styles.row,
              !addToCalendar && styles.disabled,
              pressed && addToCalendar && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Choose calendar"
          >
            <Text style={styles.label}>Calendar</Text>
            <View style={styles.valueWrap}>
              <Text style={styles.value}>{calendar}</Text>
              <Ionicons name="swap-vertical" size={16} color={colors.textMuted} />
            </View>
          </Pressable>
        </Card>
        <Text style={styles.help}>Automatically add your shifts to your chosen calendar.</Text>
      </View>

      <View style={styles.block}>
        <Card padded={false}>
          <View style={styles.row}>
            <Text style={styles.label}>Add reminder</Text>
            <Switch
              value={addReminder}
              onValueChange={setAddReminder}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
          {addReminder ? (
            <>
              <View style={styles.divider} />
              <Pressable
                onPress={cycleReminder}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Choose reminder time"
              >
                <Text style={styles.label}>Remind me</Text>
                <View style={styles.valueWrap}>
                  <Text style={styles.value}>{reminder}</Text>
                  <Ionicons name="swap-vertical" size={16} color={colors.textMuted} />
                </View>
              </Pressable>
            </>
          ) : null}
        </Card>
        <Text style={styles.help}>Choose when to be reminded before your shift.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xl,
  },
  block: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  label: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
