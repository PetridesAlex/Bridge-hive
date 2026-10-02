import { AuthFooterLink, AuthShell } from '@/components/auth/AuthShell';
import { safeOrgNext } from '@/lib/auth-redirect';

import { SignInForm } from './sign-in-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeOrgNext(params.next);

  return (
    <AuthShell
      variant="organization"
      title="Organization sign in"
      description="Sign in with your provisioned organization account to manage locations, wards, and shifts. Access is by invitation only — there is no open self-registration."
      panelEyebrow="For hospital organizations"
      panelTitle="Coordinate shifts with confidence"
      panelBody="Bridge Hive connects invited organizations to verified clinical professionals. Sign in only if your hospital has been provisioned by Bridge Hive."
      footer={
        <>
          <p>
            <AuthFooterLink href="/">Back to public site</AuthFooterLink>
          </p>
          <p>
            Exploring a partnership?{' '}
            <AuthFooterLink href="/contact#partnerships">
              Contact partnerships
            </AuthFooterLink>
          </p>
        </>
      }
    >
      <SignInForm next={next} />
    </AuthShell>
  );
}
