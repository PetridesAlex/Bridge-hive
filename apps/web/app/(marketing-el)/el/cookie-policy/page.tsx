import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CookiePolicyPage } from '@/components/marketing/pages/CookiePolicyPage';
import { cookiePolicyIsBlockedHere } from '@/lib/cookie-policy/content';

export const metadata: Metadata = {
  title: 'Πολιτική Cookies (προσχέδιο)',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://bridgehive.app/el/cookie-policy' },
};

export default function Page() {
  if (cookiePolicyIsBlockedHere()) notFound();
  return <CookiePolicyPage locale="el" />;
}
