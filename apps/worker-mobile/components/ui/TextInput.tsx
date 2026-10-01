import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = RNTextInputProps & {
  label: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Text field with visible label, optional help, and error message. */
export function TextInput({
  label,
  error,
  helpText,
  required,
  containerStyle,
  style,
  ...props
}: Props) {
  const labelText = required ? `${label} (required)` : label;
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{labelText}</Text>
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        accessibilityLabel={labelText}
        {...props}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helpText ? (
        <Text style={styles.help}>{helpText}</Text>
      ) : null}
    </View>
  );
}

/** Preferred Phase 7A name. */
export const TextField = TextInput;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.error,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});
