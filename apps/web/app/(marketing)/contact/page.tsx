import type { Metadata } from 'next';

import { ContactEmail } from '@/components/marketing/ContactEmail';
import { Reveal } from '@/components/marketing/Reveal';
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
      <Section band="dark" className="!pb-0">
        <Reveal>
          <p className="m-eyebrow">Contact</p>
          <h1 className="mt-3 max-w-2xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            Reach Bridge Hive
          </h1>
          <p className="m-lede mt-5 max-w-xl !text-[rgba(220,232,238,0.78)]">
            Choose the route that matches your need. Partnerships go to one inbox;
            account and product support go to another. Existing organization members
            still sign in with their provisioned account — contact is not a substitute
            for organization sign-in.
          </p>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <article
              id="partnerships"
              className="m-panel h-full"
              aria-labelledby="partnerships-heading"
            >
              <p className="m-eyebrow">Partnerships</p>
              <h2
                id="partnerships-heading"
                className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--m-navy)]"
              >
                Organization inquiries
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--m-muted)]">
                For hospitals and care organizations exploring Bridge Hive. Accounts are
                provisioned after review — there is no open hospital self-registration.
              </p>

              <ContactEmail
                address="info@bridgehive.app"
                mailtoSubject="Partnership inquiry"
                label="Email"
              />

              <h3 className="mt-8 text-sm font-bold text-[var(--m-navy)]">
                What to include
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[color:var(--m-muted)]">
                {[
                  'Organization name and country',
                  'Approximate staffing needs for registered nurses and/or ward assistants',
                  'Primary contact name, role, and preferred email',
                  'Locations or wards you intend to staff first',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--m-teal)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-[color:var(--m-muted)]">
                Do not email identity documents, IBANs, tax IDs, or medical records.
                Credential and bank-detail verification for professionals happens inside
                the Bridge Hive worker app after account creation.
              </p>
            </article>
          </Reveal>

          <Reveal delay={80}>
            <article
              id="support"
              className="m-panel h-full"
              aria-labelledby="support-heading"
            >
              <p className="m-eyebrow !text-[var(--m-honey-strong)]">Support</p>
              <h2
                id="support-heading"
                className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--m-navy)]"
              >
                Workers, organizations, and the platform
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--m-muted)]">
                For help with accounts, the worker app continuation flow, organization
                workspace access, or general product questions.
              </p>

              <ContactEmail
                address="support@bridgehive.app"
                mailtoSubject="Bridge Hive support"
                label="Email"
              />

              <h3 className="mt-8 text-sm font-bold text-[var(--m-navy)]">
                Quick guidance
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[color:var(--m-muted)]">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--m-honey)]" />
                  <span>
                    Professionals: use the{' '}
                    <a
                      href="/auth/worker/login"
                      className="font-medium text-[var(--m-teal-strong)] underline-offset-2 hover:underline"
                    >
                      worker app continuation
                    </a>{' '}
                    page after email confirmation. Document verification stays in the app.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--m-honey)]" />
                  <span>
                    Organization members with provisioned accounts:{' '}
                    <a
                      href="/sign-in"
                      className="font-medium text-[var(--m-teal-strong)] underline-offset-2 hover:underline"
                    >
                      organization sign in
                    </a>
                    .
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--m-honey)]" />
                  Keep support messages free of passwords, OTPs, and full bank details.
                </li>
              </ul>
            </article>
          </Reveal>
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
