import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { colors, spacing, typography } from '@/constants/theme';
import { updateProfile } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';

export default function AccountScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const result = await updateProfile(user.id, {
      full_name: fullName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (result.error) {
      Alert.alert('Could not save', result.error);
      return;
    }
    await refreshProfile();
    Alert.alert('Saved', 'Account details updated.');
  };

  return (
    <AppScreen>
      <ScreenHeader title="Account" showBack subtitle="Name and phone" />
      <View style={styles.card}>
        <Text style={styles.hint}>Email is managed by authentication and cannot be edited here.</Text>
        <TextInput label="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button label="Save changes" variant="brand" loading={saving} onPress={onSave} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
