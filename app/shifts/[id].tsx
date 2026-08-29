import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrganizationBadge } from '@/components/organizations/OrganizationBadge';
import { LocationMap } from '@/components/maps/LocationMap';
import { PositionsRemaining } from '@/components/shifts/PositionsRemaining';
import { ShiftStatusBadge } from '@/components/shifts/ShiftStatusBadge';
import { AppScreen } from '@/components/ui/AppScreen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { clinical } from '@/constants/clinical';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { getOrganization, initialShifts } from '@/data/mock';
import { useLayout } from '@/hooks/useLayout';
import { useAuth } from '@/providers/AuthProvider';
import { useShiftStore } from '@/store/shiftStore';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatTimeRange,
} from '@/utils/format';

/** Pre-render known shift detail URLs for static web hosting. */
export function generateStaticParams(): { id: string }[] {
  return initialShifts.map((shift) => ({ id: shift.id }));
}

type Snapshot = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  emphasize?: boolean;
};

function SnapshotGrid({ items }: { items: Snapshot[] }) {
  return (
    <View style={styles.snapshotGrid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.snapshotTile, item.emphasize && styles.snapshotEmphasize]}
        >
          <View style={[styles.snapshotIcon, item.emphasize && styles.snapshotIconEmphasize]}>
            <Ionicons
              name={item.icon}
              size={15}
              color={item.emphasize ? colors.navy : colors.navyLift}
            />
          </View>
          <View style={styles.snapshotCopy}>
            <Text style={[styles.snapshotLabel, item.emphasize && styles.snapshotLabelEmphasize]}>
              {item.label}
            </Text>
            <Text
              style={[styles.snapshotValue, item.emphasize && styles.snapshotValueEmphasize]}
              numberOfLines={2}
            >
              {item.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <Card padded={false} elevated={false} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={16} color={colors.yellow} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

export default function ShiftDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isCompact } = useLayout();
  const shift = useShiftStore((s) => s.shifts.find((item) => item.id === id));
  const acceptShift = useShiftStore((s) => s.acceptShift);
  const { isVerifiedProfessional } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmedToast, setConfirmedToast] = useState(false);

  if (!shift) {
    return (
      <AppScreen>
        <ScreenHeader title="Shift" showBack subtitle="Details" />
        <EmptyState title="Shift not found" description="This shift may have been removed." />
      </AppScreen>
    );
  }

  const org = getOrganization(shift.organizationId);
  const isOpen = shift.status === 'OPEN';
  const isConfirmed = shift.status === 'CONFIRMED';

  const handleAccept = () => {
    const ok = acceptShift(shift.id);
    setConfirmOpen(false);
    if (ok) {
      setConfirmedToast(true);
    }
  };

  const snapshots: Snapshot[] = [
    { icon: 'calendar-outline', label: 'Date', value: formatDate(shift.date) },
    {
      icon: 'time-outline',
      label: 'Time',
      value: formatTimeRange(shift.startTime, shift.endTime),
    },
    {
      icon: 'hourglass-outline',
      label: 'Duration',
      value: formatDuration(shift.durationHours),
    },
    {
      icon: 'cash-outline',
      label: 'Pay',
      value: formatCurrency(shift.pay, shift.currency),
      emphasize: true,
    },
    { icon: 'location-outline', label: 'Location', value: shift.city },
    ...(isOpen
      ? []
      : [
          {
            icon: 'people-outline' as const,
            label: 'Positions',
            value: `${shift.remainingPositions} of ${shift.requiredWorkers} left`,
          },
        ]),
  ];

  return (
    <AppScreen style={styles.screen}>
      <ScreenHeader
        title="Shift Details"
        showBack
        subtitle={isConfirmed ? 'Confirmed booking' : isOpen ? 'Open shift' : shift.status}
      />

      {confirmedToast ? (
        <Card style={styles.successBanner} elevated={false}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>Shift confirmed</Text>
            <Text style={styles.successSub}>It's on your upcoming schedule.</Text>
          </View>
        </Card>
      ) : null}

      <Card padded={false} style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroTop}>
          <View style={styles.badges}>
            {shift.urgent ? (
              <Badge
                label="Urgent"
                color={colors.navy}
                backgroundColor={colors.yellow}
                icon="flash"
              />
            ) : null}
            <ShiftStatusBadge status={shift.status} />
          </View>
          <View style={styles.payBlock}>
            <Text style={styles.payLabel}>Shift pay</Text>
            <Text style={styles.payHero}>{formatCurrency(shift.pay, shift.currency)}</Text>
          </View>
        </View>

        <View style={styles.heroBody}>
          <OrganizationBadge name={shift.organizationName} verified={shift.organizationVerified} />
          <Text style={styles.role}>{shift.professionalRoleName}</Text>
          <Text style={styles.dept}>{shift.departmentName}</Text>
          {isOpen && shift.remainingPositions > 0 ? (
            <PositionsRemaining
              remaining={shift.remainingPositions}
              required={shift.requiredWorkers}
            />
          ) : null}
        </View>

        <SnapshotGrid items={snapshots} />
      </Card>

      <DetailSection title="Requirements" icon="shield-checkmark-outline">
        {shift.requirements.map((req) => (
          <View key={req} style={styles.reqRow}>
            <View style={styles.reqIcon}>
              <Ionicons name="checkmark" size={13} color={colors.navy} />
            </View>
            <Text style={styles.reqText}>{req}</Text>
          </View>
        ))}
      </DetailSection>

      <DetailSection title="Organization" icon="business-outline">
        <Text style={styles.bodyStrong}>{shift.organizationName}</Text>
        {org ? <Text style={styles.body}>{org.address}</Text> : null}
        {org?.phone ? <Text style={styles.muted}>{org.phone}</Text> : null}
        <LocationMap
          name={shift.organizationName}
          address={org?.address ?? `${shift.city}, Cyprus`}
          city={org?.city ?? shift.city}
          latitude={org?.latitude}
          longitude={org?.longitude}
        />
      </DetailSection>

      <DetailSection title="Instructions" icon="document-text-outline">
        <Text style={styles.body}>{shift.instructions}</Text>
      </DetailSection>

      {isOpen ? (
        <View style={styles.ctaBlock}>
          {isVerifiedProfessional ? (
            <>
              <Button
                label="Accept Shift"
                variant="brand"
                size="lg"
                onPress={() => setConfirmOpen(true)}
              />
              <Text style={styles.ctaHint}>
                You’ll confirm date, time, and pay before booking.
              </Text>
            </>
          ) : (
            <Card style={styles.verifyCard} elevated={false}>
              <View style={styles.verifyIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.yellow} />
              </View>
              <Text style={styles.verifyTitle}>Verification needed</Text>
              <Text style={styles.verifyBody}>
                Complete professional verification to accept marketplace shifts. You can still review
                details and prepare your documents.
              </Text>
              <Button
                label="View verification status"
                variant="brand"
                onPress={() => router.push('/auth/professional/pending')}
              />
            </Card>
          )}
        </View>
      ) : null}

      {isConfirmed ? (
        <>
          <View style={[styles.actions, isCompact && styles.actionsStack]}>
            <Button
              label="Get Directions"
              variant="dark"
              onPress={() => {
                const q = encodeURIComponent(org?.address ?? shift.city);
                Linking.openURL(`https://maps.apple.com/?q=${q}`).catch(() =>
                  Alert.alert('Directions', 'Unable to open maps on this device.'),
                );
              }}
              style={!isCompact ? styles.actionHalf : undefined}
              fullWidth={isCompact}
            />
            <Button
              label="Contact Support"
              variant="secondary"
              onPress={() =>
                Alert.alert('Support', 'Phase 1 placeholder — support chat comes later.')
              }
              style={!isCompact ? styles.actionHalf : undefined}
              fullWidth={isCompact}
            />
          </View>

          <Card style={styles.cantAttend} elevated={false}>
            <View style={styles.cantHeader}>
              <View style={styles.cantIcon}>
                <Ionicons name="swap-horizontal" size={20} color={colors.navy} />
              </View>
              <View style={styles.cantCopy}>
                <Text style={styles.cantTitle}>Can't attend?</Text>
                <Text style={styles.cantBody}>
                  Request an eligible replacement first. Approved transfers avoid cancellation fees.
                </Text>
              </View>
            </View>
            <Button
              label="Find Replacement"
              variant="dark"
              size="lg"
              onPress={() => router.push(`/transfers/${shift.id}`)}
            />
            <View style={styles.cantLinks}>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Cancellation Policy',
                    'Cancellations without an approved transfer may incur a fee. Prefer Find Replacement first.',
                  )
                }
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Cancellation policy</Text>
              </Pressable>
              <Text style={styles.linkDot}>·</Text>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Cancel Shift',
                    'Please try Find Replacement first. Direct cancel is discouraged.',
                  )
                }
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[styles.link, styles.linkDanger]}>Cancel shift</Text>
              </Pressable>
            </View>
          </Card>
        </>
      ) : null}

      <ConfirmModal
        visible={confirmOpen}
        title="Accept this shift?"
        confirmLabel="Confirm Shift"
        confirmVariant="brand"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleAccept}
      >
        <Text style={styles.modalLine}>{shift.organizationName}</Text>
        <Text style={styles.modalLine}>{formatDate(shift.date)}</Text>
        <Text style={styles.modalLine}>{formatTimeRange(shift.startTime, shift.endTime)}</Text>
        <Text style={styles.modalLine}>{formatDuration(shift.durationHours)}</Text>
        <Text style={styles.modalEarn}>
          You will earn {formatCurrency(shift.pay, shift.currency)}
        </Text>
      </ConfirmModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: clinical.mist,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    marginBottom: spacing.md,
  },
  successCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  successTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.md,
    color: colors.success,
  },
  successSub: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  hero: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderColor: clinical.border,
    backgroundColor: colors.white,
  },
  heroAccent: {
    height: 3,
    backgroundColor: colors.yellow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  payBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  payLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.navyLift,
  },
  payHero: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 32,
    color: colors.navy,
    letterSpacing: -0.6,
  },
  heroBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 4,
  },
  role: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.md,
    lineHeight: 22,
    color: colors.navy,
    letterSpacing: -0.2,
    marginTop: spacing.sm,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: clinical.border,
    backgroundColor: clinical.mint,
  },
  snapshotTile: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: clinical.border,
  },
  snapshotEmphasize: {
    backgroundColor: clinical.mintDeep,
  },
  snapshotCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  snapshotIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: clinical.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotIconEmphasize: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  snapshotLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    color: colors.navyLift,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  snapshotLabelEmphasize: {
    color: colors.navy,
  },
  snapshotValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.15,
    color: colors.navy,
    flexShrink: 1,
  },
  snapshotValueEmphasize: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.navy,
  },
  section: {
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.navy,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245,176,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.25,
    color: colors.white,
  },
  sectionBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  reqIcon: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reqText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: colors.navySoft,
  },
  bodyStrong: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  muted: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navyLift,
    marginTop: 2,
  },
  ctaBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  ctaHint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  verifyCard: {
    backgroundColor: colors.navy,
    borderColor: colors.navySoft,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  verifyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(245,176,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245,176,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  verifyTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.white,
  },
  verifyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionsStack: {
    flexDirection: 'column',
  },
  actionHalf: {
    flex: 1,
  },
  cantAttend: {
    backgroundColor: colors.blueLight,
    borderColor: clinical.borderStrong,
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  cantHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cantIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cantTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.lg,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  cantBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
  cantLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  link: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navyLift,
  },
  linkDanger: {
    color: colors.error,
  },
  linkDot: {
    color: colors.textMuted,
  },
  modalLine: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalEarn: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: typography.size.lg,
    color: colors.navy,
    marginTop: spacing.md,
  },
});
