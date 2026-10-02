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
          lede="Organizations and professionals use different entry points, reviews, and destinations. Mixing them creates confusion — we keep the paths distinct."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
          <MarketingButton href="/auth/worker/login" variant="secondary">
            For professionals
          </MarketingButton>
        </div>
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
                body: 'As assignments complete, review timesheets in the organization dashboard.',
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
                body: 'Upload documents for your role and complete payout details for Bridge Hive commission invoicing.',
              },
              {
                label: 'Admin review & activation',
                body: 'A platform admin reviews your package. Marketplace shifts appear only after activation.',
              },
              {
                label: 'Accept work & settle invoices',
                body: 'Accept eligible shifts, submit timesheets, receive organization pay by bank transfer, and settle Bridge Hive commission invoices separately.',
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
