import type { Metadata } from 'next';

import { InquiryCta } from '@/components/marketing/blocks';
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
      <Section className="!pb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
          About Bridge Hive
        </p>
        <h1 className="mt-3 max-w-3xl text-[var(--m-display)] font-semibold leading-[1.1] tracking-tight text-bh-sidebar">
          Clarity between care organizations and professionals
        </h1>
        <p className="mt-5 max-w-2xl text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          Bridge Hive exists to make healthcare staffing workflows understandable:
          who is invited, who is verified, which role a shift needs, and how
          payment responsibilities are separated.
        </p>
      </Section>

      <div className="marketing-rule" />

      <Section>
        <div className="grid gap-10 lg:grid-cols-3">
          {[
            {
              title: 'Role honesty',
              body: 'We speak precisely about registered nurses and ward assistants — and about what platform review does and does not decide.',
            },
            {
              title: 'Operational structure',
              body: 'Locations, wards, shifts, timesheets, and invoices are modeled as real workflows, not decorative marketplace language.',
            },
            {
              title: 'Separated responsibilities',
              body: 'Organizations pay workers. Workers settle Bridge Hive’s platform commission. We do not blur those paths.',
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-bh-border pt-5">
              <h2 className="text-lg font-semibold text-bh-sidebar">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-bh-text-secondary">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-12 max-w-2xl text-sm leading-relaxed text-bh-text-muted">
          This page does not invent founder biographies, accreditations, partner
          logos, or outcome statistics. When those materials are ready and reviewed,
          they can be published here with proper attribution.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <MarketingButton href="/how-it-works">How it works</MarketingButton>
          <MarketingButton href="/contact" variant="secondary">
            Contact
          </MarketingButton>
        </div>
      </Section>

      <Section className="!pt-0">
        <InquiryCta />
      </Section>
    </>
  );
}
