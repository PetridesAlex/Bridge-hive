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
      eyebrow="Admin Console"
      title="Platform Admin Sign In"
      description="Access the Bridge Hive administration dashboard. Manage organizations, monitor activity, and oversee the platform."
      footer={
        <>
          <div className="auth-footer-support">
            <p className="auth-footer-kicker">Need access?</p>
            <a
              className="auth-footer-mail"
              href="mailto:support@bridgehive.app"
            >
              support@bridgehive.app
            </a>
          </div>
          <nav className="auth-footer-nav" aria-label="Sign-in help">
            <span className="auth-footer-note">
              Looking for your hospital workspace?
            </span>
            <AuthFooterLink href="/sign-in">Organization Sign In</AuthFooterLink>
          </nav>
        </>
      }
    >
      <AdminSignInForm next={next} />
    </AuthShell>
  );
}
