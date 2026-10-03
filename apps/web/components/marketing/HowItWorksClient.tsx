'use client';

import { useState } from 'react';

import { InquiryCta, ProcessSteps } from '@/components/marketing/blocks';
import { Reveal } from '@/components/marketing/Reveal';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';

const ORG_STEPS = [
  {
    label: 'Invitation / provisioning',
    body: 'Bridge Hive provisions the organization. Admins receive an activation email or credentials — not an open web signup.',
  },
  {
    label: 'Platform approval',
    body: 'A platform administrator approves the organization before shifts can be published.',
  },
  {
    label: 'Configure & publish',
    body: 'Set up locations and wards, then publish role-specific openings for registered nurses or ward assistants.',
  },
  {
    label: 'Review timesheets',
    body: 'As assignments complete, review timesheets in the organization dashboard and pay approved wages by bank transfer.',
  },
] as const;

const PRO_STEPS = [
  {
    label: 'Register in the worker app',
    body: 'Create an account and confirm your email. Use the web continuation page if your confirmation link opens in a browser.',
  },
  {
    label: 'Submit verification package',
    body: 'Upload role-specific documents and bank details for wage payouts. Platform review verifies the package before activation.',
  },
  {
    label: 'Admin review & activation',
    body: 'A platform admin reviews your package. Marketplace shifts appear only after activation.',
  },
  {
    label: 'Accept work & settle separately',
    body: 'Accept eligible shifts, submit timesheets, receive organization wages by bank transfer, and settle Bridge Hive’s separate commission invoice on its own schedule.',
  },
] as const;

export function HowItWorksClient() {
  const [emphasis, setEmphasis] = useState<'organization' | 'professional'>(
    'organization',
  );

  return (
    <>
      <Section band="dark" className="!pb-0">
        <Reveal>
          <SectionHeading
            eyebrow="How Bridge Hive works"
            title="Two journeys that stay separate"
            lede="Organizations and professionals use different entry points, reviews, and destinations — so sign-in, verification, and payment responsibilities stay clear."
            tone="dark"
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingButton href="/sign-in" variant="on-dark">
              Organization sign in
            </MarketingButton>
            <MarketingButton href="/auth/worker/login" variant="on-dark-secondary">
              Worker app continuation
            </MarketingButton>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[rgba(220,232,238,0.55)]">
            Professionals use the continuation page to open the Bridge Hive worker app
            after email confirmation — not a browser replacement for the native app.
          </p>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <div className="m-switcher-tabs" role="tablist" aria-label="Emphasize journey">
          <button
            type="button"
            role="tab"
            aria-selected={emphasis === 'organization'}
            onClick={() => setEmphasis('organization')}
          >
            Organizations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={emphasis === 'professional'}
            onClick={() => setEmphasis('professional')}
          >
            Professionals
          </button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div
            className={
              emphasis === 'organization'
                ? 'ring-2 ring-[var(--m-teal)]/35 rounded-[1.2rem]'
                : 'opacity-90'
            }
          >
            <ProcessSteps title="Organization journey" steps={[...ORG_STEPS]} />
          </div>
          <div
            className={
              emphasis === 'professional'
                ? 'ring-2 ring-[var(--m-honey)]/40 rounded-[1.2rem]'
                : 'opacity-90'
            }
          >
            <ProcessSteps title="Professional journey" steps={[...PRO_STEPS]} />
          </div>
        </div>
      </Section>

      <Section band="white">
        <InquiryCta />
      </Section>
    </>
  );
}
