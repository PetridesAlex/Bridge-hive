import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PrivacyPolicyPage } from '@/components/marketing/pages/PrivacyPolicyPage';
import { privacyPolicyIsBlockedHere } from '@/lib/privacy-policy/content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://bridgehive.app/privacy-policy' },
};

export default function Page() {
  if (privacyPolicyIsBlockedHere()) notFound();
  return <PrivacyPolicyPage locale="en" />;
}
