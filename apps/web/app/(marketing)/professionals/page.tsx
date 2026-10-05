import type { Metadata } from 'next';

import { InquiryCta } from '@/components/marketing/blocks';
import { ProfessionalsPaymentsSection } from '@/components/marketing/ProfessionalsPaymentsSection';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';
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
      <ProfessionalsPaymentsSection />

      <Section band="porcelain">
        <InquiryCta />
      </Section>
    </>
  );
}
