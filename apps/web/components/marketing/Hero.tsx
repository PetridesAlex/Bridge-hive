import Link from 'next/link';

import { MarketingButton } from '@/components/marketing/Section';

/** Original illustrative staffing motif — no private worker names or live counts. */
export function WorkflowMotif() {
  return (
    <div className="m-motif" aria-hidden="true">
      <svg className="m-connect-line" viewBox="0 0 400 320" fill="none">
        <path
          className="m-connect-path"
          d="M90 90C140 120 180 150 210 190C240 230 280 250 330 240"
          stroke="#E4B334"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          strokeLinecap="round"
        />
        <circle cx="90" cy="90" r="4" fill="#14A9B5" />
        <circle cx="210" cy="190" r="4" fill="#E4B334" />
        <circle cx="330" cy="240" r="4" fill="#14A9B5" />
      </svg>

      <article className="m-shift-card m-shift-card--a">
        <p className="m-shift-label">Shift slot</p>
        <p className="m-shift-title">Registered nurse · Night</p>
        <p className="m-shift-meta">Ward A · illustrative opening</p>
        <span className="m-shift-pill">Role-matched</span>
      </article>

      <article className="m-shift-card m-shift-card--b">
        <p className="m-shift-label">Verified professional</p>
        <p className="m-shift-title">Credential package reviewed</p>
        <p className="m-shift-meta">Admin approval before access</p>
        <span className="m-shift-pill">Not automatic</span>
      </article>

      <article className="m-shift-card m-shift-card--c">
        <p className="m-shift-label">Organization location</p>
        <p className="m-shift-title">Hospital unit · connected</p>
        <p className="m-shift-meta">Publish → claim → review → pay</p>
        <span className="m-shift-pill">Illustrative</span>
      </article>

      <p className="m-motif-caption">Illustrative motif · not live data</p>
    </div>
  );
}

export function Hero() {
  return (
    <div className="m-hero">
      <div className="m-hero-inner">
        <div>
          <p className="m-eyebrow m-rise">Healthcare staffing platform</p>
          <h1 className="m-rise m-rise-d1">
            Connect care organizations with verified nurses and ward assistants
          </h1>
          <p className="m-hero-sub m-rise m-rise-d2">
            Bridge Hive structures role-specific shifts, credential review, timesheets,
            and clear payment paths — so hospitals and professionals each know their next
            step.
          </p>
          <div className="m-hero-ctas m-rise m-rise-d3">
            <MarketingButton href="/contact#partnerships" variant="on-dark">
              Partnership inquiry
            </MarketingButton>
            <MarketingButton href="/professionals" variant="on-dark-secondary">
              Explore for professionals
            </MarketingButton>
          </div>
          <div className="m-hero-meta m-rise m-rise-d4">
            <Link href="/organizations" className="m-link-quiet m-link-quiet--on-dark">
              Explore for organizations
            </Link>
            <Link href="/sign-in" className="m-link-quiet m-link-quiet--on-dark">
              Organization sign in
            </Link>
            <Link
              href="/auth/worker/login"
              className="m-link-quiet m-link-quiet--on-dark"
            >
              Worker app continuation
            </Link>
          </div>
          <p className="m-rise m-rise-d4 mt-4 max-w-lg text-sm text-[rgba(220,232,238,0.55)]">
            New organization?{' '}
            <a
              href="/contact#partnerships"
              className="font-medium text-[var(--m-honey)] underline-offset-2 hover:underline"
            >
              Prepare an inquiry
            </a>
            . Accounts are provisioned by Bridge Hive — not open self-registration.
          </p>
        </div>
        <div className="m-rise m-rise-d2">
          <WorkflowMotif />
        </div>
      </div>
    </div>
  );
}
