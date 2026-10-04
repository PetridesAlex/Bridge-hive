import type { Metadata } from 'next';

import { InquiryCta } from '@/components/marketing/blocks';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';

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

      <Section band="porcelain">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: 'Role honesty',
              body: 'We speak precisely about registered nurses and ward assistants — and about what platform review does and does not decide.',
            },
            {
              title: 'Operational structure',
              body: 'Locations, wards, shifts, timesheets, and invoices are modeled as real workflows with clear ownership on each side.',
            },
            {
              title: 'Separated responsibilities',
              body: 'Organizations pay workers for approved work. Workers settle Bridge Hive’s platform commission separately. Those paths are never blended.',
            },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 70}>
              <div className="m-panel h-full">
                <h2 className="text-lg font-extrabold text-[var(--m-navy)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--m-muted)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <MarketingButton href="/how-it-works">How it works</MarketingButton>
          <MarketingButton href="/contact#partnerships" variant="secondary">
            Partnership inquiry
          </MarketingButton>
        </div>
      </Section>

      <Section band="white">
        <InquiryCta />
      </Section>
    </>
  );
}
