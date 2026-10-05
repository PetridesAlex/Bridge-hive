import type { Metadata } from 'next';

import { FeatureRow, InquiryCta } from '@/components/marketing/blocks';
import { Reveal } from '@/components/marketing/Reveal';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';
import { WorkerJourneySection } from '@/components/marketing/WorkerJourneySection';

export const metadata: Metadata = {
  title: 'Professionals',
  description:
    'How registered nurses and ward assistants create accounts, complete verification, and accept eligible shifts on Bridge Hive.',
  alternates: { canonical: 'https://bridgehive.app/professionals' },
};

export default function ProfessionalsPage() {
  return (
    <>
      <Section band="dark" className="!pb-0">
        <Reveal>
          <p className="m-eyebrow">For registered nurses & ward assistants</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            Your path from account to eligible shifts
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            Bridge Hive is built for registered nurses and ward assistants who complete
            a clear verification path before accessing openings. Email confirmation is
            only the first step — platform review activates your account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingButton href="/auth/worker/login" variant="on-dark">
              Open worker app continuation
            </MarketingButton>
            <MarketingButton href="/how-it-works" variant="on-dark-secondary">
              See the full journey
            </MarketingButton>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[rgba(220,232,238,0.55)]">
            The continuation page helps you return to the Bridge Hive worker app after
            email confirmation. It is not a full web version of the app. For account
            help, see{' '}
            <a
              href="/contact#support"
              className="font-medium text-[var(--m-honey)] underline-offset-2 hover:underline"
            >
              platform support
            </a>
            .
          </p>
        </Reveal>
      </Section>

      <WorkerJourneySection />

      <Section band="white">
        <SectionHeading
          title="How payments work"
          lede="Wage pay and platform commission are separate obligations with separate payment methods."
        />
        <FeatureRow
          items={[
            {
              icon: 'payments',
              title: 'Organizations pay your wages',
              body: 'For approved work, the healthcare organization pays you directly by bank transfer of approved gross shift pay. Bridge Hive does not hold or disburse hospital wages.',
            },
            {
              icon: 'verified',
              title: 'Bank details support wage transfer',
              body: 'Your verified bank details exist so organizations can transfer wages to you. Bridge Hive stores verification records for account review; it does not collect commission through those bank details.',
            },
            {
              icon: 'timesheets',
              title: 'Separate platform commission invoice',
              body: 'Workers settle a separate Bridge Hive commission invoice on its own schedule after approved work. Commission is not deducted from the organization wage transfer.',
            },
          ]}
        />
      </Section>

      <Section band="porcelain">
        <InquiryCta />
      </Section>
    </>
  );
}
