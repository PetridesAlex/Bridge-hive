import type { Metadata } from 'next';

import { HomePage } from '@/components/marketing/pages/HomePage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('home', 'el');

export default function Page() {
  return <HomePage locale="el" />;
}
