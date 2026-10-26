import type { Metadata } from 'next';

import { ProfessionalsPage } from '@/components/marketing/pages/ProfessionalsPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('professionals', 'el');

export default function Page() {
  return <ProfessionalsPage locale="el" />;
}
