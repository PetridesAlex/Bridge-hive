import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppLocale } from '@/i18n/locale-provider';
import type { AppLanguage } from '@/i18n/types';
import { colors, spacing } from '@/constants/theme';

type LanguageToggleProps = {
  /** Lighter text for navy backgrounds (welcome / auth). */
  tone?: 'light' | 'dark';
};

function Option({
  code,
  label,
  selected,
  tone,
  onPress,
  accessibilityLabel,
}: {
  code: AppLanguage;
  label: string;
  selected: boolean;
  tone: 'light' | 'dark';
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const light = tone === 'light';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.option,
        selected && (light ? styles.optionSelectedLight : styles.optionSelectedDark),
        pressed && styles.optionPressed,
      ]}
    >
      <Text
        style={[
          styles.optionLabel,
          light ? styles.labelLight : styles.labelDark,
          selected && (light ? styles.labelSelectedLight : styles.labelSelectedDark),
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
      {selected ? <View style={[styles.dot, light ? styles.dotLight : styles.dotDark]} /> : null}
    </Pressable>
  );
}

/** Compact EN | ΕΛ language control — no flags. */
export function LanguageToggle({ tone = 'dark' }: LanguageToggleProps) {
  const { language, setLocale, t } = useAppLocale();

  return (
    <View
      style={[styles.row, tone === 'light' ? styles.rowLight : styles.rowDark]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.selectLanguage')}
    >
      <Option
        code="en"
        label="EN"
        selected={language === 'en'}
        tone={tone}
        onPress={() => {
          void setLocale('en');
        }}
        accessibilityLabel={`${t('a11y.selectEnglish')}${language === 'en' ? `, ${t('a11y.languageSelected')}` : ''}`}
      />
      <Text style={[styles.divider, tone === 'light' ? styles.dividerLight : styles.dividerDark]}>
        |
      </Text>
      <Option
        code="el"
        label="ΕΛ"
        selected={language === 'el'}
        tone={tone}
        onPress={() => {
          void setLocale('el');
        }}
        accessibilityLabel={`${t('a11y.selectGreek')}${language === 'el' ? `, ${t('a11y.languageSelected')}` : ''}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    borderRadius: 999,
  },
  rowLight: {
    backgroundColor: 'rgba(247, 251, 253, 0.1)',
  },
  rowDark: {
    backgroundColor: 'rgba(7, 26, 47, 0.06)',
  },
  option: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  optionSelectedLight: {
    backgroundColor: 'rgba(20, 169, 181, 0.28)',
  },
  optionSelectedDark: {
    backgroundColor: 'rgba(20, 169, 181, 0.16)',
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  labelLight: {
    color: 'rgba(247, 251, 253, 0.72)',
  },
  labelDark: {
    color: colors.textSecondary ?? '#5A6B7A',
  },
  labelSelectedLight: {
    color: '#F4FAFC',
  },
  labelSelectedDark: {
    color: colors.navy ?? '#071A2F',
  },
  divider: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 2,
  },
  dividerLight: {
    color: 'rgba(247, 251, 253, 0.35)',
  },
  dividerDark: {
    color: 'rgba(7, 26, 47, 0.25)',
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotLight: {
    backgroundColor: '#F4FAFC',
  },
  dotDark: {
    backgroundColor: colors.teal ?? '#14A9B5',
  },
});
