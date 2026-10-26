import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import Image from 'next/image';

import { MarketingButton } from '@/components/marketing/Section';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

type HeroProps = {
  locale: MarketingLocale;
  hero: MarketingDictionary['home']['hero'];
};

export function Hero({ locale, hero }: HeroProps) {
  const points = [
    { icon: ShieldCheck, label: hero.point1 },
    { icon: CalendarDays, label: hero.point2 },
    { icon: WalletCards, label: hero.point3 },
  ] as const;

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
            {hero.eyebrow}
            <span className="m-hero-eyebrow-rule" aria-hidden="true" />
          </p>

          <h1 id="m-hero-heading" className="m-hero-title m-rise m-rise-d1">
            <span className="m-hero-title-line m-hero-title-line--1">
              {hero.titleLine1}
            </span>
            <span className="m-hero-title-line m-hero-title-line--2">
              {hero.titleLine2}
            </span>
          </h1>

          <p className="m-hero-sub m-rise m-rise-d2">{hero.subtitle}</p>

          <div className="m-hero-ctas m-rise m-rise-d3">
            <MarketingButton
              href={localizePath('/contact#partnerships', locale)}
              variant="on-dark"
            >
              {hero.ctaPrimary}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </MarketingButton>
            <MarketingButton
              href={localizePath('/professionals', locale)}
              variant="on-dark-secondary"
            >
              {hero.ctaSecondary}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </MarketingButton>
          </div>

          <ul className="m-hero-points m-rise m-rise-d4">
            {points.map(({ icon: Icon, label }) => (
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
