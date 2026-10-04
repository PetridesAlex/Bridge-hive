import { ArrowUpRight, Building2, LogIn, Smartphone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { MarketingButton } from '@/components/marketing/Section';

function HomeHeroPortrait() {
  return (
    <figure className="m-hero-visual">
      <div className="m-hero-visual-frame">
        <Image
          src="/marketing/organizations-hero-4k.jpg"
          alt="Smiling healthcare professional in Bridge Hive scrubs"
          fill
          priority
          quality={95}
          sizes="(min-width: 1024px) 36rem, 90vw"
          className="m-hero-visual-image"
        />
        <span className="m-hero-visual-wash" aria-hidden="true" />
      </div>
      <figcaption className="m-hero-visual-caption">Illustrative</figcaption>
    </figure>
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

          <div className="m-hero-access m-rise m-rise-d4">
            <div className="m-hero-access-head">
              <p className="m-hero-access-kicker">Quick access</p>
              <span className="m-hero-access-rule" aria-hidden="true" />
            </div>

            <nav className="m-hero-meta" aria-label="Hero quick access">
              <Link href="/organizations" className="m-hero-access-link">
                <span className="m-hero-access-icon" aria-hidden="true">
                  <Building2 size={15} strokeWidth={2} />
                </span>
                <span>Explore for organizations</span>
                <ArrowUpRight size={14} strokeWidth={2.1} aria-hidden="true" />
              </Link>
              <Link href="/sign-in" className="m-hero-access-link">
                <span className="m-hero-access-icon" aria-hidden="true">
                  <LogIn size={15} strokeWidth={2} />
                </span>
                <span>Organization sign in</span>
                <ArrowUpRight size={14} strokeWidth={2.1} aria-hidden="true" />
              </Link>
              <Link href="/auth/worker/login" className="m-hero-access-link">
                <span className="m-hero-access-icon" aria-hidden="true">
                  <Smartphone size={15} strokeWidth={2} />
                </span>
                <span>Worker app continuation</span>
                <ArrowUpRight size={14} strokeWidth={2.1} aria-hidden="true" />
              </Link>
            </nav>

            <p className="m-hero-note">
              <span className="m-hero-note-label">New organization?</span>
              <span className="m-hero-note-copy">
                <a href="/contact#partnerships">Prepare an inquiry</a>
                . Accounts are provisioned by Bridge Hive — not open self-registration.
              </span>
            </p>
          </div>
        </div>
        <div className="m-rise m-rise-d2">
          <HomeHeroPortrait />
        </div>
      </div>
    </div>
  );
}
