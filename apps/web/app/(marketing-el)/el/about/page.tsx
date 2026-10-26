import type { Metadata } from 'next';

import { AboutPage } from '@/components/marketing/pages/AboutPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('about', 'el');

export default function Page() {
  return <AboutPage locale="el" />;
}
