import type { Metadata } from 'next';

import {
  AudienceSplit,
  DualJourneyVisual,
  FaqAccordion,
  FeatureRow,
  InquiryCta,
  ProcessSteps,
  TrustPanel,
} from '@/components/marketing/blocks';
import { Hero } from '@/components/marketing/Hero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Bridge Hive — Healthcare staffing platform',
  description:
    'Healthcare staffing platform connecting organizations with verified registered nurses and ward assistants.',
  alternates: { canonical: 'https://bridgehive.app/' },
};

export default function HomePage() {
  return (
    <>
      <Hero />

      <Section band="porcelain">
        <SectionHeading
          eyebrow="Two audiences, one platform"
          title="Built for hospitals and the professionals who staff them"
          lede="Bridge Hive keeps organization workflows and worker journeys distinct — so sign-in, verification, and payments stay clear."
        />
        <AudienceSplit />
      </Section>

      <div className="marketing-rule" />

      <Section band="white">
        <SectionHeading
          eyebrow="Platform capabilities"
          title="Staffing operations with role and ward clarity"
          lede="Every capability below maps to a real Bridge Hive workflow — not a fill-rate promise."
        />
        <FeatureRow
          items={[
            {
              icon: 'locations',
              title: 'Locations, wards, and roles',
              body: 'Organizations define where work happens and which roles are eligible for each opening.',
            },
            {
              icon: 'verified',
              title: 'Verified worker eligibility',
              body: 'Professionals complete document and bank-detail review with a platform admin before marketplace shifts appear.',
            },
            {
              icon: 'shifts',
              title: 'Shift publishing & acceptance',
              body: 'Publish role-specific openings. Eligible workers browse and accept shifts that match their activation status.',
            },
            {
              icon: 'timesheets',
              title: 'Timesheet review',
              body: 'Completed work flows through organization review — keeping records of what was scheduled and completed.',
            },
            {
              icon: 'payments',
              title: 'Separate payment paths',
              body: 'Organizations pay workers by bank transfer for approved wages. Workers settle a separate Bridge Hive platform commission invoice.',
            },
            {
              icon: 'activation',
              title: 'Account activation gates',
              body: 'Neither hospitals nor professionals get full access from a single signup click — review and invitation flows apply.',
            },
          ]}
        />
      </Section>

      <Section band="porcelain">
        <SectionHeading
          eyebrow="How it works"
          title="From opening to settlement"
          lede="A concise view of the shared operational loop — then the two detailed paths below."
        />
        <DualJourneyVisual />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <ProcessSteps
            title="For organizations"
            steps={[
              {
                label: 'Provisioned access',
                body: 'Bridge Hive creates organization accounts. Use the activation email or organization sign-in once invited — there is no open hospital self-registration.',
              },
              {
                label: 'Set up and publish',
                body: 'Configure locations and wards, then publish shifts for registered nurses or ward assistants after platform approval.',
              },
              {
                label: 'Review completed work',
                body: 'Accept timesheets and keep operational visibility across locations and wards.',
              },
            ]}
          />
          <ProcessSteps
            title="For professionals"
            steps={[
              {
                label: 'Create an account',
                body: 'Register in the Bridge Hive worker app and confirm your email. Confirmation is not the same as account verification.',
              },
              {
                label: 'Submit for review',
                body: 'Upload role-specific documents and bank details for wage payouts. A platform admin reviews the package before activation.',
              },
              {
                label: 'Accept eligible shifts',
                body: 'After activation, browse and accept openings that match your role — then complete timesheets in the app.',
              },
            ]}
          />
        </div>
      </Section>

      <Section band="white">
        <TrustPanel />
      </Section>

      <Section band="porcelain">
        <SectionHeading
          eyebrow="Common questions"
          title="Clear answers before you sign in"
        />
        <FaqAccordion
          items={[
            {
              q: 'Can my hospital create an account online?',
              a: (
                <>
                  Not via open self-registration. Organization accounts are provisioned
                  by Bridge Hive. Existing admins use Organization sign in; new partners
                  should{' '}
                  <a
                    href="/contact#partnerships"
                    className="font-medium text-[var(--m-teal-strong)] underline-offset-2 hover:underline"
                  >
                    prepare a partnership inquiry
                  </a>
                  .
                </>
              ),
            },
            {
              q: 'Does confirming my email make me eligible for shifts?',
              a: 'No. Email confirmation proves the address works. Document and bank-detail review by a platform admin is required before shifts become available.',
            },
            {
              q: 'Who pays my wages — and what about commission?',
              a: 'The healthcare organization pays approved wages by bank transfer. Bridge Hive does not hold or disburse hospital wages. Separately, workers settle a Bridge Hive platform commission invoice on its own schedule. Bank details support wage transfer; they are not used to collect commission.',
            },
            {
              q: 'What does “Worker app continuation” open?',
              a: (
                <>
                  A web page that helps you return to the Bridge Hive worker app after
                  email confirmation, including deep-link guidance. It is not a full
                  browser version of the app. For account help, contact{' '}
                  <a
                    href="/contact#support"
                    className="font-medium text-[var(--m-teal-strong)] underline-offset-2 hover:underline"
                  >
                    platform support
                  </a>
                  .
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section band="white">
        <Reveal>
          <InquiryCta />
        </Reveal>
      </Section>
    </>
  );
}
