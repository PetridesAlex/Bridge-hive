import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { AudienceJourney } from '@/components/marketing/AudienceJourney';
import { Reveal } from '@/components/marketing/Reveal';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

const ICONS = {
  locations: MapPin,
  verified: ShieldCheck,
  shifts: CalendarDays,
  timesheets: ClipboardList,
  payments: Wallet,
  activation: CheckCircle2,
  org: Building2,
} as const;

export function FeatureRow({
  items,
}: {
  items: Array<{
    title: string;
    body: string;
    icon?: keyof typeof ICONS;
  }>;
}) {
  return (
    <ul className="m-feature-grid">
      {items.map((item, index) => {
        const Icon = ICONS[item.icon ?? 'shifts'];
        return (
          <Reveal key={item.title} delay={index * 60}>
            <li className="m-feature h-full">
              <span className="m-feature-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          </Reveal>
        );
      })}
    </ul>
  );
}

export function AudienceSplit({
  locale,
  audience,
}: {
  locale: MarketingLocale;
  audience: MarketingDictionary['home']['audience'];
}) {
  return <AudienceJourney locale={locale} audience={audience} />;
}

export function ProcessSteps({
  title,
  steps,
}: {
  title: string;
  steps: Array<{ label: string; body: string }>;
}) {
  return (
    <Reveal>
      <div className="m-panel h-full">
        <h3 className="text-xl font-extrabold tracking-tight text-[var(--m-navy)]">
          {title}
        </h3>
        <ol className="m-journey-list">
          {steps.map((step, index) => (
            <li key={step.label} className="m-journey-item">
              <span className="m-journey-index" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}

export function TrustPanel({
  trust,
}: {
  trust: MarketingDictionary['home']['trust'];
}) {
  return (
    <Reveal>
      <div className="m-band m-band--teal overflow-hidden rounded-[1.4rem] px-6 py-10 sm:px-10">
        <p className="m-eyebrow">{trust.eyebrow}</p>
        <h3 className="mt-3 max-w-2xl text-[length:var(--m-title)] font-extrabold tracking-tight text-white">
          {trust.title}
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[rgba(220,232,238,0.78)]">
          {trust.body}
        </p>
      </div>
    </Reveal>
  );
}

export function InquiryCta({
  locale,
  inquiry,
}: {
  locale: MarketingLocale;
  inquiry: MarketingDictionary['home']['inquiry'];
}) {
  const steps = [
    {
      title: inquiry.step1Title,
      body: inquiry.step1Body,
      href: localizePath('/contact#partnerships', locale),
      label: inquiry.step1Cta,
      tone: 'primary' as const,
    },
    {
      title: inquiry.step2Title,
      body: inquiry.step2Body,
      href: localizePath('/sign-in', locale),
      label: inquiry.step2Cta,
      tone: 'secondary' as const,
    },
    {
      title: inquiry.step3Title,
      body: inquiry.step3Body,
      href: localizePath('/auth/worker/login', locale),
      label: inquiry.step3Cta,
      tone: 'quiet' as const,
    },
  ];

  return (
    <Reveal>
      <div className="m-inquiry">
        <h2>{inquiry.title}</h2>
        <ol className="m-inquiry-steps">
          {steps.map((step, index) => (
            <li key={step.href} className="m-inquiry-step">
              <span className="m-inquiry-index" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <Link
                href={step.href}
                className={
                  step.tone === 'primary'
                    ? 'm-btn m-btn--on-dark'
                    : step.tone === 'secondary'
                      ? 'm-btn m-btn--on-dark-secondary'
                      : 'm-btn m-btn--ghost m-inquiry-quiet'
                }
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}

export function FaqAccordion({
  items,
}: {
  items: Array<{ q: string; a: React.ReactNode }>;
}) {
  return (
    <Reveal>
      <div className="m-faq">
        {items.map((item) => (
          <details key={item.q} className="group">
            <summary>
              <span className="flex items-start justify-between gap-4">
                {item.q}
                <span className="text-[var(--m-muted)] group-open:hidden" aria-hidden="true">
                  +
                </span>
                <span
                  className="hidden text-[var(--m-muted)] group-open:inline"
                  aria-hidden="true"
                >
                  −
                </span>
              </span>
            </summary>
            <div className="m-faq-body">{item.a}</div>
          </details>
        ))}
      </div>
    </Reveal>
  );
}

export function DualJourneyVisual({
  steps,
}: {
  steps: ReadonlyArray<{ label: string; tone: 'teal' | 'honey' }>;
}) {
  return (
    <Reveal>
      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.label} className="relative m-panel text-center">
            <span
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold"
              style={{
                background:
                  step.tone === 'honey'
                    ? 'rgba(228,179,52,0.16)'
                    : 'rgba(20,169,181,0.14)',
                color: step.tone === 'honey' ? '#c9920f' : '#0e8f99',
              }}
            >
              {index + 1}
            </span>
            <p className="mt-3 text-sm font-bold text-[var(--m-navy)]">{step.label}</p>
            {index < steps.length - 1 ? (
              <span
                className="pointer-events-none absolute right-[-0.7rem] top-1/2 hidden h-px w-6 bg-[var(--m-honey)] lg:block"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
    </Reveal>
  );
}
