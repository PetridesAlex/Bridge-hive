import { HowItWorksClient } from '@/components/marketing/HowItWorksClient';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

export function HowItWorksPage({ locale }: { locale: MarketingLocale }) {
  const d = getDictionary(locale);
  return (
    <HowItWorksClient
      locale={locale}
      howItWorks={d.howItWorks}
      inquiry={d.home.inquiry}
    />
  );
}
