import type { Metadata } from 'next';

import {
  AudienceSplit,
  FeatureRow,
  InquiryCta,
  TrustPanel,
} from '@/components/marketing/blocks';
import { Hero } from '@/components/marketing/Hero';
import { HomeFaq } from '@/components/marketing/HomeFaq';
import { HomeHowItWorks } from '@/components/marketing/HomeHowItWorks';
import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: {
    absolute:
      'BridgeHive Medical Recruitment Limited | Healthcare Staffing & Recruitment',
  },
  description:
    'Connecting healthcare organizations with verified registered nurses, ward assistants, and physiotherapists through professional medical recruitment and flexible staffing solutions',
  alternates: { canonical: 'https://bridgehive.app/' },
};

export default function HomePage() {
  return (
    <>
      <Hero />

      <MarketingFlowShell>
        <Section band="porcelain" className="m-audience-band m-flow-band">
          <AudienceSplit />
        </Section>

        <Section band="white" className="m-flow-band">
          <SectionHeading
            eyebrow="Platform capabilities"
            title="Staffing operations with role and ward clarity"
            lede="Every capability below maps to a real Bridge Hive workflow — not a fill-rate promise."
          />
          <FeatureRow
            items={[
              {
                icon: 'locations',
                title: 'Locations, wards, and roles',
                body: 'Organizations define where work happens and which roles are eligible for each opening.',
              },
              {
                icon: 'verified',
                title: 'Verified worker eligibility',
                body: 'Professionals complete document and bank-detail review with a platform admin before marketplace shifts appear.',
              },
              {
                icon: 'shifts',
                title: 'Shift publishing & acceptance',
                body: 'Publish role-specific openings. Eligible workers browse and accept shifts that match their activation status.',
              },
              {
                icon: 'timesheets',
                title: 'Timesheet review',
                body: 'Completed work flows through organization review — keeping records of what was scheduled and completed.',
              },
              {
                icon: 'payments',
                title: 'Separate payment paths',
                body: 'Organizations pay workers by bank transfer for approved wages. Workers settle a separate Bridge Hive platform commission invoice.',
              },
              {
                icon: 'activation',
                title: 'Account activation gates',
                body: 'Neither hospitals nor professionals get full access from a single signup click — review and invitation flows apply.',
              },
            ]}
          />
        </Section>

        <Section band="porcelain" className="m-hiw-band m-flow-band">
          <HomeHowItWorks />
        </Section>

        <Section band="white" className="m-flow-band">
          <TrustPanel />
        </Section>

        <Section band="porcelain" className="m-flow-band m-faq-band">
          <HomeFaq />
        </Section>

        <Section band="white" className="m-flow-band">
          <Reveal>
            <InquiryCta />
          </Reveal>
        </Section>
      </MarketingFlowShell>
    </>
  );
}
