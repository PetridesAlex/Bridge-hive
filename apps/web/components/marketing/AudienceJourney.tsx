'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { Reveal } from '@/components/marketing/Reveal';

const ORG = {
  eyebrow: 'Organizations',
  title: 'Publish shifts with role and ward clarity',
  body: 'Configure locations and wards, create openings for registered nurses or ward assistants, and review completed timesheets. Platform approval is required before your organization can publish shifts.',
  href: '/organizations',
  cta: 'How organizations use Bridge Hive',
  steps: [
    {
      label: 'Provisioned access',
      body: 'Bridge Hive creates organization accounts. Use the activation email or organization sign-in once invited.',
    },
    {
      label: 'Set up and publish',
      body: 'Configure locations and wards, then publish role-specific shifts after platform approval.',
    },
    {
      label: 'Review and pay wages',
      body: 'Accept timesheets, then pay approved worker wages by bank transfer.',
    },
  ],
} as const;

const PRO = {
  eyebrow: 'Professionals',
  title: 'Verify once, then work eligible shifts',
  body: 'Create an account in the worker app, upload role-specific documents, and submit bank details for wage payouts. A platform admin reviews your package before shifts become available — email confirmation alone is not activation.',
  href: '/professionals',
  cta: 'How professionals use Bridge Hive',
  steps: [
    {
      label: 'Create an account',
      body: 'Register in the Bridge Hive worker app and confirm your email.',
    },
    {
      label: 'Submit for review',
      body: 'Upload role-specific documents and bank details. A platform admin reviews before activation.',
    },
    {
      label: 'Accept eligible shifts',
      body: 'After activation, browse and accept openings that match your role — then complete timesheets.',
    },
  ],
} as const;

export function AudienceJourney() {
  const [audience, setAudience] = useState<'organization' | 'professional'>(
    'organization',
  );
  const baseId = useId();
  const active = audience === 'organization' ? ORG : PRO;

  return (
    <Reveal>
      <div className="m-switcher">
        <div className="m-switcher-tabs" role="tablist" aria-label="Audience journey">
          <button
            type="button"
            role="tab"
            id={`${baseId}-org-tab`}
            aria-controls={`${baseId}-panel`}
            aria-selected={audience === 'organization'}
            tabIndex={audience === 'organization' ? 0 : -1}
            onClick={() => setAudience('organization')}
          >
            Organizations
          </button>
          <button
            type="button"
            role="tab"
            id={`${baseId}-pro-tab`}
            aria-controls={`${baseId}-panel`}
            aria-selected={audience === 'professional'}
            tabIndex={audience === 'professional' ? 0 : -1}
            onClick={() => setAudience('professional')}
          >
            Professionals
          </button>
        </div>

        <div
          className="m-switcher-panel"
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={
            audience === 'organization' ? `${baseId}-org-tab` : `${baseId}-pro-tab`
          }
        >
          <article
            className={`m-panel ${audience === 'professional' ? 'm-panel--dark' : ''}`}
          >
            <p className="m-eyebrow">{active.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[inherit]">
              {active.title}
            </h3>
            <p
              className={`mt-3 text-sm leading-relaxed ${
                audience === 'professional'
                  ? 'text-[rgba(220,232,238,0.72)]'
                  : 'text-[color:var(--m-muted)]'
              }`}
            >
              {active.body}
            </p>
            <Link
              href={active.href}
              className={`mt-6 inline-flex text-sm font-semibold ${
                audience === 'professional'
                  ? 'text-[var(--m-honey)] hover:text-white'
                  : 'text-[var(--m-teal-strong)] hover:text-[var(--m-navy)]'
              }`}
            >
              {active.cta} →
            </Link>
          </article>

          <article className="m-panel">
            <p className="m-eyebrow">Workflow</p>
            <ol className="m-journey-list">
              {active.steps.map((step, index) => (
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
          </article>
        </div>

        {/* Keep both journeys in the document for non-JS / crawlers via links */}
        <p className="mt-4 text-sm text-[color:var(--m-muted)]">
          Prefer a full page? Read the{' '}
          <Link
            href="/organizations"
            className="font-medium text-[var(--m-teal-strong)] underline-offset-2 hover:underline"
          >
            organization journey
          </Link>{' '}
          or the{' '}
          <Link
            href="/professionals"
            className="font-medium text-[var(--m-teal-strong)] underline-offset-2 hover:underline"
          >
            professional journey
          </Link>
          .
        </p>
      </div>
    </Reveal>
  );
}
