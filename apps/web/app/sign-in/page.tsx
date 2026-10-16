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
      eyebrow="Organization portal"
      title="Organization sign in"
      description="Access is provisioned by invitation; there is no open self-registration."
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
            <AuthFooterLink href="/">Back to public site</AuthFooterLink>
            <AuthFooterLink href="/contact#partnerships">
              Contact partnerships
            </AuthFooterLink>
          </nav>
        </>
      }
    >
      <SignInForm next={next} />
    </AuthShell>
  );
}
