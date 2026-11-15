import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CookiePolicyPage } from '@/components/marketing/pages/CookiePolicyPage';
import { cookiePolicyIsBlockedHere } from '@/lib/cookie-policy/content';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://bridgehive.app/cookie-policy' },
};

export default function Page() {
  if (cookiePolicyIsBlockedHere()) notFound();
  return <CookiePolicyPage locale="en" />;
}
