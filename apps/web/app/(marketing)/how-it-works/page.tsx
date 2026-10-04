import type { Metadata } from 'next';

import { HowItWorksClient } from '@/components/marketing/HowItWorksClient';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Role-specific journeys for healthcare organizations and professionals on Bridge Hive.',
  alternates: { canonical: 'https://bridgehive.app/how-it-works' },
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
