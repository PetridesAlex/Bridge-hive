import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PrivacyPolicyPage } from '@/components/marketing/pages/PrivacyPolicyPage';
import { privacyPolicyIsBlockedHere } from '@/lib/privacy-policy/content';

export const metadata: Metadata = {
  title: 'Πολιτική Απορρήτου (προσχέδιο)',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://bridgehive.app/el/privacy-policy' },
};

export default function Page() {
  if (privacyPolicyIsBlockedHere()) notFound();
  return <PrivacyPolicyPage locale="el" />;
}
