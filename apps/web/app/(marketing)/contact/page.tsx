import type { Metadata } from 'next';
import {
  Building2,
  CheckCircle2,
  Headset,
  Info,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';

import { ContactEmail } from '@/components/marketing/ContactEmail';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Bridge Hive for organization partnerships at info@bridgehive.app or platform support at support@bridgehive.app.',
  alternates: { canonical: 'https://bridgehive.app/contact' },
};

function HospitalMotif() {
  return (
    <svg className="m-contact-motif" viewBox="0 0 120 96" fill="none" aria-hidden="true">
      <rect x="28" y="30" width="64" height="52" rx="10" fill="#E8F2FF" />
      <rect x="42" y="16" width="36" height="22" rx="6" fill="#D6E8FF" />
      <path
        d="M56 24h8v6h6v8h-6v6h-8v-6h-6v-8h6v-6Z"
        fill="#1A7EF0"
      />
      <rect x="40" y="44" width="12" height="12" rx="2.5" fill="#fff" />
      <rect x="54" y="44" width="12" height="12" rx="2.5" fill="#fff" />
      <rect x="68" y="44" width="12" height="12" rx="2.5" fill="#fff" />
      <rect x="52" y="62" width="16" height="20" rx="3" fill="#1A7EF0" opacity="0.8" />
      <ellipse cx="60" cy="88" rx="34" ry="4.5" fill="#1A7EF0" opacity="0.12" />
    </svg>
  );
}

function SupportMotif() {
  return (
    <svg className="m-contact-motif" viewBox="0 0 120 96" fill="none" aria-hidden="true">
      <ellipse cx="44" cy="42" rx="26" ry="20" fill="#FFF3C4" />
      <ellipse cx="76" cy="50" rx="24" ry="18" fill="#E8F2FF" />
      <circle cx="38" cy="40" r="2.5" fill="#C9920F" />
      <circle cx="46" cy="40" r="2.5" fill="#C9920F" />
      <circle cx="54" cy="40" r="2.5" fill="#C9920F" />
      <circle cx="70" cy="48" r="2.2" fill="#1A7EF0" />
      <circle cx="78" cy="48" r="2.2" fill="#1A7EF0" />
      <circle cx="86" cy="48" r="2.2" fill="#1A7EF0" />
      <ellipse cx="60" cy="88" rx="34" ry="4.5" fill="#E4B334" opacity="0.16" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <>
      <section className="m-contact-hero">
        <div className="m-contact-hero-glow" aria-hidden="true" />
        <div className="m-section m-contact-hero-inner">
          <Reveal>
            <p className="m-eyebrow">Get in touch</p>
            <h1 className="m-contact-hero-title">
              We’re here to <span className="m-contact-hero-accent">help.</span>
            </h1>
            <p className="m-lede m-contact-hero-lede">
              Whether you&apos;re a healthcare organization or a professional, our team
              is ready to support you. Partnerships and product support use separate
              inboxes — contact is not a substitute for organization sign-in.
            </p>
          </Reveal>
        </div>
      </section>

      <Section band="porcelain" className="m-contact-cards-band">
        <div className="m-contact-grid">
          <Reveal>
            <article
              id="partnerships"
              className="m-contact-card m-contact-card--teal"
              aria-labelledby="partnerships-heading"
            >
              <header className="m-contact-card-head">
                <div className="m-contact-card-head-copy">
                  <span className="m-contact-card-badge" aria-hidden="true">
                    <Building2 size={18} strokeWidth={1.9} />
                  </span>
                  <div>
                    <p className="m-contact-card-kicker">Partnerships</p>
                    <h2 id="partnerships-heading">Organization inquiries</h2>
                  </div>
                </div>
                <HospitalMotif />
              </header>

              <p className="m-contact-card-lede">
                For hospitals and care organizations exploring Bridge Hive. Accounts are
                provisioned after review — there is no open hospital self-registration.
              </p>

              <ContactEmail
                address="info@bridgehive.app"
                mailtoSubject="Partnership inquiry"
                label="Email"
                tone="teal"
              />

              <h3 className="m-contact-card-list-title">What to include</h3>
              <ul className="m-contact-checklist">
                {[
                  'Organization name and country',
                  'Approximate staffing needs for registered nurses and/or ward assistants',
                  'Primary contact name, role, and preferred email',
                  'Locations or wards you intend to staff first',
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="m-contact-note">
                <Info size={16} strokeWidth={2} aria-hidden="true" />
                <p>
                  Do not email identity documents, IBANs, tax IDs, or medical records.
                  Credential and bank-detail verification for professionals happens inside
                  the Bridge Hive worker app after account creation.
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal delay={80}>
            <article
              id="support"
              className="m-contact-card m-contact-card--honey"
              aria-labelledby="support-heading"
            >
              <header className="m-contact-card-head">
                <div className="m-contact-card-head-copy">
                  <span className="m-contact-card-badge" aria-hidden="true">
                    <Headset size={18} strokeWidth={1.9} />
                  </span>
                  <div>
                    <p className="m-contact-card-kicker">Support</p>
                    <h2 id="support-heading">Workers, organizations, and the platform</h2>
                  </div>
                </div>
                <SupportMotif />
              </header>

              <p className="m-contact-card-lede">
                For help with accounts, the worker app continuation flow, organization
                workspace access, or general product questions.
              </p>

              <ContactEmail
                address="support@bridgehive.app"
                mailtoSubject="Bridge Hive support"
                label="Email"
                tone="honey"
              />

              <h3 className="m-contact-card-list-title">Quick guidance</h3>
              <ul className="m-contact-checklist">
                <li>
                  <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                  <span>
                    Professionals: use the{' '}
                    <Link href="/auth/worker/login">worker app continuation</Link> page
                    after email confirmation. Document verification stays in the app.
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                  <span>
                    Organization members with provisioned accounts:{' '}
                    <Link href="/sign-in">organization sign in</Link>.
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                  <span>
                    Keep support messages free of passwords, OTPs, and full bank details.
                  </span>
                </li>
              </ul>

              <div className="m-contact-note">
                <Lightbulb size={16} strokeWidth={2} aria-hidden="true" />
                <p>
                  Existing organization members still sign in with their provisioned
                  account — contact is not a substitute for organization sign-in.
                </p>
              </div>
            </article>
          </Reveal>
        </div>

        <div className="m-contact-footer-ctas">
          <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
          <MarketingButton href="/auth/worker/login" variant="secondary">
            Worker app continuation
          </MarketingButton>
        </div>
      </Section>
    </>
  );
}
