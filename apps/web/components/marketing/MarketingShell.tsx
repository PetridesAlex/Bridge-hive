import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingLogoIntro } from '@/components/marketing/MarketingLogoIntro';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingStorageNotice } from '@/components/marketing/MarketingStorageNotice';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

type MarketingShellProps = {
  locale: MarketingLocale;
  dictionary: MarketingDictionary;
  children: React.ReactNode;
};

export function MarketingShell({
  locale,
  dictionary,
  children,
}: MarketingShellProps) {
  return (
    <div className="marketing flex min-h-screen flex-col">
      <MarketingLogoIntro />
      <MarketingNav locale={locale} dictionary={dictionary} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter locale={locale} dictionary={dictionary} />
      <MarketingStorageNotice
        storageNotice={dictionary.storageNotice}
        locale={locale}
      />
    </div>
  );
}
