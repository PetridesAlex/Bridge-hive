import type { Metadata } from 'next';

import { LegalDocument } from '@/components/marketing/LegalDocument';
import { privacyPolicyContent } from '@/content/legal/privacy-policy';
import { legalPagesAreIndexable } from '@/content/legal/publication';

const indexable = legalPagesAreIndexable();

export const metadata: Metadata = {
  title: {
    absolute: 'Privacy Policy | BridgeHive Medical Recruitment Limited',
  },
  description:
    'Privacy Policy document layout for BridgeHive Medical Recruitment Limited. Legal wording is published only after owner and counsel approval.',
  alternates: {
    canonical: 'https://bridgehive.app/privacy',
  },
  robots: indexable
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function PrivacyPage() {
  return <LegalDocument content={privacyPolicyContent} />;
}
