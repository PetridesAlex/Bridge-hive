'use client';

import {
  Building2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type AuthPortalVariant = 'organization' | 'admin';

type TrustFeature = {
  label: string;
  detail: string;
  Icon: LucideIcon;
};

const ORG_FEATURES: TrustFeature[] = [
  {
    label: 'Invitation only',
    detail: 'Provisioned accounts — no open registration',
    Icon: KeyRound,
  },
  {
    label: 'Org-scoped access',
    detail: 'Locations, wards, and shifts stay in your workspace',
    Icon: Building2,
  },
  {
    label: 'Encrypted session',
    detail: 'Secure sign-in for hospital operations teams',
    Icon: LockKeyhole,
  },
  {
    label: 'Verified partners',
    detail: 'Credentialed professionals for every claim',
    Icon: ShieldCheck,
  },
];

const ADMIN_FEATURES: TrustFeature[] = [
  {
    label: 'Restricted console',
    detail: 'Platform administration for authorized operators',
    Icon: ShieldCheck,
  },
  {
    label: 'Encrypted session',
    detail: 'Secure sign-in for oversight workflows',
    Icon: LockKeyhole,
  },
  {
    label: 'Org oversight',
    detail: 'Activate hospitals and review credentials',
    Icon: Building2,
  },
  {
    label: 'Controlled access',
    detail: 'No open self-registration for admin accounts',
    Icon: KeyRound,
  },
];

export function AuthSignInDynamics({
  variant,
}: {
  variant: AuthPortalVariant;
}) {
  const features = variant === 'admin' ? ADMIN_FEATURES : ORG_FEATURES;
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setActive((index) => (index + 1) % features.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [features.length, reduceMotion]);

  const current = features[active] ?? features[0];

  return (
    <div className="auth-dynamics" aria-live="polite">
      <ul className="auth-trust-row">
        {features.map((feature, index) => (
          <li key={feature.label}>
            <button
              type="button"
              className={
                index === active
                  ? 'auth-trust-chip is-active'
                  : 'auth-trust-chip'
              }
              onClick={() => setActive(index)}
              aria-pressed={index === active}
            >
              <feature.Icon size={14} strokeWidth={1.85} aria-hidden="true" />
              <span>{feature.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="auth-dynamics-panel" key={current.label}>
        <span className="auth-dynamics-icon" aria-hidden="true">
          <current.Icon size={16} strokeWidth={1.85} />
        </span>
        <div>
          <p className="auth-dynamics-label">{current.label}</p>
          <p className="auth-dynamics-detail">{current.detail}</p>
        </div>
      </div>
    </div>
  );
}
