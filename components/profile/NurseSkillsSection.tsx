import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { SUGGESTED_NURSE_SKILLS } from '@/store/profileStore';

type Props = {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
};

export function NurseSkillsSection({ skills, onAdd, onRemove }: Props) {
  const [custom, setCustom] = useState('');
  const suggestions = SUGGESTED_NURSE_SKILLS.filter(
    (skill) => !skills.some((s) => s.toLowerCase() === skill.toLowerCase()),
  );

  const submitCustom = () => {
    const value = custom.trim();
    if (!value) return;
    onAdd(value);
    setCustom('');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="medkit" size={18} color={colors.yellow} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Your skills</Text>
          <Text style={styles.subtitle}>
            {skills.length} skill{skills.length === 1 ? '' : 's'} · hospitals see these when booking
          </Text>
        </View>
      </View>

      {skills.length === 0 ? (
        <Text style={styles.empty}>Add skills that match your clinical experience.</Text>
      ) : (
        <View style={styles.chips}>
          {skills.map((skill) => (
            <Pressable
              key={skill}
              onPress={() => onRemove(skill)}
              style={styles.skillChip}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${skill}`}
            >
              <Text style={styles.skillLabel}>{skill}</Text>
              <Ionicons name="close" size={14} color={colors.navy} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder="Add a skill…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={submitCustom}
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable
          onPress={submitCustom}
          disabled={!custom.trim()}
          style={[styles.addBtn, !custom.trim() && styles.addBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Add skill"
        >
          <Ionicons name="add" size={20} color={colors.navy} />
        </Pressable>
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.suggestBlock}>
          <Text style={styles.suggestLabel}>Suggested</Text>
          <View style={styles.chips}>
            {suggestions.slice(0, 8).map((skill) => (
              <Pressable
                key={skill}
                onPress={() => onAdd(skill)}
                style={styles.suggestChip}
                accessibilityRole="button"
                accessibilityLabel={`Add ${skill}`}
              >
                <Ionicons name="add" size={12} color={colors.navyLift} />
                <Text style={styles.suggestText}>{skill}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  empty: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellowLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  skillLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.blueLight,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.navy,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  suggestBlock: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  suggestLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  suggestText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.navyLift,
  },
});
