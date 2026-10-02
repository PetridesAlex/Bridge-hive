import type { Metadata } from 'next';

import { InquiryCta, ProcessSteps } from '@/components/marketing/blocks';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Role-specific journeys for healthcare organizations and professionals on Bridge Hive.',
  alternates: { canonical: 'https://bridgehive.app/how-it-works' },
};

export default function HowItWorksPage() {
  return (
    <>
      <Section className="!pb-10">
        <SectionHeading
          eyebrow="How Bridge Hive works"
          title="Two journeys that stay separate"
          lede="Organizations and professionals use different entry points, reviews, and destinations — so sign-in, verification, and payment responsibilities stay clear."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
          <MarketingButton href="/auth/worker/login" variant="secondary">
            Worker app continuation
          </MarketingButton>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-bh-text-muted">
          Professionals use the continuation page to open the Bridge Hive worker app
          after email confirmation — not a browser replacement for the native app.
        </p>
      </Section>

      <div className="marketing-rule" />

      <Section>
        <div className="grid gap-16 lg:grid-cols-2">
          <ProcessSteps
            title="Organization journey"
            steps={[
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
            ]}
          />
          <ProcessSteps
            title="Professional journey"
            steps={[
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
            ]}
          />
        </div>
      </Section>

      <Section className="!pt-0">
        <InquiryCta />
      </Section>
    </>
  );
}
