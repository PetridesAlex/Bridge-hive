import { AboutStructureSection } from '@/components/marketing/AboutStructureSection';
import { InquiryCta } from '@/components/marketing/blocks';
import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

export function AboutPage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  const about = d.about;

  return (
    <>
      <Section band="teal" className="!pb-0">
        <Reveal>
          <p className="m-eyebrow">{about.heroEyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[length:var(--m-display)] font-extrabold tracking-tight text-white">
            {about.heroTitle}
          </h1>
          <p className="m-lede mt-5 max-w-2xl !text-[rgba(220,232,238,0.78)]">
            {about.heroLede}
          </p>
        </Reveal>
      </Section>

      <MarketingFlowShell>
        <AboutStructureSection locale={locale} about={about} />
        <Section band="white" className="m-flow-band">
          <InquiryCta locale={locale} inquiry={d.home.inquiry} />
        </Section>
      </MarketingFlowShell>
    </>
  );
}
