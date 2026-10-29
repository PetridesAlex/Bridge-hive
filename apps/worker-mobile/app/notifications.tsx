import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { shiftRouteFromPushData } from '@bridge-hive/domain';

import { BillingRestrictionAlert } from '@/components/notifications/BillingRestrictionAlert';
import { ShiftNotificationCard } from '@/components/notifications/ShiftNotificationCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useInvoices } from '@/hooks/useInvoices';
import {
  getMyNotifications,
  markNotificationRead,
  type Notification,
} from '@/lib/queries';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function loadShiftAvailability(shiftIds: string[]): Promise<Map<string, boolean>> {
  if (shiftIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc(
    'get_my_shift_alert_availability' as never,
    { p_shift_ids: shiftIds } as never,
  );
  const rows: unknown = data;
  if (error || !Array.isArray(rows)) return new Map();
  const available = new Map<string, boolean>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const shiftId = (row as { shift_id?: unknown }).shift_id;
    const isAvailable = (row as { available?: unknown }).available;
    if (typeof shiftId === 'string') available.set(shiftId, Boolean(isAvailable));
  }
  return available;
}

type BillingAlert = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: 'money' | 'danger';
};

export default function NotificationsScreen() {
  const { user, isVerified, isAppReviewDemo } = useAuth();
  const { allInvoices, refresh: refreshInvoices } = useInvoices(user?.id);
  const {
    summary: restrictionSummary,
    isRestricted,
    refresh: refreshRestriction,
  } = useBillingRestriction(isVerified && !isAppReviewDemo);
  const [items, setItems] = useState<Notification[]>([]);
  const [availability, setAvailability] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const billingAlerts = useMemo(() => {
    const alerts: BillingAlert[] = [];
    const pastDue = allInvoices.filter((invoice) => invoice.status === 'past_due');
    for (const invoice of pastDue) {
      alerts.push({
        id: `invoice-past-due-${invoice.id}`,
        title: 'Commission invoice past due',
        body: 'Pay this Bridge Hive invoice to keep claiming new shifts.',
        href: `/invoices/${invoice.id}`,
        tone: 'danger',
      });
    }
    if (pastDue.length === 0) {
      const dueSoon = allInvoices.find((invoice) => invoice.status === 'open');
      if (dueSoon) {
        alerts.push({
          id: `invoice-due-soon-${dueSoon.id}`,
          title: 'Commission invoice due soon',
          body: 'Bridge Hive invoices are separate from organization earnings.',
          href: `/invoices/${dueSoon.id}`,
          tone: 'money',
        });
      }
    }
    return alerts;
  }, [allInvoices]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(undefined);
    const result = await getMyNotifications(user.id);
    void refreshInvoices();
    void refreshRestriction();
    if (result.error) setError(result.error);
    else {
      setItems(result.data);
      const shiftIds = result.data
        .map((item) => shiftRouteFromPushData(item.data)?.replace('/shifts/', '') ?? null)
        .filter((id): id is string => Boolean(id));
      setAvailability(await loadShiftAvailability(shiftIds));
    }
    setLoading(false);
  }, [refreshInvoices, refreshRestriction, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onOpen = async (item: Notification) => {
    const route = shiftRouteFromPushData(item.data);
    if (!item.read_at) {
      await markNotificationRead(item.id);
      void refresh();
    }
    if (route) router.push(route as never);
  };

  const sections = useMemo(() => {
    const today = startOfToday().getTime();
    const todays: Notification[] = [];
    const earlier: Notification[] = [];
    for (const item of items) {
      if (new Date(item.created_at).getTime() >= today) todays.push(item);
      else earlier.push(item);
    }
    return [
      { title: 'Today', data: todays },
      { title: 'Earlier', data: earlier },
    ].filter((s) => s.data.length > 0);
  }, [items]);

  const flat = useMemo(() => {
    const rows: (
      | { type: 'header'; title: string }
      | { type: 'restriction'; summary: BillingRestrictionSummary }
      | { type: 'billing'; alert: BillingAlert }
      | { type: 'item'; item: Notification }
    )[] = [];
    const showRestriction = isRestricted && restrictionSummary;
    if (billingAlerts.length > 0 || showRestriction) {
      rows.push({ type: 'header', title: 'Action needed' });
      if (showRestriction) rows.push({ type: 'restriction', summary: restrictionSummary });
      for (const alert of billingAlerts) rows.push({ type: 'billing', alert });
    }
    for (const section of sections) {
      rows.push({ type: 'header', title: section.title });
      for (const item of section.data) rows.push({ type: 'item', item });
    }
    return rows;
  }, [billingAlerts, isRestricted, restrictionSummary, sections]);

  const listEmpty = items.length === 0 && billingAlerts.length === 0 && !isRestricted;

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Notifications" showBack />
      {loading && listEmpty ? (
        <View style={styles.list}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : error && listEmpty ? (
        <ErrorState title="Could not load notifications" onRetry={refresh} />
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(row, index) => {
            if (row.type === 'header') return `h-${row.title}`;
            if (row.type === 'restriction') return 'billing-restriction';
            if (row.type === 'billing') return row.alert.id;
            return row.item.id + String(index);
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              description="Every new matching shift appears here with date, hours, location, and the time it was added."
            />
          }
          renderItem={({ item: row, index }) => {
            if (row.type === 'header') {
              return (
                <View style={styles.sectionRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.section}>{row.title}</Text>
                </View>
              );
            }
            if (row.type === 'restriction') {
              return <BillingRestrictionAlert summary={row.summary} />;
            }
            if (row.type === 'billing') {
              const alert = row.alert;
              const danger = alert.tone === 'danger';
              return (
                <Pressable
                  onPress={() => router.push(alert.href as never)}
                  style={[styles.billingCard, danger && styles.billingCardDanger]}
                  accessibilityRole="button"
                  accessibilityLabel={alert.title}
                >
                  <LinearGradient
                    colors={
                      danger
                        ? [colors.error, '#B02A37']
                        : [colors.honeyStrong, '#C47A12']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.billingIcon}
                  >
                    <Ionicons name="receipt" size={18} color={colors.white} />
                  </LinearGradient>
                  <View style={styles.body}>
                    <Text
                      style={[
                        styles.billingEyebrow,
                        danger && { color: colors.error },
                      ]}
                    >
                      {danger ? 'Past due' : 'Money'}
                    </Text>
                    <Text style={[styles.title, styles.titleUnread]}>{alert.title}</Text>
                    <Text style={styles.text} numberOfLines={3}>
                      {alert.body}
                    </Text>
                    <Text style={styles.billingCta}>View invoice</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={danger ? colors.error : colors.honeyStrong}
                  />
                </Pressable>
              );
            }
            const item = row.item;
            const shiftId = shiftRouteFromPushData(item.data)?.replace('/shifts/', '');
            const unavailable = shiftId ? availability.get(shiftId) === false : false;
            return (
              <ShiftNotificationCard
                item={item}
                unavailable={unavailable}
                index={index}
                onPress={() => void onOpen(item)}
              />
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  section: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  billingCard: {
    backgroundColor: colors.yellowLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 148, 36, 0.35)',
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    minHeight: 88,
  },
  billingCardDanger: {
    backgroundColor: colors.errorLight,
    borderColor: 'rgba(220, 53, 69, 0.35)',
  },
  billingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingEyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.honeyStrong,
  },
  billingCta: {
    marginTop: 2,
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  titleUnread: {
    fontFamily: typography.fonts.semibold,
  },
  text: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
