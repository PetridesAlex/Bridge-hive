import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingLogoIntro } from '@/components/marketing/MarketingLogoIntro';
import { MarketingNav } from '@/components/marketing/MarketingNav';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing flex min-h-screen flex-col">
      <MarketingLogoIntro />
      <MarketingNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
