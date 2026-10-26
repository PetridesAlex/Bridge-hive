import type { Metadata } from 'next';

import { RecruitmentPage } from '@/components/marketing/pages/RecruitmentPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('recruitment', 'el');

export default function Page() {
  return <RecruitmentPage locale="el" />;
}
