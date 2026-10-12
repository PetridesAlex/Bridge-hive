import { redirect } from 'next/navigation';

import { requireAuthBundle } from '@/lib/auth';

/**
 * British-spelling entry to organization recruitment.
 * Resolves membership like /organisation → /dashboard, then into the portal.
 */
export default async function OrganisationRecruitmentAliasPage() {
  const bundle = await requireAuthBundle();
  const memberships = bundle.memberships;

  if (memberships.length === 0) {
    redirect('/dashboard');
  }

  if (memberships.length === 1) {
    redirect(`/org/${memberships[0]!.organization.slug}/recruitment`);
  }

  redirect('/dashboard?next=recruitment');
}
