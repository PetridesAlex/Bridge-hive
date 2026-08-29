import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ReplacementCard } from '@/components/transfers/ReplacementCard';
import { TransferTimeline } from '@/components/transfers/TransferTimeline';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { initialShifts } from '@/data/mock';
import type { ReplacementCandidate } from '@/types';
import { useShiftStore } from '@/store/shiftStore';
import {
  formatCurrency,
  formatDayLabel,
  formatDuration,
  formatTimeRange,
} from '@/utils/format';

/** Transfer screens are keyed by shift id; pre-render for static web hosting. */
export function generateStaticParams(): { id: string }[] {
  return initialShifts.map((shift) => ({ id: shift.id }));
}

export default function TransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const shift = useShiftStore((s) => s.shifts.find((item) => item.id === id));
  const replacements = useShiftStore((s) => s.replacements);
  const transfers = useShiftStore((s) => s.transfers);
  const requestTransfer = useShiftStore((s) => s.requestTransfer);
  const advanceTransfer = useShiftStore((s) => s.advanceTransfer);
  const completeTransferDemo = useShiftStore((s) => s.completeTransferDemo);

  const transfer = useMemo(
    () => transfers.find((t) => t.shiftId === id && t.status !== 'DECLINED'),
    [transfers, id],
  );

  const [selected, setSelected] = useState<ReplacementCandidate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!shift) {
    return (
      <AppScreen>
        <ScreenHeader title="Transfer Shift" showBack />
        <EmptyState title="Shift not found" />
      </AppScreen>
    );
  }

  const isComplete = transfer?.status === 'COMPLETED' || shift.status === 'TRANSFERRED';

  const handleRequest = () => {
    if (!selected) return;
    requestTransfer(shift.id, selected.id);
    setConfirmOpen(false);
    setSelected(null);
  };

  return (
    <AppScreen>
      <ScreenHeader title="Transfer Shift" showBack subtitle="Replacement request" />

      <Card style={styles.shiftCard}>
        <Text style={styles.eyebrow}>Original Shift</Text>
        <Text style={styles.org}>{shift.organizationName}</Text>
        <Text style={styles.meta}>
          {shift.departmentName} · {formatDayLabel(shift.date)} ·{' '}
          {formatTimeRange(shift.startTime, shift.endTime)}
        </Text>
        <Text style={styles.pay}>
          {formatCurrency(shift.pay, shift.currency)} · {formatDuration(shift.durationHours)}
        </Text>
      </Card>

      {isComplete ? (
        <Card style={styles.success}>
          <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          <Text style={styles.successTitle}>Transfer Successful ✓</Text>
          <Text style={styles.successBody}>
            {transfer?.toMemberName ?? 'Your replacement'} is now assigned to this shift.
          </Text>
          <View style={styles.feeBanner}>
            <Text style={styles.feeText}>NO CANCELLATION FEE APPLIED</Text>
          </View>
          <Button label="View Transferred Shifts" variant="primary" onPress={() => router.replace('/(tabs)/shifts')} />
        </Card>
      ) : null}

      {transfer && !isComplete ? (
        <Card style={styles.progress}>
          <Text style={styles.sectionTitle}>Transfer Request Sent</Text>
          <Text style={styles.progressBody}>
            Waiting for {transfer.toMemberName} to accept. Hospital approval required.
          </Text>
          <TransferTimeline status={transfer.status} />
          <Button
            label="Simulate Next Step"
            variant="secondary"
            onPress={() => advanceTransfer(transfer.id)}
            style={styles.simBtn}
          />
          <Button
            label="Complete Transfer (Demo)"
            variant="brand"
            onPress={() => completeTransferDemo(transfer.id)}
          />
        </Card>
      ) : null}

      {!transfer && !isComplete ? (
        <>
          <Text style={styles.sectionTitle}>Eligible Replacements</Text>
          {replacements.map((candidate) => (
            <ReplacementCard
              key={candidate.id}
              candidate={candidate}
              onRequest={() => {
                setSelected(candidate);
                setConfirmOpen(true);
              }}
            />
          ))}
        </>
      ) : null}

      <ConfirmModal
        visible={confirmOpen}
        title={`Send this shift transfer request to ${selected?.fullName}?`}
        confirmLabel="Send Request"
        confirmVariant="brand"
        onCancel={() => {
          setConfirmOpen(false);
          setSelected(null);
        }}
        onConfirm={handleRequest}
      >
        <Text style={styles.modalBody}>
          {shift.organizationName} · {formatDayLabel(shift.date)} ·{' '}
          {formatTimeRange(shift.startTime, shift.endTime)}
        </Text>
      </ConfirmModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  shiftCard: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: colors.blue,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  org: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pay: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  progress: {
    marginBottom: spacing.lg,
  },
  progressBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.sm,
  },
  simBtn: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  success: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    color: colors.success,
  },
  successBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  feeBanner: {
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  feeText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xs,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  modalBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
});
