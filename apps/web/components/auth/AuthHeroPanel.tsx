import Image from 'next/image';
import { CalendarDays, ShieldCheck, Users } from 'lucide-react';

import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';

type AuthPortalVariant = 'organization' | 'admin';

const ORG_FEATURES = [
  { label: 'Verified professionals', Icon: ShieldCheck },
  { label: 'Structured shifts', Icon: CalendarDays },
  { label: 'Clear workflows', Icon: Users },
] as const;

const ADMIN_FEATURES = [
  { label: 'Organization oversight', Icon: ShieldCheck },
  { label: 'Credential review', Icon: Users },
  { label: 'Platform operations', Icon: CalendarDays },
] as const;

function HexMotifs() {
  return (
    <svg
      className="auth-hero-hex"
      viewBox="0 0 640 640"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M92 78l34-20 34 20v40l-34 20-34-20V78z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.55"
      />
      <path
        d="M540 48l42-24 42 24v48l-42 24-42-24V48z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M568 86l28-16 28 16v32l-28 16-28-16V86z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.7"
      />
      <path
        d="M48 420l26-15 26 15v30l-26 15-26-15v-30z"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.4"
      />
      <path
        d="M520 500l48-28 48 28v56l-48 28-48-28v-56z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
    </svg>
  );
}

export function AuthHeroPanel({ variant }: { variant: AuthPortalVariant }) {
  const isAdmin = variant === 'admin';
  const features = isAdmin ? ADMIN_FEATURES : ORG_FEATURES;

  return (
    <aside className="auth-hero">
      <div className="auth-hero-media" aria-hidden="true">
        <Image
          src={isAdmin ? '/auth/admin-hero-photo.webp' : '/auth/org-hero-photo.webp'}
          alt=""
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 66vw"
          className="auth-hero-photo"
        />
        <div className="auth-hero-photo-mask" />
        {isAdmin ? <HexMotifs /> : null}
      </div>

      <div className="auth-hero-content">
        <div className="auth-hero-top">
          <BridgeHiveLogo markSize={48} tone="dark" />
          <p className="auth-hero-eyebrow">
            {isAdmin ? 'Platform administration' : 'Healthcare staffing platform'}
          </p>
        </div>

        <div className="auth-hero-copy">
          {isAdmin ? (
            <>
              <h2 className="auth-hero-title">
                Secure <span className="auth-hero-accent">oversight</span>
                <br />
                for Bridge Hive
                <br />
                operations
              </h2>
              <p className="auth-hero-body">
                Review organizations, verify professionals, and keep platform
                operations orderly from a console built for healthcare staffing.
              </p>
            </>
          ) : (
            <>
              <h2 className="auth-hero-title">
                Connecting
                <br />
                <span className="auth-hero-accent">care teams</span>
                <br />
                for a stronger tomorrow
              </h2>
              <p className="auth-hero-body">
                Bridge Hive brings hospitals, nurses, and ward assistants
                together with verified credentials, structured shifts, and
                clear workflows.
              </p>
            </>
          )}

          <ul className="auth-hero-features">
            {features.map(({ label, Icon }) => (
              <li key={label} className="auth-hero-feature">
                <span className="auth-hero-feature-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
