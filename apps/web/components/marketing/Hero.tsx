import { MarketingButton } from '@/components/marketing/Section';

/** Abstract shift / ward workflow motif — original SVG, not stock photography. */
export function WorkflowMotif() {
  return (
    <div className="marketing-motif" aria-hidden="true">
      <svg
        viewBox="0 0 480 384"
        className="absolute inset-0 h-full w-full"
        role="img"
      >
        <defs>
          <linearGradient id="mTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16a6b6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#087f8c" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="mHoney" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0aa18" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#c9920f" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x="36" y="48" width="168" height="120" rx="14" fill="url(#mTeal)" opacity="0.35" />
        <rect x="220" y="72" width="200" height="88" rx="14" fill="#dce8ee" opacity="0.12" />
        <rect x="56" y="196" width="248" height="112" rx="16" fill="#0b2a43" stroke="#16a6b6" strokeOpacity="0.4" />
        <circle cx="112" cy="252" r="22" fill="url(#mHoney)" />
        <rect x="152" y="236" width="120" height="10" rx="5" fill="#dce8ee" opacity="0.55" />
        <rect x="152" y="258" width="88" height="8" rx="4" fill="#91a8b5" opacity="0.55" />
        <path
          d="M320 220c28-40 72-48 104-20"
          fill="none"
          stroke="#16a6b6"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="424" cy="200" r="10" fill="#16a6b6" />
        <text x="72" y="88" fill="#dce8ee" fontSize="11" fontFamily="system-ui" opacity="0.7">
          SHIFT BOARD
        </text>
        <text x="240" y="112" fill="#dce8ee" fontSize="11" fontFamily="system-ui" opacity="0.55">
          ROLE · WARD · TIME
        </text>
        <text x="152" y="292" fill="#91a8b5" fontSize="10" fontFamily="system-ui" opacity="0.7">
          Verified professionals only
        </text>
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <div className="marketing-hero-grid">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pb-28 lg:pt-24">
        <div>
          <p className="marketing-rise text-[12px] font-semibold uppercase tracking-[0.18em] text-bh-honey">
            Bridge Hive
          </p>
          <h1 className="marketing-rise marketing-rise-delay-1 mt-4 max-w-xl text-[var(--m-display)] font-semibold leading-[1.08] tracking-tight text-bh-sidebar">
            Healthcare staffing, structured for clarity
          </h1>
          <p className="marketing-rise marketing-rise-delay-2 mt-6 max-w-lg text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
            Connect hospitals and care organizations with verified registered nurses
            and ward assistants. Publish role-specific shifts, review eligibility, and
            manage timesheets — without inventing availability that isn&apos;t there.
          </p>
          <div className="marketing-rise marketing-rise-delay-3 mt-8 flex flex-wrap gap-3">
            <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
            <MarketingButton href="/auth/worker/login" variant="secondary">
              For professionals
            </MarketingButton>
          </div>
          <p className="mt-5 text-sm text-bh-text-muted">
            New organization?{' '}
            <a href="/contact" className="font-medium text-bh-teal-strong underline-offset-2 hover:underline">
              Send an inquiry
            </a>
            . Accounts are provisioned by Bridge Hive — not open self-registration.
          </p>
        </div>
        <div className="marketing-rise marketing-rise-delay-2">
          <WorkflowMotif />
          <p className="mt-3 text-xs text-bh-text-muted">
            Illustration: original workflow motif. Licensed clinical photography TBD.
          </p>
        </div>
      </div>
    </div>
  );
}
