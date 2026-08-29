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
import type { ProfessionalRoleCode } from '@/types';

const STEPS = [
  'Account',
  'Role',
  'Location',
  'Professional',
  'Documents',
  'Availability',
  'Review',
] as const;

const DEPARTMENTS = ['A&E', 'ICU', 'Ward', 'Theatre', 'Maternity', 'Paediatrics'];
const SHIFT_TYPES: Array<'day' | 'night'> = ['day', 'night'];

export default function ProfessionalRegisterScreen() {
  const { signUpProfessional, session, loading, homeRoute } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+357 ');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState<ProfessionalRoleCode>('REGISTERED_NURSE');
  const [city, setCity] = useState<string>(CYPRUS_CITIES[0]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [yearsExperience, setYearsExperience] = useState('2');
  const [speciality, setSpeciality] = useState('');
  const [availableForShifts, setAvailableForShifts] = useState(true);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([CYPRUS_CITIES[0]]);
  const [preferredDepartments, setPreferredDepartments] = useState<string[]>(['Ward']);
  const [preferredShiftTypes, setPreferredShiftTypes] = useState<Array<'day' | 'night'>>(['day']);

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  const toggle = <T extends string>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const validateStep = (): boolean => {
    setError(undefined);
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 6) {
        setError('Enter your name, email, and a password of at least 6 characters.');
        return false;
      }
    }
    if (step === 3 && !city) {
      setError('Select your city.');
      return false;
    }
    if (step === 4) {
      const years = Number(yearsExperience);
      if (!Number.isFinite(years) || years < 0) {
        setError('Enter valid years of experience.');
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
    const result = await signUpProfessional({
      email,
      password,
      firstName,
      lastName,
      phone,
      roleCode,
      city,
      registrationNumber: registrationNumber.trim() || undefined,
      yearsExperience: Number(yearsExperience) || 0,
      speciality: speciality.trim() || undefined,
      availableForShifts,
      preferredLocations,
      preferredDepartments,
      preferredShiftTypes,
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
        [{ text: 'Go to sign in', onPress: () => router.replace('/auth/professional/login') }],
      );
      return;
    }

    router.replace('/auth/professional/pending');
  };

  const roleLabel = roleCode === 'WARD_ASSISTANT' ? 'Ward Assistant' : 'Registered Nurse';
  const stepTitle = STEPS[step - 1];

  return (
    <AuthShell
      title="Professional registration"
      subtitle={`${stepTitle} · Step ${step} of ${STEPS.length}`}
      showBack={false}
      centered={false}
    >
      <AuthStepBar current={step} total={STEPS.length} />

      {step === 1 ? (
        <>
          <TextInput label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
          <TextInput label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={styles.label}>Your role</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Registered Nurse"
              selected={roleCode === 'REGISTERED_NURSE'}
              onPress={() => setRoleCode('REGISTERED_NURSE')}
            />
            <Chip
              label="Ward Assistant"
              selected={roleCode === 'WARD_ASSISTANT'}
              onPress={() => setRoleCode('WARD_ASSISTANT')}
            />
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text style={styles.label}>Primary city</Text>
          <View style={styles.chipRow}>
            {CYPRUS_CITIES.map((c) => (
              <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
            ))}
          </View>
          <Text style={styles.hint}>Cyprus market · more countries later</Text>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <TextInput
            label="Registration number (optional)"
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder="Council / license number"
          />
          <TextInput
            label="Years of experience"
            value={yearsExperience}
            onChangeText={setYearsExperience}
            keyboardType="number-pad"
          />
          <TextInput
            label="Speciality (optional)"
            value={speciality}
            onChangeText={setSpeciality}
            placeholder="e.g. ICU, Paediatrics"
          />
        </>
      ) : null}

      {step === 5 ? (
        <View style={styles.docBox}>
          <Text style={styles.docTitle}>Documents</Text>
          <Text style={styles.docBody}>
            Upload will be enabled after verification review. For now you can continue — we’ll ask for
            license, ID, and certificates when your application is reviewed.
          </Text>
          <Text style={styles.docStub}>• Professional license — Coming soon</Text>
          <Text style={styles.docStub}>• Government ID — Coming soon</Text>
          <Text style={styles.docStub}>• Certificates — Coming soon</Text>
        </View>
      ) : null}

      {step === 6 ? (
        <>
          <Text style={styles.label}>Available for shifts?</Text>
          <View style={styles.chipRow}>
            <Chip label="Yes" selected={availableForShifts} onPress={() => setAvailableForShifts(true)} />
            <Chip label="Not yet" selected={!availableForShifts} onPress={() => setAvailableForShifts(false)} />
          </View>
          <Text style={styles.label}>Preferred locations</Text>
          <View style={styles.chipRow}>
            {CYPRUS_CITIES.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={preferredLocations.includes(c)}
                onPress={() => toggle(preferredLocations, c, setPreferredLocations)}
              />
            ))}
          </View>
          <Text style={styles.label}>Preferred departments</Text>
          <View style={styles.chipRow}>
            {DEPARTMENTS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={preferredDepartments.includes(d)}
                onPress={() => toggle(preferredDepartments, d, setPreferredDepartments)}
              />
            ))}
          </View>
          <Text style={styles.label}>Shift types</Text>
          <View style={styles.chipRow}>
            {SHIFT_TYPES.map((t) => (
              <Chip
                key={t}
                label={t === 'day' ? 'Day' : 'Night'}
                selected={preferredShiftTypes.includes(t)}
                onPress={() => toggle(preferredShiftTypes, t, setPreferredShiftTypes)}
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 7 ? (
        <View style={styles.review}>
          <Text style={styles.reviewLine}>
            {firstName} {lastName} · {email}
          </Text>
          <Text style={styles.reviewLine}>
            {roleLabel} · {city}, Cyprus
          </Text>
          <Text style={styles.reviewLine}>
            Experience: {yearsExperience} yrs
            {speciality ? ` · ${speciality}` : ''}
          </Text>
          <Text style={styles.reviewLine}>
            Availability: {availableForShifts ? 'Open to shifts' : 'Not yet'}
          </Text>
          <Text style={styles.hint}>Submitting starts verification — you won’t be verified automatically.</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Back" variant="ghost" onPress={back} style={styles.half} />
        {step < STEPS.length ? (
          <Button label="Continue" variant="brand" onPress={next} style={styles.half} />
        ) : (
          <Button
            label="Submit application"
            variant="brand"
            loading={submitting}
            onPress={onSubmit}
            style={styles.half}
          />
        )}
      </View>

      <Pressable onPress={() => router.replace('/auth/professional/login')}>
        <Text style={styles.signInLink}>Already have an account? Sign in</Text>
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
  docBox: {
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
  },
  docTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  docBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  docStub: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
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
