import type { Metadata } from 'next';

import { Reveal } from '@/components/marketing/Reveal';
import {
  MarketingButton,
  Section,
  SectionHeading,
} from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Recruitment',
  description:
    'Healthcare recruitment connected to Bridge Hive — join the talent network or access the private organization recruitment portal.',
  alternates: { canonical: 'https://bridgehive.app/recruitment' },
};

export default function RecruitmentLandingPage() {
  return (
    <>
      <Section band="dark" className="!pb-10">
        <Reveal>
          <p className="m-eyebrow">Bridge Hive Recruitment</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            Healthcare recruitment, connected to the care teams that need it
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            Bridge Hive connects verified healthcare professionals with organizations
            through a private recruitment pathway — separate from, and complementary to,
            the shift marketplace. Submitting a profile does not guarantee employment or
            contact.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingButton href="/recruitment/apply" variant="on-dark">
              Join the talent network
            </MarketingButton>
            <MarketingButton
              href="/sign-in?next=/organisation/recruitment"
              variant="on-dark-secondary"
            >
              Organization portal sign in
            </MarketingButton>
          </div>
        </Reveal>
      </Section>

      <Section band="porcelain">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="rounded-[1.35rem] border border-[color:var(--m-line)] bg-white p-6 shadow-[0_12px_40px_rgba(11,32,50,0.06)] sm:p-8">
              <p className="m-eyebrow">For healthcare professionals</p>
              <h2 className="mt-3 text-[length:var(--m-title)] font-bold tracking-tight text-[color:var(--m-navy)]">
                Join the Bridge Hive talent network
              </h2>
              <p className="m-lede mt-3">
                Registered nurses, ward assistants, and physiotherapists can submit a
                structured talent profile with private document uploads. Platform review
                decides when a profile may be shared with enabled organizations.
              </p>
              <ul className="mt-5 space-y-2 text-sm leading-6 text-[color:var(--m-muted)]">
                <li>Mobile-first multi-step application</li>
                <li>Role-aware document checklist</li>
                <li>Private storage — never public document links</li>
              </ul>
              <div className="mt-7">
                <MarketingButton href="/recruitment/apply" variant="primary">
                  Start your application
                </MarketingButton>
              </div>
            </article>
          </Reveal>

          <Reveal>
            <article className="rounded-[1.35rem] border border-[color:var(--m-line)] bg-[color:var(--m-navy)] p-6 text-white shadow-[0_12px_40px_rgba(11,32,50,0.18)] sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--m-honey)]">
                For healthcare organizations
              </p>
              <h2 className="mt-3 text-[length:var(--m-title)] font-bold tracking-tight">
                Access the private recruitment portal
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-[rgba(220,232,238,0.78)]">
                Use your existing Bridge Hive organization account. Recruitment access is
                enabled by platform admin for active organizations — no second login.
              </p>
              <ul className="mt-5 space-y-2 text-sm leading-6 text-[rgba(220,232,238,0.65)]">
                <li>Same Auth user and membership</li>
                <li>Organization-specific shortlists and notes</li>
                <li>Authorized contact and document viewing only</li>
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <MarketingButton
                  href="/sign-in?next=/organisation/recruitment"
                  variant="on-dark"
                >
                  Sign in to portal
                </MarketingButton>
                <MarketingButton href="/contact#partnerships" variant="on-dark-secondary">
                  Partnership inquiry
                </MarketingButton>
              </div>
            </article>
          </Reveal>
        </div>
      </Section>

      <Section band="white">
        <SectionHeading
          eyebrow="How it works"
          title="Two services, one Bridge Hive account"
          lede="Recruitment sits alongside the shift marketplace. Candidate applications are reviewed by Bridge Hive before organizations can access available profiles."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Apply',
              body: 'Professionals submit a talent profile with consent and private documents.',
            },
            {
              step: '02',
              title: 'Review',
              body: 'Platform admins review submissions and set global availability.',
            },
            {
              step: '03',
              title: 'Engage',
              body: 'Enabled organizations shortlist and manage their own private pipeline.',
            },
          ].map((item) => (
            <Reveal key={item.step}>
              <div className="rounded-2xl border border-[color:var(--m-line)] bg-[color:var(--m-porcelain)] p-5">
                <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--m-honey)]">
                  {item.step}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--m-navy)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--m-muted)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
