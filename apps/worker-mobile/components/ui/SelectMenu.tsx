import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export type SelectMenuOption = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconFocused?: keyof typeof Ionicons.glyphMap;
  badge?: number;
  description?: string;
};

type Props = {
  options: SelectMenuOption[];
  value: string;
  onChange: (key: string) => void;
  title?: string;
  accessibilityLabel?: string;
};

export function SelectMenu({
  options,
  value,
  onChange,
  title = 'Show',
  accessibilityLabel = 'Choose list',
}: Props) {
  const [open, setOpen] = useState(false);
  const active = options.find((item) => item.key === value) ?? options[0];

  const select = (key: string) => {
    if (key !== value && Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onChange(key);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens a list of shift views"
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <View style={styles.triggerIcon}>
          <Ionicons
            name={(active?.iconFocused ?? active?.icon ?? 'list') as keyof typeof Ionicons.glyphMap}
            size={18}
            color={colors.yellow}
          />
        </View>
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerEyebrow}>{title}</Text>
          <Text style={styles.triggerLabel} numberOfLines={1}>
            {active?.label ?? 'Select'}
          </Text>
        </View>
        {typeof active?.badge === 'number' ? (
          <View style={styles.triggerBadge}>
            <Text style={styles.triggerBadgeText}>
              {active.badge > 99 ? '99+' : active.badge}
            </Text>
          </View>
        ) : null}
        <View style={styles.chevron}>
          <Ionicons name="chevron-down" size={16} color={colors.yellow} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <Text style={styles.sheetSub}>Choose which shifts to view</Text>

            <View style={styles.list}>
              {options.map((option) => {
                const selected = option.key === value;
                const iconName = selected
                  ? (option.iconFocused ?? option.icon)
                  : option.icon;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => select(option.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                      {iconName ? (
                        <Ionicons
                          name={iconName}
                          size={18}
                          color={selected ? colors.navy : colors.yellow}
                        />
                      ) : null}
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text
                          style={[
                            styles.optionDescription,
                            selected && styles.optionDescriptionSelected,
                          ]}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                    {typeof option.badge === 'number' ? (
                      <View style={[styles.optionBadge, selected && styles.optionBadgeSelected]}>
                        <Text
                          style={[
                            styles.optionBadgeText,
                            selected && styles.optionBadgeTextSelected,
                          ]}
                        >
                          {option.badge > 99 ? '99+' : option.badge}
                        </Text>
                      </View>
                    ) : null}
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.yellow} />
                    ) : (
                      <View style={styles.checkSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 64,
  },
  triggerPressed: {
    opacity: 0.94,
  },
  triggerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(245,176,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  triggerEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  triggerLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.35,
    color: colors.white,
  },
  triggerBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  sheetSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.blueLight,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  optionSelected: {
    backgroundColor: colors.navy,
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: colors.yellow,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  optionLabelSelected: {
    color: colors.white,
  },
  optionDescription: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  optionDescriptionSelected: {
    color: 'rgba(255,255,255,0.6)',
  },
  optionBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  optionBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  optionBadgeTextSelected: {
    color: colors.white,
  },
  checkSpacer: {
    width: 20,
  },
});
