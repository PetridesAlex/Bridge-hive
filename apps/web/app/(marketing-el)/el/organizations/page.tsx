import type { Metadata } from 'next';

import { OrganizationsPage } from '@/components/marketing/pages/OrganizationsPage';
import { buildMarketingMetadata } from '@/lib/marketing-i18n/metadata';

export const metadata: Metadata = buildMarketingMetadata('organizations', 'el');

export default function Page() {
  return <OrganizationsPage locale="el" />;
}
