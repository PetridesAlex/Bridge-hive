import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Organization portal',
  robots: { index: false, follow: false },
};

/**
 * Friendly British-spelling entry to the organization portal.
 * Auth is enforced by middleware (not public). Membership selection lives on /dashboard.
 */
export default function OrganisationPortalPage() {
  redirect('/dashboard');
}
