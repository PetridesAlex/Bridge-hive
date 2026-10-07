import type { Metadata } from 'next';

import { AboutStructureSection } from '@/components/marketing/AboutStructureSection';
import { InquiryCta } from '@/components/marketing/blocks';
import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Bridge Hive’s mission: structured healthcare staffing between organizations and verified professionals.',
  alternates: { canonical: 'https://bridgehive.app/about' },
};

export default function AboutPage() {
  return (
    <>
      <Section band="teal" className="!pb-0">
        <Reveal>
          <p className="m-eyebrow">About Bridge Hive</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            Clarity between care organizations and professionals
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            Bridge Hive exists to make healthcare staffing workflows understandable:
            who is invited, who is verified, which role a shift needs, and how wage
            pay and platform commission stay separate.
          </p>
        </Reveal>
      </Section>

      <MarketingFlowShell>
        <AboutStructureSection />
        <Section band="white" className="m-flow-band">
          <InquiryCta />
        </Section>
      </MarketingFlowShell>
    </>
  );
}
