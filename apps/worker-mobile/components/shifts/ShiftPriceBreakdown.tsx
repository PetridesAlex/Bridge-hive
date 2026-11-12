import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
import { formatDurationMinutes, formatMoney } from '@/utils/format';

type Props = {
  rateMinor: number;
  currency: string;
  estimatedPayMinor: number;
  durationMinutes: number;
};

/**
 * Premium shift pay overview for browsing — hourly rate, duration, and
 * estimated gross only. Commission detail lives behind Payment details /
 * accept confirmation, not in this browsing card.
 */
export function ShiftPriceBreakdown({
  rateMinor,
  currency,
  estimatedPayMinor,
  durationMinutes,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      80,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [8, 0]) }],
  }));

  const detailPoints = [
    t('shifts.paymentDetailsOrgPays'),
    t('shifts.paymentDetailsCommission'),
    t('shifts.paymentDetailsApproved'),
    t('shifts.paymentDetailsDue'),
  ];

  return (
    <>
      <Animated.View style={[styles.card, shellStyle]}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(20, 169, 181, 0.08)', 'rgba(11, 42, 67, 0.02)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wash}
        />

        <View style={styles.header}>
          <LinearGradient
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Ionicons name="wallet" size={18} color={colors.white} />
          </LinearGradient>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{t('shifts.priceOverview')}</Text>
            <Text style={styles.headerSub}>{t('shifts.priceOverviewSub')}</Text>
          </View>
          <View style={styles.rateBadge} accessibilityLabel={t('shifts.hourlyRate')}>
            <Text style={styles.rateBadgeText}>{formatMoney(rateMinor, currency)}/hr</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>{t('shifts.hourlyRate')}</Text>
            <Text style={styles.metaValue}>{formatMoney(rateMinor, currency)}/hr</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>{t('shifts.scheduledDuration')}</Text>
            <Text style={styles.metaValue}>{formatDurationMinutes(durationMinutes)}</Text>
          </View>
        </View>

        {estimatedPayMinor > 0 ? (
          <View style={styles.grossPanel}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(11, 42, 67, 0.06)', 'rgba(20, 169, 181, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.grossLabel}>{t('shifts.estimatedGrossPay')}</Text>
            <Text style={styles.grossValue}>{formatMoney(estimatedPayMinor, currency)}</Text>
            <Text style={styles.grossHint}>{t('shifts.estimatedGrossPayHint')}</Text>
          </View>
        ) : (
          <Text style={styles.empty}>{t('shifts.estimateUnavailable')}</Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shifts.paymentDetails')}
          onPress={() => setDetailsOpen(true)}
          style={({ pressed }) => [styles.detailsLink, pressed && styles.detailsLinkPressed]}
        >
          <Text style={styles.detailsLinkText}>{t('shifts.paymentDetails')}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.tealStrong} />
        </Pressable>
      </Animated.View>

      <Modal
        visible={detailsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setDetailsOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <Text style={styles.sheetTitle}>{t('shifts.paymentDetails')}</Text>
            <View style={styles.sheetList}>
              {detailPoints.map((line) => (
                <View key={line.slice(0, 28)} style={styles.sheetRow}>
                  <View style={styles.sheetDot} />
                  <Text style={styles.sheetText}>{line}</Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={() => setDetailsOpen(false)}
              style={({ pressed }) => [styles.sheetClose, pressed && styles.detailsLinkPressed]}
            >
              <Text style={styles.sheetCloseText}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  headerSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  rateBadge: {
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rateBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaChip: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: 'rgba(11, 42, 67, 0.035)',
  },
  metaLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  metaValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.15,
    color: colors.navy,
  },
  grossPanel: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 4,
    overflow: 'hidden',
  },
  grossLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  grossValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  grossHint: {
    marginTop: 2,
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  empty: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailsLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailsLinkPressed: {
    opacity: 0.7,
  },
  detailsLinkText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.tealStrong,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  sheetTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  sheetList: {
    gap: spacing.sm + 2,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sheetDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
    backgroundColor: colors.navy,
    opacity: 0.35,
  },
  sheetText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  sheetClose: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
  sheetCloseText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
});
