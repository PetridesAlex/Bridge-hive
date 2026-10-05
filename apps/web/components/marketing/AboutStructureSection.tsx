import Link from 'next/link';
import { ArrowRight, Combine, RefreshCw, Users, Waypoints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';

const PRINCIPLES: {
  title: string;
  body: string;
  tone: 'blue' | 'violet' | 'honey';
  icon: LucideIcon;
}[] = [
  {
    title: 'Role honesty',
    body: 'We speak precisely about registered nurses and ward assistants — and about what platform review does and does not decide.',
    tone: 'blue',
    icon: Users,
  },
  {
    title: 'Operational structure',
    body: 'Locations, wards, shifts, timesheets, and invoices are modeled as real workflows with clear ownership on each side.',
    tone: 'violet',
    icon: Waypoints,
  },
  {
    title: 'Separated responsibilities',
    body: 'Organizations pay workers for approved work. Workers settle Bridge Hive’s platform commission separately. Those paths are never blended.',
    tone: 'honey',
    icon: Combine,
  },
];

export function AboutStructureSection() {
  return (
    <section className="m-band m-band--porcelain m-structure-band" aria-labelledby="m-structure-heading">
      <div className="m-section m-structure-section">
        <Reveal className="m-structure-copy">
          <p className="m-structure-eyebrow">
            <RefreshCw size={13} strokeWidth={2.4} aria-hidden="true" />
            How it works
          </p>
          <h2 id="m-structure-heading" className="m-structure-heading">
            A clear structure for <span>everyone</span>
          </h2>
          <p className="m-structure-lede">
            Bridge Hive is built for clarity. We make it easy to understand who is
            invited, who is verified, which role a shift needs, and how wage pay and
            platform commission stay separate.
          </p>
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
                      href="/how-it-works"
                      className="m-structure-card-arrow"
                      aria-label={`Learn more about ${item.title}`}
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
            <Link href="/how-it-works" className="m-structure-btn m-structure-btn--primary">
              How it works
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link
              href="/contact#partnerships"
              className="m-structure-btn m-structure-btn--secondary"
            >
              Partnership inquiry
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
