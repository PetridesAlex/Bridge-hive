import {
  AudienceSplit,
  FeatureRow,
  InquiryCta,
  TrustPanel,
} from '@/components/marketing/blocks';
import { Hero } from '@/components/marketing/Hero';
import { HomeFaq } from '@/components/marketing/HomeFaq';
import { HomeHowItWorks } from '@/components/marketing/HomeHowItWorks';
import { MarketingFlowShell } from '@/components/marketing/MarketingFlowShell';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

export function HomePage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  const home = d.home;

  const capabilities = [
    {
      icon: 'locations' as const,
      title: home.capabilities.locationsTitle,
      body: home.capabilities.locationsBody,
    },
    {
      icon: 'verified' as const,
      title: home.capabilities.verifiedTitle,
      body: home.capabilities.verifiedBody,
    },
    {
      icon: 'shifts' as const,
      title: home.capabilities.shiftsTitle,
      body: home.capabilities.shiftsBody,
    },
    {
      icon: 'timesheets' as const,
      title: home.capabilities.timesheetsTitle,
      body: home.capabilities.timesheetsBody,
    },
    {
      icon: 'payments' as const,
      title: home.capabilities.paymentsTitle,
      body: home.capabilities.paymentsBody,
    },
    {
      icon: 'activation' as const,
      title: home.capabilities.activationTitle,
      body: home.capabilities.activationBody,
    },
  ];

  return (
    <>
      <Hero locale={locale} hero={home.hero} />

      <MarketingFlowShell>
        <Section band="porcelain" className="m-audience-band m-flow-band">
          <AudienceSplit locale={locale} audience={home.audience} />
        </Section>

        <Section band="white" className="m-flow-band">
          <SectionHeading
            eyebrow={home.capabilities.eyebrow}
            title={home.capabilities.title}
            lede={home.capabilities.lede}
          />
          <FeatureRow items={capabilities} />
        </Section>

        <Section band="porcelain" className="m-hiw-band m-flow-band">
          <HomeHowItWorks hiw={home.hiw} />
        </Section>

        <Section band="white" className="m-flow-band">
          <TrustPanel trust={home.trust} />
        </Section>

        <Section band="porcelain" className="m-flow-band m-faq-band">
          <HomeFaq locale={locale} faq={home.faq} />
        </Section>

        <Section band="white" className="m-flow-band">
          <Reveal>
            <InquiryCta locale={locale} inquiry={home.inquiry} />
          </Reveal>
        </Section>
      </MarketingFlowShell>
    </>
  );
}
