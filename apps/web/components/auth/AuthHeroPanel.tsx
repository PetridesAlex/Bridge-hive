import Image from 'next/image';
import { CalendarDays, ShieldCheck, Users } from 'lucide-react';

import { AuthPlatformActivity } from '@/components/auth/AuthPlatformActivity';
import { BridgeHiveLogo } from '@/components/auth/BridgeHiveLogo';

type AuthPortalVariant = 'organization' | 'admin';

const ORG_FEATURES = [
  { label: 'Manage Shifts Easily', Icon: CalendarDays },
  { label: 'Qualified Professionals', Icon: Users },
  { label: 'Trusted Healthcare Partners', Icon: ShieldCheck },
] as const;

const ADMIN_FEATURES = [
  { label: 'Organization Oversight', Icon: ShieldCheck },
  { label: 'Credential Review', Icon: Users },
  { label: 'Platform Operations', Icon: CalendarDays },
] as const;

export function AuthHeroPanel({ variant }: { variant: AuthPortalVariant }) {
  const isAdmin = variant === 'admin';
  const features = isAdmin ? ADMIN_FEATURES : ORG_FEATURES;

  return (
    <aside className="auth-hero">
      <div className="auth-hero-media" aria-hidden="true">
        <Image
          src={isAdmin ? '/auth/admin-hero.jpg' : '/auth/healthcare-hero.webp'}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 0px, 55vw"
          className="auth-hero-photo"
        />
        <div className="auth-hero-photo-mask" />
        {!isAdmin ? (
          <svg className="auth-hero-curves" viewBox="0 0 640 520" fill="none">
            <path
              d="M80 420C180 300 280 220 420 180C500 158 560 120 620 40"
              stroke="#f5c518"
              strokeWidth="1.5"
              strokeOpacity="0.55"
            />
            <path
              d="M40 460C160 340 300 270 460 240C540 226 590 180 640 110"
              stroke="#f5c518"
              strokeWidth="1.2"
              strokeOpacity="0.35"
            />
            <path
              d="M120 480C220 380 340 330 500 300"
              stroke="#f5c518"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
          </svg>
        ) : null}
      </div>

      <div className="auth-hero-content">
        <div className="auth-hero-top">
          <BridgeHiveLogo />
          <p className="auth-hero-eyebrow">
            {isAdmin ? 'Platform Administration' : 'Healthcare Staffing Platform'}
          </p>
        </div>

        <div className="auth-hero-copy">
          {isAdmin ? (
            <>
              <h2 className="auth-hero-title">
                Secure oversight
                <br />
                for Bridge Hive
                <br />
                <span className="auth-hero-accent">operations</span>
              </h2>
              <p className="auth-hero-body">
                Review organizations, verify professionals, and keep platform
                operations running with a clear admin console built for healthcare
                staffing.
              </p>
            </>
          ) : (
            <>
              <h2 className="auth-hero-title">
                Connecting
                <br />
                Healthcare People
                <br />
                with <span className="auth-hero-accent">Opportunities</span>
              </h2>
              <p className="auth-hero-body">
                Flexible staffing solutions for hospitals and care facilities.
                Helping organizations find qualified staff and professionals
                access rewarding shifts.
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

        <AuthPlatformActivity variant={variant} />
      </div>
    </aside>
  );
}
