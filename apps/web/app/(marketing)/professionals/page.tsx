import type { Metadata } from 'next';

import { InquiryCta, ProcessSteps } from '@/components/marketing/blocks';
import { ProfessionalsPaymentsSection } from '@/components/marketing/ProfessionalsPaymentsSection';
import { Reveal } from '@/components/marketing/Reveal';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';

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

      <Section band="porcelain">
        <SectionHeading title="How account setup works" />
        <div className="mt-10 max-w-2xl">
          <ProcessSteps
            title="Worker journey"
            steps={[
              {
                label: 'Create your account',
                body: 'Register in the Bridge Hive worker app and confirm your email address.',
              },
              {
                label: 'Upload role-specific documents',
                body: 'Submit credentials and information required for your role — registered nurse or ward assistant.',
              },
              {
                label: 'Submit bank details for wage payouts',
                body: 'Provide bank account details so healthcare organizations can pay your approved wages by bank transfer. Bridge Hive reviews those details as part of account verification — it does not use them to collect platform fees.',
              },
              {
                label: 'Platform admin review',
                body: 'A Bridge Hive administrator reviews your package. Shifts are available only after verification and activation.',
              },
              {
                label: 'Browse and accept eligible shifts',
                body: 'Once activated, view openings that match your role and accept work you can complete.',
              },
              {
                label: 'Timesheets, wages, and commission',
                body: 'Complete timesheets in the app. Organizations pay approved wages by bank transfer. Separately, Bridge Hive invoices you for its platform commission.',
              },
            ]}
          />
        </div>
      </Section>

      <ProfessionalsPaymentsSection />

      <Section band="porcelain">
        <InquiryCta />
      </Section>
    </>
  );
}
