import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = RNTextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  /** Navy glass journey fields use light text for contrast. */
  tone?: 'light' | 'navy';
};

export function AuthField({
  label,
  icon,
  error,
  tone = 'light',
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  value,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const focus = useSharedValue(0);
  const press = useSharedValue(1);
  const navy = tone === 'navy';

  const shellStyle = useAnimatedStyle(() => {
    if (navy) {
      return {
        backgroundColor: interpolateColor(
          focus.value,
          [0, 1],
          ['rgba(20, 169, 181, 0.1)', 'rgba(20, 169, 181, 0.18)'],
        ),
        borderColor: interpolateColor(
          focus.value,
          [0, 1],
          ['rgba(20, 169, 181, 0.28)', 'rgba(228, 179, 52, 0.55)'],
        ),
        transform: [{ scale: press.value }],
      };
    }
    return {
      backgroundColor: interpolateColor(
        focus.value,
        [0, 1],
        ['rgba(120,120,128,0.12)', 'rgba(255,255,255,1)'],
      ),
      borderColor: interpolateColor(
        focus.value,
        [0, 1],
        ['rgba(120,120,128,0.12)', colors.navy],
      ),
      transform: [{ scale: press.value }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    if (navy) {
      return {
        color: interpolateColor(
          focus.value,
          [0, 1],
          ['rgba(184, 228, 234, 0.72)', '#E4B334'],
        ),
      };
    }
    return {
      color: interpolateColor(focus.value, [0, 1], [colors.textMuted, colors.navyLift]),
    };
  });

  const iconColor = navy
    ? focused
      ? colors.yellow
      : 'rgba(184, 228, 234, 0.75)'
    : focused
      ? colors.navy
      : colors.textMuted;

  const eyeColor = navy ? 'rgba(184, 228, 234, 0.8)' : colors.textMuted;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.field,
          shellStyle,
          error ? (navy ? styles.fieldErrorNavy : styles.fieldError) : null,
        ]}
      >
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        ) : null}
        <View style={styles.copy}>
          <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
          <RNTextInput
            {...props}
            value={value}
            secureTextEntry={secureTextEntry ? hidden : false}
            placeholderTextColor={
              navy ? 'rgba(184, 228, 234, 0.45)' : 'rgba(60,60,67,0.35)'
            }
            style={[styles.input, navy && styles.inputNavy, style]}
            onFocus={(e) => {
              setFocused(true);
              focus.value = withTiming(1, { duration: 200 });
              press.value = withSpring(1.01, { damping: 14, stiffness: 220 });
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              focus.value = withTiming(0, { duration: 200 });
              press.value = withSpring(1, { damping: 14, stiffness: 220 });
              onBlur?.(e);
            }}
          />
        </View>
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eye}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={eyeColor}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={[styles.error, navy && styles.errorNavy]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 64,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  fieldError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  fieldErrorNavy: {
    borderColor: 'rgba(255, 138, 128, 0.7)',
    backgroundColor: 'rgba(255, 138, 128, 0.12)',
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  input: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    letterSpacing: -0.24,
    color: colors.navy,
    padding: 0,
    margin: 0,
    minHeight: 24,
  },
  inputNavy: {
    color: '#F7FBFD',
  },
  eye: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.error,
    paddingHorizontal: 4,
  },
  errorNavy: {
    color: '#FF8A80',
  },
});
