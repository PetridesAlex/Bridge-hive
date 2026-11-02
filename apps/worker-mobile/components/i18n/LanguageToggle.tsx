import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { useAppLocale } from '@/i18n/locale-provider';
import type { AppLanguage } from '@/i18n/types';

type LanguageToggleProps = {
  /** Lighter chrome for navy backgrounds (welcome / auth). */
  tone?: 'light' | 'dark';
};

const OPTIONS: {
  code: AppLanguage;
  flag: string;
  label: string;
}[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'el', flag: '🇬🇷', label: 'ΕΛ' },
];

function Option({
  flag,
  label,
  selected,
  tone,
  onPress,
  accessibilityLabel,
}: {
  flag: string;
  label: string;
  selected: boolean;
  tone: 'light' | 'dark';
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const light = tone === 'light';

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.option,
        selected && (light ? styles.optionOnLight : styles.optionOnDark),
        pressed && styles.optionPressed,
      ]}
    >
      <View style={[styles.flagDisc, light ? styles.flagDiscLight : styles.flagDiscDark]}>
        <Text style={styles.flag} allowFontScaling={false}>
          {flag}
        </Text>
      </View>
      <Text
        style={[
          styles.optionLabel,
          light ? styles.labelLight : styles.labelDark,
          selected && (light ? styles.labelOnLight : styles.labelOnDark),
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Premium language switcher with national flags for EN / Greek. */
export function LanguageToggle({ tone = 'dark' }: LanguageToggleProps) {
  const { language, setLocale, t } = useAppLocale();
  const light = tone === 'light';

  return (
    <View
      style={[styles.row, light ? styles.rowLight : styles.rowDark]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.selectLanguage')}
    >
      {OPTIONS.map((option) => (
        <Option
          key={option.code}
          flag={option.flag}
          label={option.label}
          selected={language === option.code}
          tone={tone}
          onPress={() => {
            void setLocale(option.code);
          }}
          accessibilityLabel={`${
            option.code === 'en' ? t('a11y.selectEnglish') : t('a11y.selectGreek')
          }${language === option.code ? `, ${t('a11y.languageSelected')}` : ''}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    padding: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowLight: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rowDark: {
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
    borderColor: 'rgba(11, 42, 67, 0.12)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 36,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 999,
  },
  optionOnLight: {
    backgroundColor: colors.yellow,
  },
  optionOnDark: {
    backgroundColor: colors.navy,
  },
  optionPressed: {
    opacity: 0.88,
  },
  flagDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  flagDiscLight: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  flagDiscDark: {
    backgroundColor: colors.white,
    borderColor: 'rgba(11, 42, 67, 0.12)',
  },
  flag: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  optionLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  labelLight: {
    color: 'rgba(247, 251, 253, 0.72)',
  },
  labelDark: {
    color: colors.textSecondary,
  },
  labelOnLight: {
    color: colors.navy,
  },
  labelOnDark: {
    color: colors.white,
  },
});
