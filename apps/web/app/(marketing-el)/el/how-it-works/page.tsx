import type { Metadata } from 'next';

import { HowItWorksPage } from '@/components/marketing/pages/HowItWorksPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('howItWorks', 'el');

export default function Page() {
  return <HowItWorksPage locale="el" />;
}
