import type { Metadata } from 'next';

import { RecruitmentApplyPage } from '@/components/marketing/pages/RecruitmentApplyPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('recruitmentApply', 'el');

export default function Page() {
  return <RecruitmentApplyPage locale="el" />;
}
