import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { MarketingButton } from '@/components/marketing/Section';

const HERO_POINTS = [
  { icon: ShieldCheck, label: 'Credential-led onboarding' },
  { icon: CalendarDays, label: 'Structured shifts' },
  { icon: WalletCards, label: 'Clear payment workflows' },
] as const;

const HERO_METRICS = [
  {
    icon: ShieldCheck,
    title: 'Credential review',
    detail: 'Before marketplace shifts',
  },
  {
    icon: Users,
    title: 'Role-specific shifts',
    detail: 'Nurses, ward assistants, and physiotherapists',
  },
  {
    icon: ClipboardCheck,
    title: 'Timesheet review',
    detail: 'Completed work is checked',
  },
  {
    icon: WalletCards,
    title: 'Separate pay paths',
    detail: 'Wages and commission',
  },
] as const;

export function Hero() {
  return (
    <div className="m-hero">
      <div className="m-hero-inner">
        <div className="m-hero-copy">
          <p className="m-eyebrow m-rise">Healthcare staffing platform</p>
          <h1 className="m-rise m-rise-d1">
            Connect care organizations with{' '}
            <span className="m-hero-accent">
              verified nurses
              <svg viewBox="0 0 140 12" aria-hidden="true">
                <path
                  d="M2 8C28 3 78 2 138 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            , ward assistants, and physiotherapists
          </h1>
          <p className="m-hero-sub m-rise m-rise-d2">
            Bridge Hive structures role-specific shifts, credential review, timesheets,
            and clear payment paths — so hospitals and professionals each know their next
            step.
          </p>
          <div className="m-hero-ctas m-rise m-rise-d3">
            <MarketingButton href="/contact#partnerships" variant="on-dark">
              Partnership inquiry
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </MarketingButton>
            <MarketingButton href="/professionals" variant="on-dark-secondary">
              Explore for professionals
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </MarketingButton>
          </div>
          <ul className="m-hero-points m-rise m-rise-d4">
            {HERO_POINTS.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span className="m-hero-point-icon" aria-hidden="true">
                  <Icon size={15} strokeWidth={2.35} />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className="m-hero-fine">
            <p className="m-hero-fine-kicker">New organization?</p>
            <p className="m-hero-fine-links">
              <a href="/contact#partnerships">Prepare an inquiry</a>
              <Link href="/sign-in">Organization sign in</Link>
              <Link href="/auth/worker/login">Worker app continuation</Link>
            </p>
            <p className="m-hero-fine-note">
              Organization sign in is for invited accounts. Professionals use worker app
              continuation.
            </p>
          </div>
        </div>

        <figure className="m-hero-scene m-rise m-rise-d2">
          <div className="m-hero-scene-frame">
            <Image
              src="/marketing/home-hero-scene.jpg"
              alt="Clinicians preparing supplies in a hospital pharmacy, with the hospital exterior beyond the window"
              fill
              priority
              quality={93}
              sizes="(min-width: 1024px) 42rem, 100vw"
              className="m-hero-scene-image"
            />
            <div className="m-hero-role-card">
              <span className="m-hero-role-icon" aria-hidden="true">
                <Users size={20} strokeWidth={2.35} />
              </span>
              <p>
                <strong>Role-matched shifts</strong>
                <span>Nurses, ward assistants, and physiotherapists</span>
              </p>
            </div>
          </div>
          <figcaption className="m-hero-visual-caption">Illustrative</figcaption>
        </figure>
      </div>

      <ul className="m-hero-metrics">
        {HERO_METRICS.map(({ icon: Icon, title, detail }) => (
          <li key={title}>
            <span className="m-hero-metric-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2.35} />
            </span>
            <p>
              <strong>{title}</strong>
              <span>{detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
