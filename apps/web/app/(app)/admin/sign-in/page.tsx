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
      eyebrow="Admin console"
      title="Platform admin sign in"
      description="Sign in to the Bridge Hive administration console. This is platform oversight for authorized operators — not an organization account invitation."
      footer={
        <>
          <div className="auth-footer-support">
            <span className="auth-footer-support-mesh" aria-hidden="true" />
            <span className="auth-footer-support-sheen" aria-hidden="true" />
            <span className="auth-footer-support-line" aria-hidden="true" />
            <div className="auth-footer-support-body">
              <p className="auth-footer-kicker">Need access?</p>
              <a
                className="auth-footer-mail"
                href="mailto:support@bridgehive.app"
              >
                support@bridgehive.app
              </a>
            </div>
          </div>
          <nav className="auth-footer-nav" aria-label="Sign-in help">
            <span className="auth-footer-note">
              Looking for your hospital workspace?
            </span>
            <AuthFooterLink href="/sign-in">Organization sign in</AuthFooterLink>
          </nav>
        </>
      }
    >
      <AdminSignInForm next={next} />
    </AuthShell>
  );
}
