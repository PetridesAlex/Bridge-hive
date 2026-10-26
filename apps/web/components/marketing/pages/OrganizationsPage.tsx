import { ArrowRight, Lock, Mail, Scale, ShieldOff, Workflow } from 'lucide-react';

import { InquiryCta } from '@/components/marketing/blocks';
import { OrgWorkspaceSection } from '@/components/marketing/OrgWorkspaceSection';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

export function OrganizationsPage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  const org = d.organizations;

  return (
    <>
      <section className="m-org-page-hero">
        <div className="m-org-page-hero-glow" aria-hidden="true" />
        <div className="m-section m-org-page-hero-content">
          <Reveal>
            <p className="m-eyebrow m-org-page-hero-eyebrow">{org.heroEyebrow}</p>
            <h1 className="mt-3 max-w-xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
              {org.heroTitle}
            </h1>
            <p className="m-lede mt-5 max-w-lg !text-[rgba(220,232,238,0.86)]">
              {org.heroLede}
            </p>
            <div className="m-org-page-hero-ctas">
              <MarketingButton
                href={localizePath('/contact#partnerships', locale)}
                variant="on-dark"
                className="m-org-page-hero-btn m-org-page-hero-btn--primary"
              >
                <Mail size={18} strokeWidth={2} aria-hidden="true" />
                {org.heroPrimaryCta}
                <ArrowRight
                  className="m-org-page-hero-btn-arrow"
                  size={18}
                  strokeWidth={2.15}
                  aria-hidden="true"
                />
              </MarketingButton>
              <MarketingButton
                href={localizePath('/sign-in', locale)}
                variant="on-dark-secondary"
                className="m-org-page-hero-btn m-org-page-hero-btn--secondary"
              >
                {org.heroSecondaryCta}
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
        <OrgWorkspaceSection organizations={org} />
      </Section>

      <Section band="white" className="m-org-boundary-band">
        <Reveal>
          <div className="m-org-boundary">
            <span className="m-org-boundary-orb m-org-boundary-orb--teal" aria-hidden="true" />
            <span className="m-org-boundary-orb m-org-boundary-orb--honey" aria-hidden="true" />
            <header className="m-org-boundary-head">
              <p className="m-org-boundary-eyebrow">{org.boundaryEyebrow}</p>
              <h2>{org.boundaryTitle}</h2>
            </header>
            <ul className="m-org-boundary-grid">
              <li>
                <span className="m-org-boundary-icon" aria-hidden="true">
                  <Workflow size={20} strokeWidth={1.9} />
                </span>
                <h3>{org.boundaryStructuredOpsTitle}</h3>
                <p>{org.boundaryStructuredOpsBody}</p>
              </li>
              <li>
                <span
                  className="m-org-boundary-icon m-org-boundary-icon--honey"
                  aria-hidden="true"
                >
                  <ShieldOff size={20} strokeWidth={1.9} />
                </span>
                <h3>{org.boundaryNoFillRateTitle}</h3>
                <p>{org.boundaryNoFillRateBody}</p>
              </li>
              <li>
                <span className="m-org-boundary-icon" aria-hidden="true">
                  <Scale size={20} strokeWidth={1.9} />
                </span>
                <h3>{org.boundaryClinicalStandardsTitle}</h3>
                <p>{org.boundaryClinicalStandardsBody}</p>
              </li>
              <li>
                <span
                  className="m-org-boundary-icon m-org-boundary-icon--honey"
                  aria-hidden="true"
                >
                  <Lock size={20} strokeWidth={1.9} />
                </span>
                <h3>{org.boundaryIsolatedAccountsTitle}</h3>
                <p>{org.boundaryIsolatedAccountsBody}</p>
              </li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <InquiryCta locale={locale} inquiry={d.home.inquiry} />
      </Section>
    </>
  );
}
