import type { Metadata } from 'next';

import { ContactPage } from '@/components/marketing/pages/ContactPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('contact', 'el');

export default function Page() {
  return <ContactPage locale="el" />;
}
