import type { Metadata } from 'next';

import { MarketingButton, Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'How to reach Bridge Hive for organization inquiries. Contact submission endpoint is not configured on this website yet.',
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
          Organization inquiry
        </h1>
        <p className="mt-5 max-w-xl text-[var(--m-lede)] leading-relaxed text-bh-text-secondary">
          Existing organization administrators sign in with their provisioned
          account. New hospital partnerships are handled by Bridge Hive — not by
          open web registration.
        </p>
      </Section>

      <div className="marketing-rule" />

      <Section>
        <div className="max-w-xl rounded-2xl border border-bh-border bg-bh-surface p-8">
          <h2 className="text-xl font-semibold text-bh-sidebar">
            Submission endpoint not configured
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-bh-text-secondary">
            This website does not yet have a verified contact email address or form
            backend. We will not show a pretend success confirmation for inquiries.
          </p>
          <p className="mt-4 rounded-md bg-bh-honey-soft px-3 py-2 text-xs leading-relaxed text-bh-text">
            <strong>TODO:</strong> Configure a verified receiving address or form
            submission API, then replace this panel with a working inquiry flow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MarketingButton href="/sign-in">
              Organization sign in
            </MarketingButton>
            <MarketingButton href="/auth/worker/login" variant="secondary">
              Professionals — worker app
            </MarketingButton>
          </div>
        </div>

        <div className="mt-12 max-w-xl">
          <h2 className="text-lg font-semibold text-bh-sidebar">What to include</h2>
          <p className="mt-2 text-sm leading-relaxed text-bh-text-secondary">
            When a contact channel is available, organization inquiries should include
            organization name, country, approximate staffing needs (registered nurse
            and/or ward assistant), and a primary contact. Workers should use the
            worker app for account and verification questions — not this page as a
            substitute for app support.
          </p>
        </div>
      </Section>
    </>
  );
}
