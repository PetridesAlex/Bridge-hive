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
            Continue in the worker app
          </MarketingButton>
          <MarketingButton href="/how-it-works" variant="secondary">
            See the full journey
          </MarketingButton>
        </div>
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
                label: 'Complete payout details',
                body: 'Provide the bank details Bridge Hive needs for commission invoicing. This is separate from how organizations pay your wages.',
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
                label: 'Timesheets and invoices',
                body: 'Complete timesheets in the app. Organizations pay wages by bank transfer; Bridge Hive issues a separate platform commission invoice.',
              },
            ]}
          />
        </div>
      </Section>

      <Section className="!pt-0">
        <SectionHeading
          title="Payments — said accurately"
          lede="Product model from Bridge Hive finance design. Public commercial terms remain subject to legal and commercial confirmation."
        />
        <FeatureRow
          items={[
            {
              title: 'Organization pays you directly',
              body: 'For approved work, the healthcare organization pays the worker by bank transfer. Bridge Hive does not hold or disburse hospital wages.',
            },
            {
              title: 'Platform commission invoice',
              body: 'Workers pay Bridge Hive a separate platform commission invoice — 16% of approved gross shift pay in the current product model.',
            },
            {
              title: 'Due timing',
              body: 'Commission invoices are due 10 calendar days after the relevant invoice is issued, per the current product rules.',
            },
          ]}
        />
        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-bh-text-muted">
          Fee percentages and due dates are described here as the verified product
          model. Treat them as subject to legal and commercial confirmation before
          relying on them in contracts.
        </p>
      </Section>

      <Section className="!pt-0">
        <InquiryCta />
      </Section>
    </>
  );
}
