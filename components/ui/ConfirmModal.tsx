import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, type ButtonVariant } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { layout, useLayout } from '@/hooks/useLayout';

type Props = {
  visible: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'brand',
  onConfirm,
  onCancel,
}: Props) {
  const { isCompact } = useLayout();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, isCompact && styles.sheetCompact]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>{title}</Text>
          {children ? <View style={styles.body}>{children}</View> : null}
          <View style={[styles.actions, isCompact && styles.actionsStack]}>
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              style={[styles.actionBtn, isCompact && styles.actionBtnStack]}
              fullWidth={isCompact}
            />
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              onPress={onConfirm}
              style={[styles.actionBtn, isCompact && styles.actionBtnStack]}
              fullWidth={isCompact}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: layout.sheetMaxWidth,
  },
  sheetCompact: {
    padding: spacing.xl,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  body: {
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsStack: {
    flexDirection: 'column-reverse',
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnStack: {
    flex: 0,
    width: '100%',
  },
});
