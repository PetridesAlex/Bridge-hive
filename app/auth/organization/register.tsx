import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell, AuthStepBar } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import { CYPRUS_CITIES } from '@/constants/roles';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import type { OrganizationType } from '@/types';

const STEPS = ['Organization', 'Contact', 'Details', 'Review'] as const;

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'PRIVATE_HOSPITAL', label: 'Private hospital' },
  { value: 'CLINIC', label: 'Clinic' },
  { value: 'MEDICAL_CENTRE', label: 'Medical centre' },
  { value: 'REHABILITATION', label: 'Rehabilitation' },
  { value: 'CARE_HOME', label: 'Care home' },
  { value: 'OTHER', label: 'Other' },
];

export default function OrganizationRegisterScreen() {
  const { signUpOrganization, session, loading, homeRoute } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<OrganizationType>('HOSPITAL');
  const [city, setCity] = useState<string>(CYPRUS_CITIES[0]);
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [mainPhone, setMainPhone] = useState('+357 ');
  const [mainEmail, setMainEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+357 ');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('HR Manager');

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  const validateStep = (): boolean => {
    setError(undefined);
    if (step === 1) {
      if (!organizationName.trim() || !address.trim()) {
        setError('Enter organization name and address.');
        return false;
      }
    }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 6) {
        setError('Enter primary contact name, email, and a password of at least 6 characters.');
        return false;
      }
    }
    if (step === 3) {
      if (!mainPhone.trim() || !mainEmail.trim()) {
        setError('Enter organization phone and email.');
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const back = () => {
    if (step === 1) {
      router.back();
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const onSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    const result = await signUpOrganization({
      firstName,
      lastName,
      email,
      phone,
      password,
      jobTitle,
      organizationName,
      organizationType,
      city,
      address,
      website: website.trim() || undefined,
      mainPhone,
      mainEmail,
      registrationNumber: registrationNumber.trim() || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirm) {
      Alert.alert(
        'Confirm your email',
        'We sent a confirmation link. After confirming, sign in to continue.\n\nFor faster testing, turn off Confirm email in Supabase Auth settings.',
        [{ text: 'Go to sign in', onPress: () => router.replace('/auth/organization/login') }],
      );
      return;
    }

    router.replace('/auth/organization/pending');
  };

  const typeLabel = ORG_TYPES.find((t) => t.value === organizationType)?.label ?? organizationType;
  const stepTitle = STEPS[step - 1];

  return (
    <AuthShell
      title="Organization registration"
      subtitle={`${stepTitle} · Step ${step} of ${STEPS.length}`}
      showBack={false}
      centered={false}
    >
      <AuthStepBar current={step} total={STEPS.length} />

      {step === 1 ? (
        <>
          <TextInput
            label="Organization name"
            value={organizationName}
            onChangeText={setOrganizationName}
            placeholder="e.g. Limassol General Hospital"
          />
          <Text style={styles.label}>Organization type</Text>
          <View style={styles.chipRow}>
            {ORG_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={organizationType === t.value}
                onPress={() => setOrganizationType(t.value)}
              />
            ))}
          </View>
          <Text style={styles.label}>City</Text>
          <View style={styles.chipRow}>
            {CYPRUS_CITIES.map((c) => (
              <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
            ))}
          </View>
          <TextInput label="Address" value={address} onChangeText={setAddress} placeholder="Street, building" />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <TextInput label="First name" value={firstName} onChangeText={setFirstName} />
          <TextInput label="Last name" value={lastName} onChangeText={setLastName} />
          <TextInput label="Job title" value={jobTitle} onChangeText={setJobTitle} />
          <TextInput
            label="Work email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <TextInput
            label="Organization phone"
            value={mainPhone}
            onChangeText={setMainPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            label="Organization email"
            value={mainEmail}
            onChangeText={setMainEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            label="Website (optional)"
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            placeholder="https://"
          />
          <TextInput
            label="Registration number (optional)"
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
          />
        </>
      ) : null}

      {step === 4 ? (
        <View style={styles.review}>
          <Text style={styles.reviewLine}>
            {organizationName} · {typeLabel}
          </Text>
          <Text style={styles.reviewLine}>
            {address}, {city}, Cyprus
          </Text>
          <Text style={styles.reviewLine}>
            Contact: {firstName} {lastName} ({jobTitle})
          </Text>
          <Text style={styles.reviewLine}>{email}</Text>
          <Text style={styles.hint}>
            Your organization will be pending verification. You won’t get marketplace access until approved.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Back" variant="ghost" onPress={back} style={styles.half} />
        {step < STEPS.length ? (
          <Button label="Continue" variant="primary" onPress={next} style={styles.half} />
        ) : (
          <Button
            label="Submit application"
            variant="primary"
            loading={submitting}
            onPress={onSubmit}
            style={styles.half}
          />
        )}
      </View>

      <Pressable onPress={() => router.replace('/auth/organization/login')}>
        <Text style={styles.signInLink}>Already registered? Sign in</Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  review: { gap: spacing.sm },
  reviewLine: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  half: { flex: 1 },
  signInLink: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.blue,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
