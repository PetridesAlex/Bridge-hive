import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { RecruitmentApplyForm } from '@/components/marketing/recruitment-apply-form';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

export function RecruitmentApplyPage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  const r = d.recruitmentApply;

  return (
    <MarketingFlowShell>
      <Section band="white" className="m-flow-band !pt-10">
        <Reveal>
          <Link
            href={localizePath('/recruitment', locale)}
            className="m-back"
            aria-label={r.backAria}
          >
            <span className="m-back-mark" aria-hidden="true">
              <ArrowLeft strokeWidth={2.25} />
            </span>
            <span className="m-back-label">{r.backToRecruitment}</span>
          </Link>
          <p className="m-eyebrow">{r.eyebrow}</p>
          <h1 className="mt-2 max-w-2xl text-[length:var(--m-title)] font-extrabold tracking-tight text-[color:var(--m-navy)]">
            {r.title}
          </h1>
          <p className="m-lede mt-3 max-w-2xl">{r.lede}</p>
        </Reveal>
        <div className="mt-8 max-w-2xl">
          <RecruitmentApplyForm locale={locale} recruitmentApply={r} />
        </div>
      </Section>
    </MarketingFlowShell>
  );
}
