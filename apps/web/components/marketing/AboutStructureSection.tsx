import Link from 'next/link';
import { ArrowRight, Combine, RefreshCw, Users, Waypoints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

type AboutStructureSectionProps = {
  locale: MarketingLocale;
  about: MarketingDictionary['about'];
};

export function AboutStructureSection({
  locale,
  about,
}: AboutStructureSectionProps) {
  const PRINCIPLES: {
    title: string;
    body: string;
    tone: 'blue' | 'violet' | 'honey';
    icon: LucideIcon;
  }[] = [
    {
      title: about.principle1Title,
      body: about.principle1Body,
      tone: 'blue',
      icon: Users,
    },
    {
      title: about.principle2Title,
      body: about.principle2Body,
      tone: 'violet',
      icon: Waypoints,
    },
    {
      title: about.principle3Title,
      body: about.principle3Body,
      tone: 'honey',
      icon: Combine,
    },
  ];

  const howItWorksHref = localizePath('/how-it-works', locale);
  const partnershipsHref = localizePath('/contact#partnerships', locale);

  return (
    <section
      className="m-band m-band--porcelain m-structure-band"
      aria-labelledby="m-structure-heading"
    >
      <div className="m-section m-structure-section">
        <Reveal className="m-structure-copy">
          <p className="m-structure-eyebrow">
            <RefreshCw size={13} strokeWidth={2.4} aria-hidden="true" />
            {about.structureEyebrow}
          </p>
          <h2 id="m-structure-heading" className="m-structure-heading">
            {about.structureHeading}{' '}
            <span>{about.structureHeadingAccent}</span>
          </h2>
          <p className="m-structure-lede">{about.structureLede}</p>
        </Reveal>

        <div className="m-structure-cards">
          {PRINCIPLES.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 110}>
                <article className={`m-structure-card m-structure-card--${item.tone}`}>
                  <div className="m-structure-card-top">
                    <span className="m-structure-card-icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.9} />
                    </span>
                    <Link
                      href={howItWorksHref}
                      className="m-structure-card-arrow"
                      aria-label={about.learnMoreAriaTemplate.replace(
                        '{title}',
                        item.title,
                      )}
                    >
                      <ArrowRight size={16} strokeWidth={2.1} aria-hidden="true" />
                    </Link>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={160}>
          <div className="m-structure-actions">
            <Link
              href={howItWorksHref}
              className="m-structure-btn m-structure-btn--primary"
            >
              {about.actionHowItWorks}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link
              href={partnershipsHref}
              className="m-structure-btn m-structure-btn--secondary"
            >
              {about.actionPartnershipInquiry}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
