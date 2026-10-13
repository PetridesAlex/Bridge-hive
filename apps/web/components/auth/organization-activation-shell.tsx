import Link from 'next/link';

import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';

import '@/components/auth/organization-activation.css';

export type OrganizationActivationStep = 'confirm' | 'activate' | 'status';

const STEP_LABELS = {
  confirm: 'Verify invitation',
  activate: 'Create password',
} as const;

export function OrganizationActivationShell({
  step,
  title,
  description,
  children,
  footer,
  showOrgChrome = true,
}: {
  step: OrganizationActivationStep;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Org journey: eyebrow + stepper. Worker/generic confirm: logo only. */
  showOrgChrome?: boolean;
}) {
  const showStepper = showOrgChrome && step !== 'status';

  return (
    <div className="org-activation-canvas">
      <div className="org-activation-card bh-fade-up">
        <div className="org-activation-brand">
          <BridgeHiveLogo markSize={36} tone="light" />
          {showOrgChrome ? (
            <p className="org-activation-eyebrow">
              Bridge Hive · Organization access
            </p>
          ) : null}
        </div>

        {showStepper ? (
          <nav
            className="org-activation-stepper"
            aria-label="Organization activation steps"
          >
            <span
              className="org-activation-step"
              data-state={step === 'confirm' ? 'current' : 'upcoming'}
              aria-current={step === 'confirm' ? 'step' : undefined}
            >
              <span className="org-activation-step-dot" aria-hidden="true" />
              1 · {STEP_LABELS.confirm}
            </span>
            <span className="org-activation-step-rule" aria-hidden="true" />
            <span
              className="org-activation-step"
              data-state={step === 'activate' ? 'current' : 'upcoming'}
              aria-current={step === 'activate' ? 'step' : undefined}
            >
              <span className="org-activation-step-dot" aria-hidden="true" />
              2 · {STEP_LABELS.activate}
            </span>
          </nav>
        ) : null}

        <header className="org-activation-header">
          <h1 className="org-activation-title">{title}</h1>
          {description ? (
            <p className="org-activation-description">{description}</p>
          ) : null}
          {showOrgChrome && step !== 'status' ? (
            <p className="org-activation-secure">
              <span className="org-activation-secure-dot" aria-hidden="true" />
              Secure organization setup
            </p>
          ) : null}
        </header>

        <div className="org-activation-body">{children}</div>

        {footer ? (
          <div className="org-activation-footer-link">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function OrganizationActivationSignInFooter() {
  return (
    <>
      Already have access?{' '}
      <Link href="/sign-in">Back to sign in</Link>
    </>
  );
}
