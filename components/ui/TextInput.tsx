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
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextInput({ label, error, containerStyle, style, ...props }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
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
    color: colors.navy,
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
});
