import type { Metadata } from 'next';

import { ContactEmail } from '@/components/marketing/ContactEmail';
import { MarketingButton, Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Bridge Hive for organization partnerships at info@bridgehive.app or platform support at support@bridgehive.app.',
  alternates: { canonical: 'https://bridgehive.app/contact' },
};

export default function ContactPage() {
  return (
    <>
      <Section className="!pb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
          Contact
        </p>
        <h1 className="mt-3 max-w-2xl text-[var(--m-display)] font-semibold leading-[1.1] tracking-tight text-bh-sidebar">
          Reach Bridge Hive
        </h1>
        <p className="mt-5 max-w-xl text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          Choose the route that matches your need. Partnerships go to one inbox;
          account and product support go to another. Existing organization members
          still sign in with their provisioned account — contact is not a substitute
          for organization sign-in.
        </p>
      </Section>

      <div className="marketing-rule" />

      <Section className="!pt-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <article
            id="partnerships"
            className="marketing-panel scroll-mt-28"
            aria-labelledby="partnerships-heading"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-teal-strong">
              Partnerships
            </p>
            <h2
              id="partnerships-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-bh-sidebar"
            >
              Organization inquiries
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
              For hospitals and care organizations exploring Bridge Hive. Accounts are
              provisioned after review — there is no open hospital self-registration.
            </p>

            <ContactEmail
              address="info@bridgehive.app"
              mailtoSubject="Partnership inquiry"
              label="Email"
            />

            <h3 className="mt-8 text-sm font-semibold text-bh-sidebar">
              What to include
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-bh-text-secondary">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-teal-strong" />
                Organization name and country
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-teal-strong" />
                Approximate staffing needs for registered nurses and/or ward assistants
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-teal-strong" />
                Primary contact name, role, and preferred email
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-teal-strong" />
                Locations or wards you intend to staff first
              </li>
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-bh-text-muted">
              Do not email identity documents, IBANs, tax IDs, or medical records.
              Credential and bank-detail verification for professionals happens inside
              the Bridge Hive worker app after account creation.
            </p>
          </article>

          <article
            id="support"
            className="marketing-panel scroll-mt-28"
            aria-labelledby="support-heading"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-honey-strong">
              Support
            </p>
            <h2
              id="support-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-bh-sidebar"
            >
              Workers, organizations, and the platform
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
              For help with accounts, the worker app continuation flow, organization
              workspace access, or general product questions.
            </p>

            <ContactEmail
              address="support@bridgehive.app"
              mailtoSubject="Bridge Hive support"
              label="Email"
            />

            <h3 className="mt-8 text-sm font-semibold text-bh-sidebar">
              Quick guidance
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-bh-text-secondary">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-honey-strong" />
                <span>
                  Professionals: use the{' '}
                  <a
                    href="/auth/worker/login"
                    className="font-medium text-bh-teal-strong underline-offset-2 hover:underline"
                  >
                    worker app continuation
                  </a>{' '}
                  page after email confirmation. Document verification stays in the app.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-honey-strong" />
                <span>
                  Organization members with provisioned accounts:{' '}
                  <a
                    href="/sign-in"
                    className="font-medium text-bh-teal-strong underline-offset-2 hover:underline"
                  >
                    organization sign in
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bh-honey-strong" />
                Keep support messages free of passwords, OTPs, and full bank details.
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <MarketingButton href="/sign-in">Organization sign in</MarketingButton>
          <MarketingButton href="/auth/worker/login" variant="secondary">
            Worker app continuation
          </MarketingButton>
        </div>
      </Section>
    </>
  );
}
