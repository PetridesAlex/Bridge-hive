import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { CalendarSyncSection } from '@/components/profile/CalendarSyncSection';
import { NotificationSettingsSection } from '@/components/profile/NotificationSettingsSection';
import { PaymentInfoSection } from '@/components/profile/PaymentInfoSection';
import { PersonalInfoSection } from '@/components/profile/PersonalInfoSection';
import { PreferenceChipsSection } from '@/components/profile/PreferenceChipsSection';
import { ProfessionalInfoSection } from '@/components/profile/ProfessionalInfoSection';
import { ProfileDetailList } from '@/components/profile/ProfileDetailList';
import { QualificationsSection } from '@/components/profile/QualificationsSection';
import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useProfileStore } from '@/store/profileStore';

function EditHeaderButton({ label }: { label: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert('Edit', 'Editing will be available in a future update.')}
      style={({ pressed }) => [styles.editBtn, pressed && styles.editPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.editLabel}>Edit</Text>
    </Pressable>
  );
}

export default function ProfileSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { member } = useAuth();
  const availability = useProfileStore((s) => s.availability);

  if (section === 'personal') {
    return (
      <AppScreen>
        <ScreenHeader
          title="Personal Information"
          showBack
          right={<EditHeaderButton label="Edit personal information" />}
        />
        <PersonalInfoSection member={member} />
      </AppScreen>
    );
  }

  if (section === 'professional') {
    return (
      <AppScreen>
        <ScreenHeader
          title="Professional Information"
          showBack
          right={<EditHeaderButton label="Edit professional information" />}
        />
        <ProfessionalInfoSection member={member} />
      </AppScreen>
    );
  }

  if (section === 'experience') {
    return (
      <AppScreen>
        <ScreenHeader title="Work Experience" showBack />
        <WorkExperienceSection member={member} />
      </AppScreen>
    );
  }

  if (section === 'qualifications') {
    return (
      <AppScreen>
        <ScreenHeader
          title="Qualifications"
          showBack
          right={<EditHeaderButton label="Edit qualifications" />}
        />
        <QualificationsSection />
      </AppScreen>
    );
  }

  if (section === 'locations') {
    return (
      <AppScreen>
        <ScreenHeader title="Preferred Locations" showBack />
        <PreferenceChipsSection
          title="Cities"
          items={availability.preferredLocations}
          icon="location-outline"
          emptyMessage="No preferred locations selected yet."
          help="We prioritize shift suggestions near the cities you prefer."
        />
      </AppScreen>
    );
  }

  if (section === 'departments') {
    return (
      <AppScreen>
        <ScreenHeader title="Preferred Departments" showBack />
        <PreferenceChipsSection
          title="Departments"
          items={availability.preferredDepartments}
          icon="business-outline"
          emptyMessage="No preferred departments selected yet."
          help="Match more often with wards and units that fit your experience."
        />
      </AppScreen>
    );
  }

  if (section === 'payment') {
    return (
      <AppScreen>
        <ScreenHeader
          title="Payment information"
          showBack
          right={<EditHeaderButton label="Edit payment information" />}
        />
        <PaymentInfoSection />
      </AppScreen>
    );
  }

  if (section === 'emergency') {
    return (
      <AppScreen>
        <ScreenHeader
          title="Emergency Contact"
          showBack
          right={<EditHeaderButton label="Edit emergency contact" />}
        />
        <ProfileDetailList
          sectionLabel="Primary contact"
          help="This person may be contacted if there is an urgent issue during a shift."
          rows={[
            { label: 'Name', value: 'Andreas Ioannou', icon: 'person-outline' },
            { label: 'Relationship', value: 'Spouse', icon: 'heart-outline' },
            { label: 'Phone', value: '+357 99 654321', icon: 'call-outline' },
          ]}
        />
      </AppScreen>
    );
  }

  if (section === 'settings') {
    return (
      <AppScreen>
        <ScreenHeader title="Notification settings" showBack />
        <NotificationSettingsSection />
      </AppScreen>
    );
  }

  if (section === 'calendar') {
    return (
      <AppScreen>
        <ScreenHeader title="Calendar Sync" showBack />
        <CalendarSyncSection />
      </AppScreen>
    );
  }

  if (section === 'support') {
    return (
      <AppScreen>
        <ScreenHeader title="Support" showBack />
        <ProfileDetailList
          sectionLabel="Get help"
          help="Our Cyprus support team is available during business hours for shift and payout questions."
          rows={[
            { label: 'Email', value: 'support@healthbridge.cy', icon: 'mail-outline' },
            { label: 'Phone', value: '+357 22 000000', icon: 'call-outline' },
            { label: 'Hours', value: 'Mon–Fri 08:00–18:00', icon: 'time-outline' },
          ]}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScreenHeader title="Profile" showBack />
      <ProfileDetailList
        rows={[{ label: 'Info', value: 'Section coming soon.', icon: 'information-circle-outline' }]}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.blueLight,
  },
  editPressed: {
    opacity: 0.85,
  },
  editLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
});
