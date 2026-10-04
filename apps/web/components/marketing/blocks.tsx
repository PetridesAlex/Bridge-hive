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

export function AudienceSplit() {
  return <AudienceJourney />;
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

export function TrustPanel() {
  return (
    <Reveal>
      <div className="m-band m-band--teal overflow-hidden rounded-[1.4rem] px-6 py-10 sm:px-10">
        <p className="m-eyebrow">Trust & verification</p>
        <h3 className="mt-3 max-w-2xl text-[length:var(--m-title)] font-extrabold tracking-tight text-white">
          Platform checks — not a blanket clinical guarantee
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[rgba(220,232,238,0.78)]">
          Bridge Hive runs structured account review for organizations and workers:
          credentials and bank details for wage payouts are examined by a platform
          administrator before marketplace access. The platform does not replace
          employer clinical judgment, professional registration boards, or local
          employment law — and activation is never automatic after signup alone.
        </p>
      </div>
    </Reveal>
  );
}

export function InquiryCta() {
  return (
    <Reveal>
      <div className="overflow-hidden rounded-[1.4rem] bg-[var(--m-navy)] px-6 py-12 text-center sm:px-12">
        <h2 className="text-[length:var(--m-title)] font-extrabold tracking-tight text-white">
          Ready to structure your staffing workflow?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[rgba(220,232,238,0.72)]">
          Organizations sign in when invited. Professionals use the worker app
          continuation page after email confirmation. New hospital partnerships start
          with a partnership inquiry — not organization sign-in as a substitute.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/contact#partnerships" className="m-btn m-btn--on-dark">
            Partnership inquiry
          </Link>
          <Link href="/sign-in" className="m-btn m-btn--on-dark-secondary">
            Organization sign in
          </Link>
          <Link
            href="/auth/worker/login"
            className="m-btn m-btn--ghost !text-[var(--m-honey)] hover:!text-white"
          >
            Worker app continuation
          </Link>
        </div>
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

export function DualJourneyVisual() {
  return (
    <Reveal>
      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {[
          { label: 'Shift published', tone: 'teal' },
          { label: 'Professional claims', tone: 'honey' },
          { label: 'Timesheet reviewed', tone: 'teal' },
          { label: 'Wage + invoice settle', tone: 'honey' },
        ].map((step, index) => (
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
            {index < 3 ? (
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
