import type { Metadata } from 'next';
import Link from 'next/link';

import { RecruitmentApplyForm } from '@/components/marketing/recruitment-apply-form';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';

export const metadata: Metadata = {
  title: 'Apply | Recruitment',
  description:
    'Submit a Bridge Hive talent profile for healthcare recruitment. Does not guarantee employment or contact.',
  alternates: { canonical: 'https://bridgehive.app/recruitment/apply' },
  robots: { index: false, follow: false },
};

export default function RecruitmentApplyPage() {
  return (
    <Section band="porcelain" className="!pt-10">
      <Reveal>
        <p className="mb-4 text-sm text-[color:var(--m-muted)]">
          <Link
            href="/recruitment"
            className="font-medium text-[color:var(--m-navy)] underline-offset-2 hover:underline"
          >
            ← Recruitment
          </Link>
        </p>
        <p className="m-eyebrow">Talent network</p>
        <h1 className="mt-2 max-w-2xl text-[length:var(--m-title)] font-extrabold tracking-tight text-[color:var(--m-navy)]">
          Join the Bridge Hive talent network
        </h1>
        <p className="m-lede mt-3 max-w-2xl">
          Complete each step to submit your profile. Document uploads stay private.
          Submitting does not guarantee employment or contact.
        </p>
      </Reveal>
      <div className="mt-8 max-w-2xl">
        <RecruitmentApplyForm />
      </div>
    </Section>
  );
}
