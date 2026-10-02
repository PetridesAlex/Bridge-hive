import type { Metadata } from 'next';

import {
  AudienceSplit,
  FaqAccordion,
  FeatureRow,
  InquiryCta,
  ProcessSteps,
  TrustPanel,
} from '@/components/marketing/blocks';
import { Hero } from '@/components/marketing/Hero';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Bridge Hive — Healthcare staffing platform',
  description:
    'Premium healthcare staffing platform connecting organizations with verified registered nurses and ward assistants.',
  alternates: { canonical: 'https://bridgehive.app/' },
};

export default function HomePage() {
  return (
    <>
      <Hero />

      <Section>
        <SectionHeading
          eyebrow="Two audiences, one platform"
          title="Built for hospitals and the professionals who staff them"
          lede="Bridge Hive keeps organization workflows and worker journeys distinct — so sign-in, verification, and payments stay clear."
        />
        <AudienceSplit />
      </Section>

      <div className="marketing-rule" />

      <Section>
        <SectionHeading
          eyebrow="What the platform actually does"
          title="Practical staffing operations — not vague marketplace hype"
        />
        <FeatureRow
          items={[
            {
              title: 'Locations, wards, and roles',
              body: 'Organizations define where work happens and which roles are eligible for each opening.',
            },
            {
              title: 'Verified worker eligibility',
              body: 'Professionals complete document and payout review with a platform admin before marketplace shifts appear.',
            },
            {
              title: 'Shift publishing & acceptance',
              body: 'Publish role-specific openings. Eligible workers browse and accept shifts that match their activation status.',
            },
            {
              title: 'Timesheet review',
              body: 'Completed work flows through organization review — keeping records of what was scheduled and completed.',
            },
            {
              title: 'Separate payment paths',
              body: 'Organizations pay workers by bank transfer. Workers settle a separate Bridge Hive platform commission invoice.',
            },
            {
              title: 'Account activation gates',
              body: 'Neither hospitals nor professionals get full access from a single signup click — review and invitation flows apply.',
            },
          ]}
        />
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-14 lg:grid-cols-2">
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
                body: 'Accept timesheets and keep operational visibility — without claiming guaranteed fill rates.',
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
                body: 'Upload role-specific documents and payout details. A platform admin reviews the package before activation.',
              },
              {
                label: 'Accept eligible shifts',
                body: 'After activation, browse and accept openings that match your role — then complete timesheets in the app.',
              },
            ]}
          />
        </div>
      </Section>

      <Section className="!pt-0">
        <TrustPanel />
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Common questions"
          title="Clear answers before you sign in"
        />
        <FaqAccordion
          items={[
            {
              q: 'Can my hospital create an account online?',
              a: 'Not via open self-registration. Organization accounts are provisioned by Bridge Hive. Existing admins use Organization sign in; new partners should send an inquiry.',
            },
            {
              q: 'Does confirming my email make me eligible for shifts?',
              a: 'No. Email confirmation proves the address works. Document and payout review by a platform admin is required before shifts become available.',
            },
            {
              q: 'Who pays my wages?',
              a: 'The healthcare organization pays you directly by bank transfer for approved work. Bridge Hive does not hold or disburse hospital wages. Workers receive a separate platform commission invoice from Bridge Hive.',
            },
            {
              q: 'Where do professionals download the app?',
              a: 'Use the worker continuation page for deep-link and install guidance. Public app-store listings are not published from this website yet.',
            },
          ]}
        />
      </Section>

      <Section className="!pt-0">
        <InquiryCta />
      </Section>
    </>
  );
}
