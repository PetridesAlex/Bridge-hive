import type { Metadata } from 'next';

import { FeatureRow, InquiryCta } from '@/components/marketing/blocks';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Organizations',
  description:
    'How healthcare organizations use Bridge Hive to publish role-specific shifts, review eligibility, and manage timesheets.',
  alternates: { canonical: 'https://bridgehive.app/organizations' },
};

export default function OrganizationsPage() {
  return (
    <>
      <Section className="!pb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
          For healthcare organizations
        </p>
        <h1 className="mt-3 max-w-3xl text-[var(--m-display)] font-semibold leading-[1.1] tracking-tight text-bh-sidebar">
          Staffing requests with role and ward clarity
        </h1>
        <p className="mt-5 max-w-2xl text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          Bridge Hive helps hospitals and care organizations publish openings for
          registered nurses and ward assistants, limit visibility to verified
          professionals, and review completed timesheets — without implying that
          every shift will fill on demand.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
          <MarketingButton href="/contact" variant="secondary">
            Organization inquiry
          </MarketingButton>
        </div>
      </Section>

      <div className="marketing-rule" />

      <Section>
        <SectionHeading
          title="What you can operate in the dashboard"
          lede="Features reflect the live Bridge Hive product — not promises about real-world workforce supply."
        />
        <FeatureRow
          items={[
            {
              title: 'Locations and wards',
              body: 'Model where care is delivered so openings map to the right clinical context.',
            },
            {
              title: 'Role-specific shifts',
              body: 'Publish openings for registered nurses or ward assistants with schedule and acceptance windows.',
            },
            {
              title: 'Verified eligibility',
              body: 'Only workers who complete platform verification and activation can see and accept matching shifts.',
            },
            {
              title: 'Scheduling visibility',
              body: 'Track published openings and assignments as work progresses through the organization workspace.',
            },
            {
              title: 'Timesheet review',
              body: 'Review completed shifts before closing the operational loop on each assignment.',
            },
            {
              title: 'Admin approval first',
              body: 'A platform administrator approves your organization before shift publishing is available.',
            },
          ]}
        />
      </Section>

      <Section className="!pt-0">
        <div className="max-w-2xl rounded-2xl border border-bh-border bg-bh-subtle/50 p-8">
          <h2 className="text-xl font-semibold text-bh-sidebar">
            What Bridge Hive does not claim
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
            The platform does not guarantee that a shift will be filled, that a
            specific professional will be available, or that verification replaces
            your clinical hiring standards. Use Bridge Hive as structured workflow
            software — not as a substitute for local employment or clinical policy.
          </p>
        </div>
      </Section>

      <Section className="!pt-0">
        <InquiryCta />
      </Section>
    </>
  );
}
