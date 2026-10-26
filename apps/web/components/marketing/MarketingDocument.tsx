import { DM_Sans, Geist, Geist_Mono, Manrope } from 'next/font/google';
import Script from 'next/script';
import { Toaster } from 'sonner';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const marketingFont = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-marketing',
  display: 'swap',
  adjustFontFallback: false,
});

const marketingGreekFont = Manrope({
  subsets: ['greek', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-marketing-greek',
  display: 'swap',
});

type MarketingDocumentProps = {
  locale: MarketingLocale;
  dictionary: MarketingDictionary;
  children: React.ReactNode;
};

export function MarketingDocument({
  locale,
  dictionary,
  children,
}: MarketingDocumentProps) {
  const fontVars =
    locale === 'el'
      ? `${geistSans.variable} ${geistMono.variable} ${marketingFont.variable} ${marketingGreekFont.variable}`
      : `${geistSans.variable} ${geistMono.variable} ${marketingFont.variable}`;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontVars} min-h-screen bg-bh-canvas text-bh-text antialiased`}
      >
        <Script id="bh-m-intro-session" strategy="beforeInteractive">
          {`(function(){try{var p=location.pathname;if(/^\\/(org|admin|sign-in|sign-up|auth|dashboard|activate-organization-account|organization-invitations)\\b/.test(p))return;if(sessionStorage.getItem('bh:m-intro')==='1'){document.documentElement.setAttribute('data-m-intro','done');}}catch(e){}})();`}
        </Script>
        <MarketingShell locale={locale} dictionary={dictionary}>
          {children}
        </MarketingShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
