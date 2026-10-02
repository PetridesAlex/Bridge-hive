import type { Metadata } from 'next';

import './marketing.css';
import { MarketingShell } from '@/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: {
    default: 'Bridge Hive — Healthcare staffing platform',
    template: '%s | Bridge Hive',
  },
  description:
    'Bridge Hive connects healthcare organizations with verified registered nurses and ward assistants through structured shifts, review workflows, and clear account activation.',
  alternates: {
    canonical: 'https://bridgehive.app',
  },
  openGraph: {
    title: 'Bridge Hive — Healthcare staffing platform',
    description:
      'Connect organizations with verified registered nurses and ward assistants.',
    url: 'https://bridgehive.app',
    siteName: 'Bridge Hive',
    type: 'website',
    images: [
      {
        url: '/marketing/og-default.svg',
        width: 1200,
        height: 630,
        alt: 'Bridge Hive',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingShell>{children}</MarketingShell>;
}
