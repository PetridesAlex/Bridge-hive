import Link from 'next/link';

import { InquiryCta } from '@/components/marketing/blocks';
import { ProfessionalsPaymentsSection } from '@/components/marketing/ProfessionalsPaymentsSection';
import { Reveal } from '@/components/marketing/Reveal';
import { MarketingButton, Section } from '@/components/marketing/Section';
import { WorkerJourneySection } from '@/components/marketing/WorkerJourneySection';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

export function ProfessionalsPage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  const pro = d.professionals;

  return (
    <>
      <Section band="dark" className="!pb-0">
        <Reveal>
          <p className="m-eyebrow">{pro.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            {pro.title}
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            {pro.lede}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingButton
              href={localizePath('/auth/worker/login', locale)}
              variant="on-dark"
            >
              {pro.primaryCta}
            </MarketingButton>
            <MarketingButton
              href={localizePath('/how-it-works', locale)}
              variant="on-dark-secondary"
            >
              {pro.secondaryCta}
            </MarketingButton>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[rgba(220,232,238,0.55)]">
            {pro.disclaimerPrefix}
            <Link
              href={localizePath('/contact#support', locale)}
              className="font-medium text-[var(--m-honey)] underline-offset-2 hover:underline"
            >
              {pro.disclaimerLinkText}
            </Link>
            {pro.disclaimerSuffix}
          </p>
        </Reveal>
      </Section>

      <WorkerJourneySection professionals={pro} />
      <ProfessionalsPaymentsSection professionals={pro} />

      <Section band="porcelain">
        <InquiryCta locale={locale} inquiry={d.home.inquiry} />
      </Section>
    </>
  );
}
