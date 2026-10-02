import { redirect } from 'next/navigation';

import { AuthFooterLink, AuthShell } from '@/components/auth/AuthShell';
import { getPlatformAdminContext } from '@/lib/admin/auth';
import { safeAdminNext } from '@/lib/auth-redirect';

import { AdminSignInForm } from './admin-sign-in-form';

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const existing = await getPlatformAdminContext();
  if (existing) {
    redirect('/admin');
  }

  const params = await searchParams;
  const next = safeAdminNext(params.next);

  return (
    <AuthShell
      variant="admin"
      title="Platform admin sign in"
      description="Access is limited to granted platform administrators. Accounts are provisioned by Bridge Hive — there is no public registration for this console."
      panelEyebrow="Platform administration"
      panelTitle="Operate the Bridge Hive platform"
      panelBody="Use this portal only if you hold a platform admin role. Organization teams should sign in through the organization portal instead."
      footer={
        <>
          <p>
            Looking for your hospital workspace?{' '}
            <AuthFooterLink href="/sign-in">Organization sign in</AuthFooterLink>
          </p>
        </>
      }
    >
      <AdminSignInForm next={next} />
    </AuthShell>
  );
}
