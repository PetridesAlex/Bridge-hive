import type { Metadata } from 'next';
import Image from 'next/image';
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
import { MarketingButton } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Bridge Hive for organization partnerships at info@bridgehive.app or platform support at support@bridgehive.app.',
  alternates: { canonical: 'https://bridgehive.app/contact' },
};

function GlassHex({
  className = '',
  id,
}: {
  className?: string;
  id: string;
}) {
  const fillId = `${id}-fill`;
  const strokeId = `${id}-stroke`;
  return (
    <svg
      className={`m-contact-hex ${className}`.trim()}
      viewBox="0 0 80 88"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M40 4 72 22v36L40 76 8 58V22L40 4Z"
        fill={`url(#${fillId})`}
        stroke={`url(#${strokeId})`}
        strokeWidth="1.5"
      />
      <defs>
        <linearGradient
          id={fillId}
          x1="8"
          y1="4"
          x2="72"
          y2="76"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity="0.72" />
          <stop offset="0.45" stopColor="#DCEEFF" stopOpacity="0.42" />
          <stop offset="1" stopColor="#FFE8A3" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient
          id={strokeId}
          x1="8"
          y1="4"
          x2="72"
          y2="76"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7CBCFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#E4B334" stopOpacity="0.65" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function HospitalMotif() {
  return (
    <div className="m-contact-motif m-contact-motif--hospital" aria-hidden="true">
      <GlassHex id="hex-hosp-back" className="m-contact-hex--back" />
      <span className="m-contact-motif-glow" />
      <svg className="m-contact-motif-art" viewBox="0 0 140 120" fill="none">
        <ellipse cx="70" cy="108" rx="42" ry="6" fill="#1A7EF0" opacity="0.14" />
        <rect x="18" y="50" width="24" height="46" rx="7" fill="#D9EBFF" />
        <rect x="98" y="50" width="24" height="46" rx="7" fill="#D9EBFF" />
        <rect x="36" y="32" width="68" height="64" rx="12" fill="url(#m-contact-hospital)" />
        <rect x="50" y="14" width="40" height="24" rx="7" fill="#C9E2FF" />
        <rect x="59" y="19" width="22" height="16" rx="4" fill="#1A7EF0" />
        <path d="M67 22.5h6v4h4v6h-4v4h-6v-4h-4v-6h4v-4Z" fill="#fff" />
        <rect x="46" y="50" width="12" height="10" rx="2.5" fill="#fff" />
        <rect x="64" y="50" width="12" height="10" rx="2.5" fill="#fff" />
        <rect x="82" y="50" width="12" height="10" rx="2.5" fill="#fff" />
        <rect x="62" y="70" width="16" height="26" rx="4" fill="#1A7EF0" />
        <defs>
          <linearGradient
            id="m-contact-hospital"
            x1="70"
            y1="32"
            x2="70"
            y2="96"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#F7FBFF" />
            <stop offset="1" stopColor="#D7E9FF" />
          </linearGradient>
        </defs>
      </svg>
      <GlassHex id="hex-hosp-front" className="m-contact-hex--front" />
    </div>
  );
}

function SupportMotif() {
  return (
    <div className="m-contact-motif m-contact-motif--support" aria-hidden="true">
      <GlassHex id="hex-sup-back" className="m-contact-hex--back" />
      <span className="m-contact-motif-glow m-contact-motif-glow--honey" />
      <svg className="m-contact-motif-art" viewBox="0 0 140 120" fill="none">
        <ellipse cx="70" cy="108" rx="40" ry="6" fill="#E4B334" opacity="0.18" />
        <ellipse cx="52" cy="48" rx="30" ry="24" fill="#FFF3C4" />
        <ellipse cx="90" cy="56" rx="28" ry="22" fill="#E8F2FF" />
        <circle cx="44" cy="44" r="3.2" fill="#C9920F" />
        <circle cx="54" cy="44" r="3.2" fill="#C9920F" />
        <circle cx="64" cy="44" r="3.2" fill="#C9920F" />
        <circle cx="82" cy="54" r="2.8" fill="#1A7EF0" />
        <circle cx="92" cy="54" r="2.8" fill="#1A7EF0" />
        <circle cx="102" cy="54" r="2.8" fill="#1A7EF0" />
        <path
          d="M40 66c6 8 16 12 26 10"
          stroke="#C9920F"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M78 70c7 7 16 10 26 7"
          stroke="#1A7EF0"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
      <GlassHex
        id="hex-sup-front"
        className="m-contact-hex--front m-contact-hex--honey"
      />
    </div>
  );
}

export default function ContactPage() {
  return (
    <section className="m-contact-page">
      <div className="m-contact-page-media" aria-hidden="true">
        <Image
          src="/marketing/contact-hero-bg.jpg"
          alt=""
          fill
          priority
          quality={92}
          sizes="100vw"
          className="m-contact-page-image"
        />
        <div className="m-contact-page-wash" />
      </div>

      <div className="m-section m-contact-hero-inner">
        <Reveal>
          <p className="m-eyebrow m-contact-hero-eyebrow">Get in touch</p>
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

      <div className="m-section m-contact-cards-inner">
        <div className="m-contact-grid">
          <Reveal>
            <article
              id="partnerships"
              className="m-contact-card m-contact-card--teal"
              aria-labelledby="partnerships-heading"
            >
              <span className="m-contact-card-sheen" aria-hidden="true" />
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
              <span className="m-contact-card-sheen" aria-hidden="true" />
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
      </div>
    </section>
  );
}
