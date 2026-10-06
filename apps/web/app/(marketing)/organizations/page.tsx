import type { Metadata } from 'next';
import { ArrowRight, Lock, Mail, Scale, ShieldOff, Workflow } from 'lucide-react';

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

      <Section band="white" className="m-org-boundary-band">
        <Reveal>
          <div className="m-org-boundary">
            <span className="m-org-boundary-orb m-org-boundary-orb--teal" aria-hidden="true" />
            <span className="m-org-boundary-orb m-org-boundary-orb--honey" aria-hidden="true" />
            <header className="m-org-boundary-head">
              <p className="m-org-boundary-eyebrow">Built as workflow software</p>
              <h2>Operational control, with the limits stated up front</h2>
            </header>
            <ul className="m-org-boundary-grid">
              <li>
                <span className="m-org-boundary-icon" aria-hidden="true">
                  <Workflow size={20} strokeWidth={1.9} />
                </span>
                <h3>Structured operations</h3>
                <p>Publishing, eligibility, and timesheet review run as one workflow.</p>
              </li>
              <li>
                <span className="m-org-boundary-icon m-org-boundary-icon--honey" aria-hidden="true">
                  <ShieldOff size={20} strokeWidth={1.9} />
                </span>
                <h3>No fill-rate promise</h3>
                <p>A shift is not guaranteed to fill, and a specific professional may be unavailable.</p>
              </li>
              <li>
                <span className="m-org-boundary-icon" aria-hidden="true">
                  <Scale size={20} strokeWidth={1.9} />
                </span>
                <h3>Your clinical standards</h3>
                <p>Platform verification does not replace hiring standards or local employment policy.</p>
              </li>
              <li>
                <span className="m-org-boundary-icon m-org-boundary-icon--honey" aria-hidden="true">
                  <Lock size={20} strokeWidth={1.9} />
                </span>
                <h3>Isolated accounts</h3>
                <p>Organization data stays inside your account after approval.</p>
              </li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <InquiryCta />
      </Section>
    </>
  );
}
