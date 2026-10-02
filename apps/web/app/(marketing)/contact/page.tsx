import type { Metadata } from 'next';

import { MarketingButton, Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'How healthcare organizations prepare a partnership inquiry with Bridge Hive.',
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
          Partnership inquiry for organizations
        </h1>
        <p className="mt-5 max-w-xl text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          Bridge Hive provisions healthcare organization accounts after review.
          There is no open hospital self-registration. Use this page to prepare a
          partnership inquiry — it is not a substitute for organization sign-in.
        </p>
      </Section>

      <div className="marketing-rule" />

      <Section>
        <div className="marketing-panel max-w-2xl">
          <h2 className="text-xl font-semibold text-bh-sidebar">
            Preparing an organization inquiry
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
            New hospital and care-organization partners work with Bridge Hive
            directly. Include the details below so our team can respond with the
            right next step for your organization.
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed text-bh-text-secondary">
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
              Any locations or wards you intend to staff first
            </li>
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-bh-text-muted">
            A public inquiry mailbox for this website will be published here once it
            is confirmed. Until then, existing organization administrators should use
            organization sign-in; professionals should use the worker app continuation
            page for account guidance.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <MarketingButton href="/sign-in">
            Organization sign in
          </MarketingButton>
          <MarketingButton href="/auth/worker/login" variant="secondary">
            Worker app continuation
          </MarketingButton>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-bh-text-muted">
          Registered nurses and ward assistants: account, verification, and shift
          questions belong in the Bridge Hive worker app — not this organization
          inquiry page.
        </p>
      </Section>
    </>
  );
}
