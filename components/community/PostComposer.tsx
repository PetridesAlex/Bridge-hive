import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  onSubmit: (content: string) => void;
  canPost: boolean;
};

export function PostComposer({ onSubmit, canPost }: Props) {
  const router = useRouter();
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!canPost || !value.trim()) return;
    onSubmit(value);
    setValue('');
  };

  if (!canPost) {
    return (
      <Card style={[styles.card, styles.lockedCard]} elevated={false}>
        <View style={styles.lockIcon}>
          <Ionicons name="shield-checkmark" size={20} color={colors.navy} />
        </View>
        <Text style={styles.lockTitle}>Verified members only</Text>
        <Text style={styles.lockBody}>
          Posting, likes, and comments are limited to registered professionals who have passed
          HealthBridge verification. Sharing outside the community is disabled.
        </Text>
        <Button
          label="Check verification status"
          variant="brand"
          size="sm"
          onPress={() => router.push('/auth/professional/pending')}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.eyebrow}>Share with verified professionals</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Share a clinical tip, shift update, or question…"
        placeholderTextColor={colors.textMuted}
        multiline
        style={styles.input}
      />
      <View style={styles.actions}>
        <Button
          label="Post"
          variant="primary"
          size="sm"
          fullWidth={false}
          onPress={handleSubmit}
          disabled={!value.trim()}
          style={styles.btn}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  lockedCard: {
    backgroundColor: colors.navy,
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  lockTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.white,
  },
  lockBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.navyLift,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 72,
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  btn: {
    minWidth: 88,
    borderRadius: radii.md,
  },
});
