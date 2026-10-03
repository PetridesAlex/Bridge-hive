import { CalendarDays, CheckCircle2, ClipboardList, Wallet } from 'lucide-react';

type AuthPortalVariant = 'organization' | 'admin';

type WorkflowStep = {
  label: string;
  detail: string;
  Icon: typeof CalendarDays;
  tone: 'blue' | 'violet' | 'gold' | 'teal';
};

const ORG_STEPS: WorkflowStep[] = [
  {
    label: 'Publish shifts',
    detail: 'Open roles with clear times and locations',
    Icon: CalendarDays,
    tone: 'blue',
  },
  {
    label: 'Qualified claims',
    detail: 'Verified professionals accept eligible work',
    Icon: CheckCircle2,
    tone: 'teal',
  },
  {
    label: 'Review timesheets',
    detail: 'Approve submitted hours with confidence',
    Icon: ClipboardList,
    tone: 'violet',
  },
  {
    label: 'Pay workers',
    detail: 'Settle approved gross amounts by bank transfer',
    Icon: Wallet,
    tone: 'gold',
  },
];

const ADMIN_STEPS: WorkflowStep[] = [
  {
    label: 'Review organizations',
    detail: 'Activate hospitals when profiles are complete',
    Icon: CheckCircle2,
    tone: 'blue',
  },
  {
    label: 'Verify professionals',
    detail: 'Credential packages before marketplace access',
    Icon: ClipboardList,
    tone: 'violet',
  },
  {
    label: 'Monitor operations',
    detail: 'Keep shifts, timesheets, and payouts orderly',
    Icon: CalendarDays,
    tone: 'teal',
  },
  {
    label: 'Platform oversight',
    detail: 'Maintain a clear view of platform operations.',
    Icon: Wallet,
    tone: 'gold',
  },
];

/** Presentational glass card — capability workflow only; never live metrics. */
export function AuthPlatformActivity({
  variant = 'organization',
}: {
  variant?: AuthPortalVariant;
}) {
  const steps = variant === 'admin' ? ADMIN_STEPS : ORG_STEPS;
  const title =
    variant === 'admin' ? 'Platform oversight' : 'How Bridge Hive works';

  return (
    <div
      className="auth-activity"
      aria-label={
        variant === 'admin'
          ? 'Platform oversight capabilities'
          : 'How Bridge Hive works'
      }
    >
      <div className="auth-activity-head">
        <p className="auth-activity-title">{title}</p>
        <span className="auth-activity-badge" title="Capability overview only">
          Overview
        </span>
      </div>

      <ol className="auth-activity-steps">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="auth-activity-step"
            data-tone={step.tone}
          >
            <span className="auth-activity-step-icon" aria-hidden="true">
              <step.Icon size={15} strokeWidth={1.75} />
            </span>
            <span className="auth-activity-step-copy">
              <span className="auth-activity-step-label">
                <span className="auth-activity-step-index" aria-hidden="true">
                  {index + 1}.
                </span>{' '}
                {step.label}
              </span>
              <span className="auth-activity-step-detail">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="auth-activity-ornament" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
