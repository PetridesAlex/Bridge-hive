import { Redirect, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountSettingsEntry } from '@/components/profile/AccountSettingsEntry';
import { HospitalFeedbackCard } from '@/components/profile/HospitalFeedbackCard';
import { NurseSkillsSection } from '@/components/profile/NurseSkillsSection';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileRatingSummary } from '@/components/profile/ProfileRatingSummary';
import { SectionIntro } from '@/components/profile/SectionIntro';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { mockHospitalFeedback } from '@/data/profileFeedback';
import { useAuth } from '@/providers/AuthProvider';
import { useProfileStore } from '@/store/profileStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { member, session, loading } = useAuth();
  const skills = useProfileStore((s) => s.skills);
  const addSkill = useProfileStore((s) => s.addSkill);
  const removeSkill = useProfileStore((s) => s.removeSkill);

  const hospitalReviews = useMemo(
    () =>
      [...mockHospitalFeedback].sort(
        (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime(),
      ),
    [],
  );

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }

  return (
    <AppScreen>
      <ScreenHeader title="Profile" subtitle="Professional nurse portfolio" />
      <ProfileHeader member={member} />

      <AccountSettingsEntry
        title="Account & credentials"
        subtitle="Personal details, documents, preferences, and settings"
        icon="folder-open-outline"
        onPress={() => router.push('/profile/account')}
      />

      <SectionIntro
        eyebrow="Skills"
        title="Clinical skills"
        subtitle="Add the skills hospitals should see on your profile."
        icon="medkit"
      />
      <NurseSkillsSection skills={skills} onAdd={addSkill} onRemove={removeSkill} />

      <SectionIntro
        eyebrow="Reputation"
        title="Hospital ratings"
        subtitle="Your score and star ratings from hospitals after completed shifts."
        icon="star"
      />
      <ProfileRatingSummary />
      <Text style={styles.reviewsLabel}>Recent ratings</Text>
      <View style={styles.list}>
        {hospitalReviews.map((item) => (
          <HospitalFeedbackCard key={item.id} item={item} />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  reviewsLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: colors.navyLift,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
});
