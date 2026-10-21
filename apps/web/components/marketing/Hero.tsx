import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import Image from 'next/image';

import { MarketingButton } from '@/components/marketing/Section';

const HERO_POINTS = [
  { icon: ShieldCheck, label: 'Verified clinical credentials' },
  { icon: CalendarDays, label: 'Role-matched shift design' },
  { icon: WalletCards, label: 'Transparent payment workflows' },
] as const;

export function Hero() {
  return (
    <section className="m-hero" aria-labelledby="m-hero-heading">
      <div className="m-hero-media" aria-hidden="true">
        <Image
          src="/marketing/home-hero-clinical-team.png"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="m-hero-media-image"
        />
      </div>
      <div className="m-hero-wash" aria-hidden="true" />
      <div className="m-hero-glow" aria-hidden="true" />

      <div className="m-hero-inner">
        <div className="m-hero-copy">
          <p className="m-eyebrow m-hero-eyebrow m-rise">
            HEALTHCARE STAFFING, MADE CLEAR
            <span className="m-hero-eyebrow-rule" aria-hidden="true" />
          </p>

          <h1 id="m-hero-heading" className="m-hero-title m-rise m-rise-d1">
            <span className="m-hero-title-line m-hero-title-line--1">
              The right care professional,
            </span>
            <span className="m-hero-title-line m-hero-title-line--2">
              when your team needs one.
            </span>
          </h1>

          <p className="m-hero-sub m-rise m-rise-d2">
            BridgeHive connects care organizations with verified nurses, ward assistants
            and physiotherapists through structured, role-specific shifts.
          </p>

          <div className="m-hero-ctas m-rise m-rise-d3">
            <MarketingButton href="/contact#partnerships" variant="on-dark">
              Talk to our team
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </MarketingButton>
            <MarketingButton href="/professionals" variant="on-dark-secondary">
              Explore professionals
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </MarketingButton>
          </div>

          <ul className="m-hero-points m-rise m-rise-d4">
            {HERO_POINTS.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span className="m-hero-point-icon" aria-hidden="true">
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                <span className="m-hero-point-label">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
