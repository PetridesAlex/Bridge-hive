import type { Metadata } from 'next';
import { ArrowRight, Mail } from 'lucide-react';

import { InquiryCta } from '@/components/marketing/blocks';
import { OrgWorkspaceSection } from '@/components/marketing/OrgWorkspaceSection';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Organizations',
  description:
    'How healthcare organizations use Bridge Hive to publish role-specific shifts, review eligibility, and manage timesheets.',
  alternates: { canonical: 'https://bridgehive.app/organizations' },
};

export default function OrganizationsPage() {
  return (
    <>
      <section className="m-org-page-hero">
        <div className="m-org-page-hero-glow" aria-hidden="true" />
        <div className="m-section m-org-page-hero-content">
          <Reveal>
            <p className="m-eyebrow m-org-page-hero-eyebrow">
              For healthcare organizations
            </p>
            <h1 className="mt-3 max-w-xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
              Staffing requests with role and ward clarity
            </h1>
            <p className="m-lede mt-5 max-w-lg !text-[rgba(220,232,238,0.86)]">
              Bridge Hive helps hospitals and care organizations publish openings for
              registered nurses and ward assistants, limit visibility to verified
              professionals, and review completed timesheets — with operational
              structure rather than fill-rate guarantees.
            </p>
            <div className="m-org-page-hero-ctas">
              <MarketingButton
                href="/contact#partnerships"
                variant="on-dark"
                className="m-org-page-hero-btn m-org-page-hero-btn--primary"
              >
                <Mail size={18} strokeWidth={2} aria-hidden="true" />
                Partnership inquiry
                <ArrowRight
                  className="m-org-page-hero-btn-arrow"
                  size={18}
                  strokeWidth={2.15}
                  aria-hidden="true"
                />
              </MarketingButton>
              <MarketingButton
                href="/sign-in"
                variant="on-dark-secondary"
                className="m-org-page-hero-btn m-org-page-hero-btn--secondary"
              >
                Organization sign in
                <ArrowRight
                  className="m-org-page-hero-btn-arrow"
                  size={18}
                  strokeWidth={2.15}
                  aria-hidden="true"
                />
              </MarketingButton>
            </div>
          </Reveal>
        </div>
      </section>

      <Section band="porcelain" className="m-org-workspace-band">
        <OrgWorkspaceSection />
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
