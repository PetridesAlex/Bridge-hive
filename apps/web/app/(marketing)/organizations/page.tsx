import type { Metadata } from 'next';

import { FeatureRow, InquiryCta } from '@/components/marketing/blocks';
import { Reveal } from '@/components/marketing/Reveal';
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
      <Section band="dark" className="!pb-0">
        <Reveal>
          <p className="m-eyebrow">For healthcare organizations</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            Staffing requests with role and ward clarity
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            Bridge Hive helps hospitals and care organizations publish openings for
            registered nurses and ward assistants, limit visibility to verified
            professionals, and review completed timesheets — with operational
            structure rather than fill-rate guarantees.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingButton href="/contact#partnerships" variant="on-dark">
              Partnership inquiry
            </MarketingButton>
            <MarketingButton href="/sign-in" variant="on-dark-secondary">
              Organization sign in
            </MarketingButton>
          </div>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <SectionHeading
          title="What you can operate in the dashboard"
          lede="The organization workspace covers the staffing workflow from locations through timesheet review — with organization isolation after admin approval."
        />
        <FeatureRow
          items={[
            {
              icon: 'locations',
              title: 'Locations and wards',
              body: 'Model where care is delivered so openings map to the right clinical context.',
            },
            {
              icon: 'shifts',
              title: 'Role-specific shifts',
              body: 'Publish openings for registered nurses or ward assistants with schedule and acceptance windows.',
            },
            {
              icon: 'verified',
              title: 'Verified eligibility',
              body: 'Only workers who complete platform verification and activation can see and accept matching shifts.',
            },
            {
              icon: 'org',
              title: 'Scheduling visibility',
              body: 'Track published openings and assignments as work progresses through the organization workspace.',
            },
            {
              icon: 'timesheets',
              title: 'Timesheet review',
              body: 'Review completed shifts before closing the operational loop on each assignment.',
            },
            {
              icon: 'activation',
              title: 'Admin approval first',
              body: 'A platform administrator approves your organization before shift publishing is available.',
            },
          ]}
        />
      </Section>

      <Section band="white">
        <Reveal>
          <div className="m-panel max-w-2xl">
            <h2 className="text-xl font-extrabold text-[var(--m-navy)]">
              Built as workflow software
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--m-muted)]">
              Bridge Hive structures publishing, eligibility, and timesheet review. It
              does not guarantee that every shift will fill, that a specific professional
              will be available, or that platform verification replaces your clinical
              hiring standards or local employment policy. Organization data stays
              isolated to your account after approval.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <InquiryCta />
      </Section>
    </>
  );
}
