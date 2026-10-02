import Link from 'next/link';

import { AuthMotif } from '@/components/auth/AuthMotif';

import '@/components/auth/auth-portal.css';

export type AuthPortalVariant = 'organization' | 'admin';

export function AuthShell({
  variant,
  title,
  description,
  panelEyebrow,
  panelTitle,
  panelBody,
  children,
  footer,
}: {
  variant: AuthPortalVariant;
  title: string;
  description: string;
  panelEyebrow: string;
  panelTitle: string;
  panelBody: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="auth-portal" data-variant={variant}>
      <div className="auth-portal-shell">
        <aside className="auth-portal-brand">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-bh-honey">
              Bridge Hive
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-sidebar-muted">
              {panelEyebrow}
            </p>
            <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
              {panelTitle}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-bh-sidebar-muted">
              {panelBody}
            </p>
          </div>
          <AuthMotif accent={variant === 'admin' ? 'honey' : 'teal'} />
        </aside>

        <div className="auth-portal-form-column">
          <div className="auth-portal-form-card auth-rise">
            <div className="mb-8 lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-honey-strong">
                Bridge Hive
              </p>
            </div>

            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                variant === 'admin' ? 'text-bh-honey-strong' : 'text-bh-teal-strong'
              }`}
            >
              {variant === 'admin' ? 'Restricted workspace' : 'Organization portal'}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bh-sidebar">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
              {description}
            </p>

            <div className="mt-8">{children}</div>

            <div className="mt-8 space-y-2 text-sm text-bh-text-muted">{footer}</div>

            <p className="mt-6 text-xs leading-relaxed text-bh-text-muted">
              Having trouble signing in? Contact{' '}
              <a
                href="mailto:support@bridgehive.app"
                className="font-medium text-bh-teal-strong underline-offset-2 hover:underline"
              >
                support@bridgehive.app
              </a>
              . Do not share passwords in email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-bh-teal-strong underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}
