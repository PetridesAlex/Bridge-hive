import { MarketingButton } from '@/components/marketing/Section';

/** Original editorial workflow motif — abstract shift/ward composition. */
export function WorkflowMotif() {
  return (
    <div className="marketing-motif" aria-hidden="true">
      <svg
        viewBox="0 0 520 416"
        className="absolute inset-0 h-full w-full"
        role="img"
      >
        <defs>
          <linearGradient id="mTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16a6b6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#087f8c" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="mHoney" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0aa18" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c9920f" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="mPanel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123a55" />
            <stop offset="100%" stopColor="#0a2438" />
          </linearGradient>
        </defs>

        <circle cx="430" cy="72" r="90" fill="#16a6b6" opacity="0.12" />
        <circle cx="70" cy="340" r="70" fill="#e0aa18" opacity="0.1" />

        <rect x="40" y="44" width="196" height="132" rx="18" fill="url(#mTeal)" opacity="0.28" />
        <rect x="56" y="64" width="110" height="10" rx="5" fill="#edf3f5" opacity="0.55" />
        <rect x="56" y="88" width="148" height="8" rx="4" fill="#dce8ee" opacity="0.35" />
        <rect x="56" y="108" width="96" height="8" rx="4" fill="#dce8ee" opacity="0.28" />
        <rect x="56" y="136" width="64" height="22" rx="11" fill="#e0aa18" opacity="0.85" />

        <rect x="256" y="56" width="220" height="108" rx="18" fill="#123a55" opacity="0.9" />
        <rect x="276" y="78" width="72" height="8" rx="4" fill="#91a8b5" opacity="0.55" />
        <rect x="276" y="98" width="168" height="10" rx="5" fill="#dce8ee" opacity="0.45" />
        <rect x="276" y="120" width="120" height="8" rx="4" fill="#16a6b6" opacity="0.55" />

        <rect
          x="48"
          y="200"
          width="300"
          height="168"
          rx="22"
          fill="url(#mPanel)"
          stroke="#16a6b6"
          strokeOpacity="0.35"
        />
        <circle cx="108" cy="268" r="28" fill="url(#mHoney)" />
        <rect x="156" y="248" width="148" height="12" rx="6" fill="#edf3f5" opacity="0.7" />
        <rect x="156" y="274" width="112" height="9" rx="4.5" fill="#91a8b5" opacity="0.55" />
        <rect x="156" y="300" width="176" height="9" rx="4.5" fill="#91a8b5" opacity="0.35" />
        <rect x="72" y="332" width="88" height="18" rx="9" fill="#16a6b6" opacity="0.75" />
        <rect x="172" y="332" width="72" height="18" rx="9" fill="#dce8ee" opacity="0.2" />

        <path
          d="M372 236c36-52 92-62 132-24"
          fill="none"
          stroke="#16a6b6"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <circle cx="504" cy="212" r="11" fill="#16a6b6" />
        <circle cx="392" cy="248" r="6" fill="#e0aa18" opacity="0.9" />

        <rect x="372" y="280" width="116" height="88" rx="16" fill="#0f334c" opacity="0.95" />
        <rect x="390" y="302" width="80" height="8" rx="4" fill="#dce8ee" opacity="0.4" />
        <rect x="390" y="322" width="56" height="8" rx="4" fill="#16a6b6" opacity="0.5" />
        <rect x="390" y="342" width="68" height="8" rx="4" fill="#91a8b5" opacity="0.35" />
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <div className="marketing-hero-grid">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pb-28 lg:pt-24">
        <div>
          <p className="marketing-rise text-[12px] font-semibold uppercase tracking-[0.18em] text-bh-honey-strong">
            Bridge Hive
          </p>
          <h1 className="marketing-rise marketing-rise-delay-1 mt-4 max-w-xl text-[var(--m-display)] font-semibold leading-[1.08] tracking-tight text-bh-sidebar">
            Healthcare staffing, structured for clarity
          </h1>
          <p className="marketing-rise marketing-rise-delay-2 mt-6 max-w-lg text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
            Connect hospitals and care organizations with verified registered nurses
            and ward assistants. Publish role-specific shifts, review eligibility, and
            manage timesheets through a clear operational workflow.
          </p>
          <div className="marketing-rise marketing-rise-delay-3 mt-8 flex flex-wrap gap-3">
            <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
            <MarketingButton href="/auth/worker/login" variant="secondary">
              Worker app continuation
            </MarketingButton>
          </div>
          <p className="mt-5 text-sm text-bh-text-muted">
            New organization?{' '}
            <a
              href="/contact"
              className="font-medium text-bh-teal-strong underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal-strong"
            >
              Prepare an inquiry
            </a>
            . Accounts are provisioned by Bridge Hive — not open self-registration.
          </p>
          <p className="mt-2 text-sm text-bh-text-muted">
            Professionals: the continuation page opens the Bridge Hive worker app after
            email confirmation — it is not a full web app.
          </p>
        </div>
        <div className="marketing-rise marketing-rise-delay-2">
          <WorkflowMotif />
        </div>
      </div>
    </div>
  );
}
