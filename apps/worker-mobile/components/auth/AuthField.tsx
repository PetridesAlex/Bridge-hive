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
};

export function AuthField({
  label,
  icon,
  error,
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

  const shellStyle = useAnimatedStyle(() => ({
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
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], [colors.textMuted, colors.navyLift]),
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.field, shellStyle, error ? styles.fieldError : null]}>
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={focused ? colors.navy : colors.textMuted} />
          </View>
        ) : null}
        <View style={styles.copy}>
          <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
          <RNTextInput
            {...props}
            value={value}
            secureTextEntry={secureTextEntry ? hidden : false}
            placeholderTextColor="rgba(60,60,67,0.35)"
            style={[styles.input, style]}
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
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  eye: {
    padding: 4,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.error,
    paddingHorizontal: 4,
  },
});
