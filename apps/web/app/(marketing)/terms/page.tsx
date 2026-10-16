import type { Metadata } from 'next';

import { LegalDocument } from '@/components/marketing/LegalDocument';
import { legalPagesAreIndexable } from '@/content/legal/publication';
import { termsOfServiceContent } from '@/content/legal/terms-of-service';

const indexable = legalPagesAreIndexable();

export const metadata: Metadata = {
  title: {
    absolute: 'Terms of Service | BridgeHive Medical Recruitment Limited',
  },
  description:
    'Terms of Service document layout for BridgeHive Medical Recruitment Limited. Legal wording is published only after owner and counsel approval.',
  alternates: {
    canonical: 'https://bridgehive.app/terms',
  },
  robots: indexable
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function TermsPage() {
  return <LegalDocument content={termsOfServiceContent} />;
}
