import Link from 'next/link';

import { AuthHeroPanel } from '@/components/auth/AuthHeroPanel';
import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';

import '@/components/auth/auth-portal.css';

export type AuthPortalVariant = 'organization' | 'admin';

export function AuthShell({
  variant,
  title,
  description,
  eyebrow,
  children,
  footer,
}: {
  variant: AuthPortalVariant;
  title: string;
  description: string;
  eyebrow: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="auth-portal" data-variant={variant}>
      <div className="auth-portal-card">
        <AuthHeroPanel variant={variant} />

        <div className="auth-form-column">
          <div className="auth-form-card auth-rise">
            <div className="auth-mobile-brand">
              <BridgeHiveLogo />
              <p className="auth-hero-eyebrow" style={{ color: '#6b7c8a' }}>
                Healthcare Staffing Platform
              </p>
            </div>

            <p className="auth-form-eyebrow">{eyebrow}</p>
            <h1 className="auth-form-title">{title}</h1>
            <p className="auth-form-description">{description}</p>

            <div className="auth-form-body">{children}</div>

            <div className="auth-form-footer">{footer}</div>
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
    <Link href={href} className="font-medium">
      {children}
    </Link>
  );
}
