import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { EarningsCard } from '@/components/home/EarningsCard';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { HomeSecondaryCards } from '@/components/home/HomeSecondaryCards';
import { NextShiftCard } from '@/components/home/NextShiftCard';
import { ShiftCard } from '@/components/shifts/ShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useCommunityStore } from '@/store/communityStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useProfileStore } from '@/store/profileStore';
import {
  selectAvailableShifts,
  selectCompletedShifts,
  selectNextShift,
  selectUpcomingShifts,
  useShiftStore,
} from '@/store/shiftStore';

const HOURS_GOAL = 80;

export default function HomeScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const shifts = useShiftStore((s) => s.shifts);
  const posts = useCommunityStore((s) => s.posts);
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const documents = useProfileStore((s) => s.documents);

  const nextShift = selectNextShift(shifts, member.id);
  const available = selectAvailableShifts(shifts).slice(0, 3);

  const monthPrefix = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthShifts = useMemo(() => {
    return [
      ...selectCompletedShifts(shifts, member.id),
      ...selectUpcomingShifts(shifts, member.id),
    ].filter((s) => s.date.startsWith(monthPrefix));
  }, [shifts, member.id, monthPrefix]);

  const hoursThisMonth = useMemo(
    () => monthShifts.reduce((sum, s) => sum + s.durationHours, 0),
    [monthShifts],
  );

  const shiftsCompletedThisMonth = useMemo(
    () =>
      selectCompletedShifts(shifts, member.id).filter((s) => s.date.startsWith(monthPrefix)).length,
    [shifts, member.id, monthPrefix],
  );

  const expiringDocs = documents.filter((d) => d.verificationStatus === 'EXPIRING_SOON').length;
  const verifiedDocs = documents.filter((d) => d.verificationStatus === 'VERIFIED').length;

  return (
    <AppScreen contentStyle={styles.content}>
      <GreetingHeader member={member} unreadCount={unreadCount} />
      <EarningsCard member={member} />

      {nextShift ? (
        <>
          <SectionHeader title="Upcoming" eyebrow="Next on your schedule" />
          <NextShiftCard shift={nextShift} />
        </>
      ) : null}

      <SectionHeader
        title="Available Shifts"
        eyebrow="Open marketplace"
        actionLabel="View All"
        onAction={() => router.push('/(tabs)/shifts')}
      />
      {available.map((shift) => (
        <ShiftCard key={shift.id} shift={shift} showStatus={false} />
      ))}

      <SectionHeader title="Professional hub" eyebrow="Stay ready" />
      <HomeSecondaryCards
        communityCount={posts.length}
        communityUnread={posts.length}
        documentsExpiring={expiringDocs}
        documentsVerified={verifiedDocs}
        hoursThisMonth={hoursThisMonth}
        hoursGoal={HOURS_GOAL}
        shiftsCompletedThisMonth={shiftsCompletedThisMonth}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
    paddingBottom: spacing.huge,
  },
});
