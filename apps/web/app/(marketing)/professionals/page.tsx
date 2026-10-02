import type { Metadata } from 'next';

import { FeatureRow, InquiryCta, ProcessSteps } from '@/components/marketing/blocks';
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
      <Section className="!pb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-honey-strong">
          For registered nurses & ward assistants
        </p>
        <h1 className="mt-3 max-w-3xl text-[var(--m-display)] font-semibold leading-[1.1] tracking-tight text-bh-sidebar">
          Your path from account to eligible shifts
        </h1>
        <p className="mt-5 max-w-2xl text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          Bridge Hive is built for registered nurses and ward assistants who complete
          a clear verification path before accessing openings. Email confirmation is
          only the first step — platform review activates your account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <MarketingButton href="/auth/worker/login">
            Open worker app continuation
          </MarketingButton>
          <MarketingButton href="/how-it-works" variant="secondary">
            See the full journey
          </MarketingButton>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-bh-text-muted">
          The continuation page helps you return to the Bridge Hive worker app after
          email confirmation. It is not a full web version of the app. For account
          help, see{' '}
          <a
            href="/contact#support"
            className="font-medium text-bh-teal-strong underline-offset-2 hover:underline"
          >
            platform support
          </a>
          .
        </p>
      </Section>

      <div className="marketing-rule" />

      <Section>
        <SectionHeading title="How account setup works" />
        <div className="mt-10 max-w-xl">
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

      <Section className="!pt-0">
        <SectionHeading
          title="How payments work"
          lede="Wage pay and platform commission are separate obligations with separate payment methods."
        />
        <FeatureRow
          items={[
            {
              title: 'Organizations pay your wages',
              body: 'For approved work, the healthcare organization pays you directly by bank transfer of approved gross shift pay. Bridge Hive does not hold or disburse hospital wages.',
            },
            {
              title: 'Bank details support wage transfer',
              body: 'Your verified bank details exist so organizations can transfer wages to you. Bridge Hive stores verification records for account review; it does not collect commission through those bank details.',
            },
            {
              title: 'Separate platform commission invoice',
              body: 'Workers settle a separate Bridge Hive commission invoice on its own schedule after approved work. Commission is not deducted from the organization wage transfer.',
            },
          ]}
        />
      </Section>

      <Section className="!pt-0">
        <InquiryCta />
      </Section>
    </>
  );
}
