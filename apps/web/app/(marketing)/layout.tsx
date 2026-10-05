import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';

import './marketing.css';
import { MarketingShell } from '@/components/marketing/MarketingShell';

const marketingFont = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-marketing',
  display: 'swap',
});

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
        url: '/marketing/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Bridge Hive',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/brand/bridge-hive-logo-v2-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/brand/bridge-hive-logo-v2-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      {
        url: '/brand/bridge-hive-logo-v2-180.png',
        sizes: '180x180',
        type: 'image/png',
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
  return (
    <div className={marketingFont.variable}>
      <MarketingShell>{children}</MarketingShell>
    </div>
  );
}
