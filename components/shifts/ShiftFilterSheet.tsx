import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { CYPRUS_CITIES } from '@/constants/market';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { mockDepartments, mockOrganizations, mockRoles } from '@/data/mock';
import { EMPTY_FILTERS, type ShiftFilters } from '@/utils/shiftFilters';

type Props = {
  visible: boolean;
  filters: ShiftFilters;
  onChange: (filters: ShiftFilters) => void;
  onClose: () => void;
};

export function ShiftFilterSheet({ visible, filters, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const departments = Array.from(new Set(mockDepartments.map((d) => d.name)));

  const toggle = <K extends keyof ShiftFilters>(key: K, value: ShiftFilters[K]) => {
    onChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handleRow}>
            <Text style={styles.title}>Filter Shifts</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.navy} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.section}>Location</Text>
            <View style={styles.chips}>
              {CYPRUS_CITIES.map((city) => (
                <Chip
                  key={city}
                  label={city}
                  selected={filters.location === city}
                  onPress={() => toggle('location', city)}
                />
              ))}
            </View>

            <Text style={styles.section}>Organization</Text>
            <View style={styles.chips}>
              {mockOrganizations.map((org) => (
                <Chip
                  key={org.id}
                  label={org.name}
                  selected={filters.organizationId === org.id}
                  onPress={() => toggle('organizationId', org.id)}
                />
              ))}
            </View>

            <Text style={styles.section}>Department</Text>
            <View style={styles.chips}>
              {departments.map((dept) => (
                <Chip
                  key={dept}
                  label={dept}
                  selected={filters.department === dept}
                  onPress={() => toggle('department', dept)}
                />
              ))}
            </View>

            <Text style={styles.section}>Professional Role</Text>
            <View style={styles.chips}>
              {mockRoles.map((role) => (
                <Chip
                  key={role.id}
                  label={role.name}
                  selected={filters.professionalRoleId === role.id}
                  onPress={() => toggle('professionalRoleId', role.id)}
                />
              ))}
            </View>

            <Text style={styles.section}>Shift Type</Text>
            <View style={styles.chips}>
              <Chip
                label="Day Shift"
                selected={!!filters.dayShift}
                onPress={() => onChange({ ...filters, dayShift: !filters.dayShift })}
              />
              <Chip
                label="Night Shift"
                selected={!!filters.nightShift}
                onPress={() => onChange({ ...filters, nightShift: !filters.nightShift })}
              />
              <Chip
                label="Urgent Only"
                selected={!!filters.urgentOnly}
                onPress={() => onChange({ ...filters, urgentOnly: !filters.urgentOnly })}
              />
            </View>

            <Text style={styles.section}>Pay Range</Text>
            <View style={styles.chips}>
              <Chip
                label="€90+"
                selected={filters.minPay === 90}
                onPress={() => toggle('minPay', 90)}
              />
              <Chip
                label="€120+"
                selected={filters.minPay === 120}
                onPress={() => toggle('minPay', 120)}
              />
              <Chip
                label="€150+"
                selected={filters.minPay === 150}
                onPress={() => toggle('minPay', 150)}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label="Clear"
              variant="secondary"
              onPress={() => onChange(EMPTY_FILTERS)}
              style={styles.action}
              fullWidth={false}
            />
            <Button
              label="Apply Filters"
              variant="primary"
              onPress={onClose}
              style={styles.action}
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 560,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  handleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    color: colors.navy,
    flex: 1,
  },
  section: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 140,
  },
});
